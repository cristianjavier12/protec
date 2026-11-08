import { query, withTransaction } from '../config/db.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { technicianModel } from '../models/technicianModel.js'
import { REPAIR_STATUS, SPECIALTY_DEVICES } from '../utils/constants.js'
import { emitRepairUpdated, notify } from './notificationService.js'

/** ¿La especialidad del técnico cubre este tipo de dispositivo? */
export const specialtyCovers = (especialidad, deviceType) => (SPECIALTY_DEVICES[especialidad] ?? []).includes(deviceType)

/**
 * Asignación básica automática:
 *  1. Busca técnicos activos y disponibles.
 *  2. Filtra por especialidad compatible (prefiere especialistas sobre "general").
 *  3. Elige el de menor carga y mejor calificación.
 *  4. Asigna, cambia a "Técnico asignado", registra historial y notifica.
 * Si no hay técnico disponible, la solicitud permanece en "Pendiente de técnico".
 * Devuelve el técnico asignado o null.
 */
export async function assignTechnician(repairId) {
  const repair = await repairModel.findById(repairId)
  if (!repair || repair.estado !== REPAIR_STATUS.PENDING_TECH || repair.id_tecnico) return null

  const candidates = (await technicianModel.findAvailable()).filter((t) => specialtyCovers(t.especialidad, repair.dispositivo_tipo))
  if (!candidates.length) return null

  const specialists = candidates.filter((t) => t.especialidad !== 'general')
  const chosen = (specialists.length ? specialists : candidates)[0]

  const assigned = await withTransaction(async (conn) => {
    // Actualización condicional: evita asignaciones dobles por peticiones simultáneas.
    const result = await query(
      'UPDATE solicitudes SET id_tecnico = ?, estado = ? WHERE id_solicitud = ? AND estado = ? AND id_tecnico IS NULL',
      [chosen.id_usuario, REPAIR_STATUS.TECH_ASSIGNED, repairId, REPAIR_STATUS.PENDING_TECH],
      conn,
    )
    if (!result.affectedRows) return false
    await statusHistoryModel.add(
      repairId,
      REPAIR_STATUS.TECH_ASSIGNED,
      `Se asignó a ${chosen.nombre} ${chosen.apellidos}, especialista en ${labelSpecialty(chosen.especialidad)}.`,
      conn,
    )
    return true
  })
  if (!assigned) return null

  await notifyAssignment(repair, chosen)
  return chosen
}

export async function notifyAssignment(repair, tech) {
  await notify({
    userId: repair.id_usuario,
    repairId: repair.id_solicitud,
    folio: repair.folio,
    tipo: 'estado',
    email: true,
    titulo: 'Técnico asignado',
    mensaje: `${tech.nombre} ${tech.apellidos} atenderá tu solicitud ${repair.folio}. Ya puedes escribirle por chat.`,
  })
  await notify({
    userId: tech.id_usuario,
    repairId: repair.id_solicitud,
    folio: repair.folio,
    tipo: 'reparacion',
    email: true,
    titulo: 'Nueva solicitud asignada',
    mensaje: `Se te asignó la solicitud ${repair.folio} (${repair.dispositivo_marca} ${repair.dispositivo_modelo}).`,
  })
  emitRepairUpdated({ ...repair, id_tecnico: tech.id_usuario })
}

export const SPECIALTY_LABELS = {
  celulares: 'celulares',
  laptops: 'laptops',
  computadoras: 'computadoras',
  laptops_computadoras: 'laptops y computadoras',
  general: 'reparación general',
}

export const labelSpecialty = (key) => SPECIALTY_LABELS[key] ?? key

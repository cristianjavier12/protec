import { query, withTransaction } from '../config/db.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { technicianModel } from '../models/technicianModel.js'
import { REPAIR_STATUS, SPECIALTY_DEVICES } from '../utils/constants.js'
import { emitRepairUpdated, notify } from './notificationService.js'

/** ¿La especialidad del técnico cubre este tipo de dispositivo? */
export const specialtyCovers = (especialidad, deviceType) => (SPECIALTY_DEVICES[especialidad] ?? []).includes(deviceType)

/**
 * Asignación automática al técnico especializado:
 *  1. Busca técnicos activos (priorizando disponibles, menor carga y mejor calificación).
 *  2. Filtra por especialidad compatible (prefiere especialistas sobre "general").
 *  3. Asigna id_tecnico dejando el estado en "Pendiente de técnico" para que el técnico
 *     confirme o rechace el folio desde su panel.
 * Si no hay técnico compatible en ese momento, permanece sin id_tecnico y se asigna
 * automáticamente en cuanto un técnico compatible abra su panel.
 */
export async function assignTechnician(repairId, { excludeUserIds = [] } = {}) {
  const repair = await repairModel.findById(repairId)
  if (!repair || ![REPAIR_STATUS.PENDING_TECH, REPAIR_STATUS.REGISTERED].includes(repair.estado) || repair.id_tecnico) return null

  const candidates = (await technicianModel.findAvailable()).filter(
    (t) => specialtyCovers(t.especialidad, repair.dispositivo_tipo) && !excludeUserIds.includes(t.id_usuario),
  )
  if (!candidates.length) return null

  const specialists = candidates.filter((t) => t.especialidad !== 'general')
  const chosen = (specialists.length ? specialists : candidates)[0]

  const assigned = await withTransaction(async (conn) => {
    const result = await query(
      'UPDATE solicitudes SET id_tecnico = ?, estado = ?, requiere_tecnico = 1 WHERE id_solicitud = ? AND estado IN (?, ?) AND id_tecnico IS NULL',
      [chosen.id_usuario, REPAIR_STATUS.PENDING_TECH, repairId, REPAIR_STATUS.PENDING_TECH, REPAIR_STATUS.REGISTERED],
      conn,
    )
    if (!result.affectedRows) return false
    await statusHistoryModel.add(
      repairId,
      REPAIR_STATUS.PENDING_TECH,
      `Folio enviado automáticamente a ${chosen.nombre} ${chosen.apellidos}, especialista en ${labelSpecialty(chosen.especialidad)}. En espera de confirmación del técnico.`,
      conn,
    )
    return true
  })
  if (!assigned) return null

  await notifyPendingConfirmation(repair, chosen)
  return chosen
}

/**
 * Si existen folios sin técnico en "Pendiente de técnico" o "Solicitud registrada"
 * cuyo tipo de dispositivo coincide con la especialidad del técnico, los vincula
 * automáticamente para que le aparezcan en su panel y pueda confirmarlos o rechazarlos.
 */
export async function claimPendingForTechnician(techUserId, especialidad = 'general') {
  const allowedDevices = SPECIALTY_DEVICES[especialidad] ?? SPECIALTY_DEVICES.general
  if (!allowedDevices.length) return
  const placeholders = allowedDevices.map(() => '?').join(', ')
  const rows = await query(
    `SELECT s.id_solicitud
       FROM solicitudes s
       JOIN dispositivos d ON d.id_dispositivo = s.id_dispositivo
      WHERE s.id_tecnico IS NULL
        AND s.estado IN (?, ?)
        AND d.tipo IN (${placeholders})
      ORDER BY s.fecha_creacion ASC
      LIMIT 25`,
    [REPAIR_STATUS.PENDING_TECH, REPAIR_STATUS.REGISTERED, ...allowedDevices],
  )
  for (const r of rows) {
    try {
      await assignTechnician(r.id_solicitud)
    } catch (err) {
      console.error('[assignment] Error al reclamar folio pendiente:', err.message)
    }
  }
}

export async function notifyPendingConfirmation(repair, tech) {
  await notify({
    userId: repair.id_usuario,
    repairId: repair.id_solicitud,
    folio: repair.folio,
    tipo: 'estado',
    email: true,
    titulo: 'Folio enviado a especialista',
    mensaje: `Tu solicitud ${repair.folio} fue enviada automáticamente a ${tech.nombre} ${tech.apellidos}, quien confirmará tu folio en breve.`,
  })
  await notify({
    userId: tech.id_usuario,
    repairId: repair.id_solicitud,
    folio: repair.folio,
    tipo: 'reparacion',
    email: true,
    titulo: 'Nuevo folio pendiente de confirmar',
    mensaje: `El cliente abrió el folio ${repair.folio} (${repair.dispositivo_marca} ${repair.dispositivo_modelo}). Confirma o rechaza el folio desde tu panel.`,
  })
  emitRepairUpdated({ ...repair, id_tecnico: tech.id_usuario, estado: REPAIR_STATUS.PENDING_TECH })
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

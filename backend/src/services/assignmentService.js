import { query, withTransaction } from '../config/db.js'
import { repairModel } from '../models/repairModel.js'
import { technicianModel } from '../models/technicianModel.js'
import { REPAIR_STATUS, SPECIALTY_DEVICES } from '../utils/constants.js'
import { emitRepairUpdated, emitToUsers, notify } from './notificationService.js'

/** ¿La especialidad del técnico cubre este tipo de dispositivo? */
export const specialtyCovers = (especialidad, deviceType) => (SPECIALTY_DEVICES[especialidad] ?? []).includes(deviceType)

/**
 * Cuando un cliente abre un folio (o escala desde diagnóstico), NO se asigna automáticamente
 * a un único técnico: permanece sin `id_tecnico` en estado "Pendiente de técnico" para que
 * les aparezca a todos los técnicos de esa especialización y el primero que confirme se quede
 * con el folio (o pueda rechazarlo).
 */
export async function assignTechnician(repairId, { excludeUserIds = [] } = {}) {
  const repair = await repairModel.findById(repairId)
  if (!repair || ![REPAIR_STATUS.PENDING_TECH, REPAIR_STATUS.REGISTERED].includes(repair.estado) || repair.id_tecnico) return null

  if (repair.estado !== REPAIR_STATUS.PENDING_TECH) {
    await withTransaction(async (conn) => {
      await query(
        'UPDATE solicitudes SET estado = ?, requiere_tecnico = 1 WHERE id_solicitud = ? AND id_tecnico IS NULL',
        [REPAIR_STATUS.PENDING_TECH, repairId],
        conn,
      )
    })
  }

  const candidates = (await technicianModel.findAvailable()).filter(
    (t) => specialtyCovers(t.especialidad, repair.dispositivo_tipo) && !excludeUserIds.includes(t.id_usuario),
  )

  await notify({
    userId: repair.id_usuario,
    repairId: repair.id_solicitud,
    folio: repair.folio,
    tipo: 'estado',
    email: true,
    titulo: 'Folio enviado a especialistas',
    mensaje: `Tu solicitud ${repair.folio} está disponible para los técnicos especialistas del área. Te notificaremos en cuanto un especialista confirme tu folio.`,
  })

  for (const tech of candidates) {
    await notify({
      userId: tech.id_usuario,
      repairId: repair.id_solicitud,
      folio: repair.folio,
      tipo: 'reparacion',
      email: true,
      titulo: 'Nuevo folio disponible en tu especialidad',
      mensaje: `El cliente abrió el folio ${repair.folio} (${repair.dispositivo_marca} ${repair.dispositivo_modelo}). Confirma para quedarte con el folio o recházalo desde tu panel.`,
    })
  }

  emitToUsers(
    [repair.id_usuario, ...candidates.map((t) => t.id_usuario)],
    'repair:updated',
    { folio: repair.folio, repairId: repair.id_solicitud, estado: REPAIR_STATUS.PENDING_TECH },
  )

  return candidates
}

/**
 * Se mantiene por compatibilidad: los folios pendientes sin técnico ya no se auto-asignan
 * al abrir el panel, sino que aparecen directamente a todos los técnicos de la especialidad
 * hasta que uno confirme para quedarse con el folio o lo rechace.
 */
export async function claimPendingForTechnician() {
  return
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

import { env } from '../config/env.js'
import { notificationModel } from '../models/notificationModel.js'
import { userModel } from '../models/userModel.js'
import { mailService } from './mailService.js'

/**
 * Notificaciones persistentes (MySQL) + entrega en tiempo real (Socket.IO).
 * El servidor Socket.IO se inyecta desde server.js con setIO().
 */
let ioInstance = null

export function setIO(io) {
  ioInstance = io
}

export function getIO() {
  return ioInstance
}

/** Emite un evento a la sala personal de uno o varios usuarios. */
export function emitToUsers(userIds, event, payload) {
  if (!ioInstance) return
  for (const id of new Set(userIds.filter(Boolean))) ioInstance.to(`user:${id}`).emit(event, payload)
}

/**
 * Crea una notificación y la envía en tiempo real.
 * Con `email: true` también se avisa por correo (momentos clave de la reparación).
 * Nunca lanza error: una falla al notificar no debe revertir la operación principal.
 */
export async function notify({ userId, repairId = null, folio = null, tipo = 'sistema', titulo, mensaje, email = false }) {
  if (!userId) return null
  try {
    const id = await notificationModel.create({ userId, repairId, tipo, titulo, mensaje })
    const unreadCount = await notificationModel.countUnread(userId)
    emitToUsers([userId], 'notification:new', {
      id,
      tipo,
      titulo,
      mensaje,
      repairId,
      folio,
      leida: false,
      fecha: new Date().toISOString(),
      unreadCount,
    })
    if (email) sendEmailCopy(userId, { titulo, mensaje, folio }).catch(() => {})
    return id
  } catch (error) {
    console.error('[notify] No se pudo crear la notificación:', error.code ?? error.message)
    return null
  }
}

async function sendEmailCopy(userId, { titulo, mensaje, folio }) {
  const user = await userModel.findById(userId)
  if (!user?.estado) return
  const path = user.rol === 'tecnico' && folio ? `/tecnico/reparacion/${folio}` : folio ? `/reparacion/${folio}` : '/notificaciones'
  await mailService.sendRepairUpdate({ to: user.correo, nombre: user.nombre, titulo, mensaje, url: `${env.frontendUrl}${path}` })
}

/** Avisa a los participantes que la solicitud cambió (para refrescar la vista sin recargar). */
export function emitRepairUpdated(repair, extra = {}) {
  if (!repair) return
  emitToUsers([repair.id_usuario, repair.id_tecnico], 'repair:updated', {
    folio: repair.folio,
    repairId: repair.id_solicitud,
    ...extra,
  })
}

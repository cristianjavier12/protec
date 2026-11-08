import { chatModel } from '../models/chatModel.js'
import { AppError } from '../utils/AppError.js'
import { serializeMessage } from '../utils/serializers.js'
import { getIO, notify } from './notificationService.js'
import { findAuthorizedRepair } from './repairService.js'

/**
 * Chat usuario-técnico. Solo acceden: propietario, técnico asignado y administrador
 * (findAuthorizedRepair lo valida en el backend; cambiar la URL no da acceso).
 */
export const MAX_MESSAGE_LENGTH = 1000
export const roomOf = (folio) => `repair:${folio}`

/** ¿El usuario tiene la conversación abierta ahora mismo? (evita notificaciones redundantes) */
async function isViewing(folio, userId) {
  const io = getIO()
  if (!io) return false
  const sockets = await io.in(roomOf(folio)).fetchSockets()
  return sockets.some((s) => s.data.user?.id === userId)
}

export async function getMessages(user, folio) {
  const row = await findAuthorizedRepair(folio, user)
  const conv = await chatModel.getOrCreate(row.id_solicitud)
  const mensajes = await chatModel.listMessages(conv.id_conversacion)
  return {
    folio: row.folio,
    habilitado: Boolean(row.id_tecnico),
    participantes: { usuarioId: row.id_usuario, tecnicoId: row.id_tecnico },
    mensajes: mensajes.map(serializeMessage),
  }
}

export async function postMessage(user, folio, rawText) {
  const row = await findAuthorizedRepair(folio, user)
  if (!row.id_tecnico) throw AppError.conflict('El chat se habilita cuando se asigna un técnico.')
  const mensaje = typeof rawText === 'string' ? rawText.trim() : ''
  if (!mensaje) throw AppError.validation({ mensaje: 'Escribe un mensaje.' })
  if (mensaje.length > MAX_MESSAGE_LENGTH) throw AppError.validation({ mensaje: `Máximo ${MAX_MESSAGE_LENGTH} caracteres.` })

  const conv = await chatModel.getOrCreate(row.id_solicitud)
  const id = await chatModel.addMessage(conv.id_conversacion, user.id, mensaje)
  const message = serializeMessage(await chatModel.findMessage(id))

  getIO()?.to(roomOf(row.folio)).emit('chat:message', { folio: row.folio, message })

  const recipients = [row.id_usuario, row.id_tecnico].filter((id2) => id2 && id2 !== user.id)
  const preview = mensaje.length > 80 ? `${mensaje.slice(0, 80)}…` : mensaje
  for (const recipientId of recipients) {
    if (await isViewing(row.folio, recipientId)) continue
    await notify({
      userId: recipientId,
      repairId: row.id_solicitud,
      folio: row.folio,
      tipo: 'mensaje',
      titulo: user.rol === 'tecnico' ? 'Tu técnico envió un mensaje' : `Nuevo mensaje de ${user.nombre}`,
      mensaje: `${row.folio}: "${preview}"`,
    })
  }
  return message
}

export async function markRead(user, folio) {
  const row = await findAuthorizedRepair(folio, user)
  const conv = await chatModel.getOrCreate(row.id_solicitud)
  const updated = await chatModel.markRead(conv.id_conversacion, user.id)
  if (updated) getIO()?.to(roomOf(row.folio)).emit('chat:read', { folio: row.folio, readerId: user.id })
  return { updated }
}

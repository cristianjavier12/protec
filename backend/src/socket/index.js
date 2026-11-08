import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { userModel } from '../models/userModel.js'
import * as chat from '../services/chatService.js'
import { findAuthorizedRepair } from '../services/repairService.js'
import { isTokenCurrent, verifySessionToken } from '../utils/tokens.js'

/**
 * Socket.IO sobre el mismo servidor HTTP.
 *  - Autenticación con el mismo JWT de la API (se valida contra la BD).
 *  - Sala personal `user:<id>` para notificaciones en tiempo real.
 *  - Sala `repair:<folio>` para el chat; el acceso se autoriza en el backend.
 */
export function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 16 * 1024,
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('unauthorized'))
      const payload = verifySessionToken(token)
      const user = await userModel.findById(Number(payload.sub))
      if (!user || !user.estado || !isTokenCurrent(payload, user)) return next(new Error('unauthorized'))
      socket.data.user = { id: user.id_usuario, rol: user.rol, nombre: user.nombre, apellidos: user.apellidos }
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    socket.join(`user:${user.id}`)

    const safeAck = (ack) => (typeof ack === 'function' ? ack : () => {})
    const fail = (ack, error) => safeAck(ack)({ ok: false, message: error?.expose ? error.message : 'No fue posible completar la acción.' })

    socket.on('chat:join', async (payload, ack) => {
      try {
        const row = await findAuthorizedRepair(payload?.folio, user)
        const room = chat.roomOf(row.folio)
        await socket.join(room)
        const sockets = await io.in(room).fetchSockets()
        const online = [...new Set(sockets.map((s) => s.data.user?.id).filter(Boolean))]
        socket.to(room).emit('chat:presence', { folio: row.folio, userId: user.id, online: true })
        safeAck(ack)({ ok: true, folio: row.folio, online })
      } catch (error) {
        fail(ack, error)
      }
    })

    socket.on('chat:leave', (payload) => {
      if (typeof payload?.folio !== 'string') return
      const room = chat.roomOf(payload.folio)
      if (!socket.rooms.has(room)) return
      socket.leave(room)
      socket.to(room).emit('chat:presence', { folio: payload.folio, userId: user.id, online: false })
    })

    socket.on('chat:message', async (payload, ack) => {
      try {
        const message = await chat.postMessage(user, payload?.folio, payload?.mensaje)
        safeAck(ack)({ ok: true, message })
      } catch (error) {
        fail(ack, error)
      }
    })

    socket.on('chat:typing', (payload) => {
      if (typeof payload?.folio !== 'string') return
      const room = chat.roomOf(payload.folio)
      if (!socket.rooms.has(room)) return // solo quien ya fue autorizado en la sala
      socket.to(room).emit('chat:typing', { folio: payload.folio, userId: user.id, nombre: user.nombre, typing: Boolean(payload.typing) })
    })

    socket.on('chat:read', async (payload) => {
      try {
        await chat.markRead(user, payload?.folio)
      } catch {
        /* sin permiso o folio inválido: se ignora */
      }
    })

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('repair:')) {
          socket.to(room).emit('chat:presence', { folio: room.slice(7), userId: user.id, online: false })
        }
      }
    })
  })

  return io
}

import { query, queryOne } from '../config/db.js'

/** Acceso a `conversaciones` y `mensajes` (chat usuario-técnico). */
export const chatModel = {
  async getOrCreate(repairId, conn) {
    await query('INSERT IGNORE INTO conversaciones (id_solicitud) VALUES (?)', [repairId], conn)
    return queryOne('SELECT * FROM conversaciones WHERE id_solicitud = ?', [repairId], conn)
  },

  async addMessage(conversationId, senderId, message, conn) {
    const result = await query(
      'INSERT INTO mensajes (id_conversacion, id_remitente, mensaje) VALUES (?, ?, ?)',
      [conversationId, senderId, message],
      conn,
    )
    return result.insertId
  },

  findMessage(id, conn) {
    return queryOne(
      `SELECT m.*, u.nombre, u.apellidos, u.rol FROM mensajes m
         LEFT JOIN usuarios u ON u.id_usuario = m.id_remitente WHERE m.id_mensaje = ?`,
      [id],
      conn,
    )
  },

  /** Últimos `limit` mensajes en orden cronológico. */
  async listMessages(conversationId, { limit = 200 } = {}, conn) {
    const rows = await query(
      `SELECT m.*, u.nombre, u.apellidos, u.rol
         FROM mensajes m
         LEFT JOIN usuarios u ON u.id_usuario = m.id_remitente
        WHERE m.id_conversacion = ?
        ORDER BY m.fecha_envio DESC, m.id_mensaje DESC
        LIMIT ?`,
      [conversationId, Number(limit)],
      conn,
    )
    return rows.reverse()
  },

  /** Marca como leídos los mensajes que NO envió este usuario. */
  async markRead(conversationId, userId, conn) {
    const result = await query(
      'UPDATE mensajes SET leido = 1 WHERE id_conversacion = ? AND id_remitente <> ? AND leido = 0',
      [conversationId, userId],
      conn,
    )
    return result.affectedRows
  },
}

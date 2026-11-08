import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `notificaciones`. */
export const notificationModel = {
  async create(data, conn) {
    const result = await query(
      'INSERT INTO notificaciones (id_usuario, id_solicitud, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)',
      [data.userId, data.repairId || null, data.tipo || 'sistema', data.titulo, String(data.mensaje).slice(0, 500)],
      conn,
    )
    return result.insertId
  },

  /** filter: '' | 'unread' | 'repairs' | 'messages' */
  listByUser(userId, { filter, limit = 50, offset = 0 } = {}, conn) {
    let where = 'WHERE n.id_usuario = ?'
    if (filter === 'unread') where += ' AND n.leida = 0'
    else if (filter === 'repairs') where += " AND n.tipo IN ('estado','reparacion','presupuesto','pago','logistica')"
    else if (filter === 'messages') where += " AND n.tipo = 'mensaje'"
    return query(
      `SELECT n.*, s.folio
         FROM notificaciones n
         LEFT JOIN solicitudes s ON s.id_solicitud = n.id_solicitud
        ${where}
        ORDER BY n.fecha DESC, n.id_notificacion DESC
        LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)],
      conn,
    )
  },

  async countUnread(userId, conn) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = ? AND leida = 0', [userId], conn)
    return Number(row?.total ?? 0)
  },

  async markRead(id, userId, conn) {
    await query('UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?', [id, userId], conn)
  },

  async markAllRead(userId, conn) {
    await query('UPDATE notificaciones SET leida = 1 WHERE id_usuario = ? AND leida = 0', [userId], conn)
  },
}

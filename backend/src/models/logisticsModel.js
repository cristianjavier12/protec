import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `logistica` (recolección y entrega, sin GPS). */
export const logisticsModel = {
  async create(data, conn) {
    const result = await query(
      `INSERT INTO logistica (id_solicitud, tipo, direccion, referencias, horario, fecha_programada, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.idSolicitud, data.tipo, data.direccion, data.referencias || null, data.horario || null,
        data.fechaProgramada || null, data.estado || 'Pendiente', data.observaciones || null,
      ],
      conn,
    )
    return result.insertId
  },

  findById(id, conn) {
    return queryOne('SELECT * FROM logistica WHERE id_logistica = ?', [id], conn)
  },

  listByRepair(repairId, conn) {
    return query('SELECT * FROM logistica WHERE id_solicitud = ? ORDER BY id_logistica ASC', [repairId], conn)
  },

  findActive(repairId, tipo, conn) {
    return queryOne(
      "SELECT * FROM logistica WHERE id_solicitud = ? AND tipo = ? AND estado NOT IN ('Cancelada') ORDER BY id_logistica DESC LIMIT 1",
      [repairId, tipo],
      conn,
    )
  },

  async updateStatus(id, estado, { completed = false } = {}, conn) {
    await query(
      `UPDATE logistica SET estado = ?, fecha_real = ${completed ? 'NOW()' : 'fecha_real'} WHERE id_logistica = ?`,
      [estado, id],
      conn,
    )
  },
}

import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `calificaciones`. */
export const ratingModel = {
  async create(data, conn) {
    const result = await query(
      'INSERT INTO calificaciones (id_solicitud, id_usuario, id_tecnico, puntuacion, comentario) VALUES (?, ?, ?, ?, ?)',
      [data.idSolicitud, data.userId, data.technicianId, data.puntuacion, data.comentario || null],
      conn,
    )
    return result.insertId
  },

  findByRepair(repairId, conn) {
    return queryOne('SELECT * FROM calificaciones WHERE id_solicitud = ?', [repairId], conn)
  },
}

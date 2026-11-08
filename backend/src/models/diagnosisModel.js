import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `diagnosticos` (tipo: chatbot | tecnico). */
export const diagnosisModel = {
  async create(repairId, { tipo, resultado, detalle }, conn) {
    const result = await query(
      'INSERT INTO diagnosticos (id_solicitud, tipo, resultado, detalle) VALUES (?, ?, ?, ?)',
      [repairId, tipo, resultado, detalle ? JSON.stringify(detalle) : null],
      conn,
    )
    return result.insertId
  },

  findLatest(repairId, tipo = 'chatbot', conn) {
    return queryOne(
      `SELECT id_diagnostico, tipo, resultado, detalle, fecha_diagnostico
         FROM diagnosticos WHERE id_solicitud = ? AND tipo = ?
         ORDER BY fecha_diagnostico DESC, id_diagnostico DESC LIMIT 1`,
      [repairId, tipo],
      conn,
    )
  },

  async updateDetail(id, detalle, conn) {
    await query('UPDATE diagnosticos SET detalle = ? WHERE id_diagnostico = ?', [JSON.stringify(detalle), id], conn)
  },
}

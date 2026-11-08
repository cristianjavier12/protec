import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `presupuestos`. */
export const budgetModel = {
  async create(data, conn) {
    const result = await query(
      `INSERT INTO presupuestos (id_solicitud, diagnostico, mano_obra, costo_piezas, costo_total, anticipo_requerido, tiempo_estimado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.idSolicitud, data.diagnostico, data.manoObra, data.costoPiezas, data.costoTotal, data.anticipoRequerido, data.tiempoEstimado || null],
      conn,
    )
    return result.insertId
  },

  /** Presupuesto más reciente de la solicitud. */
  findByRepair(repairId, conn) {
    return queryOne('SELECT * FROM presupuestos WHERE id_solicitud = ? ORDER BY id_presupuesto DESC LIMIT 1', [repairId], conn)
  },

  async updateStatus(id, estado, conn) {
    await query('UPDATE presupuestos SET estado = ? WHERE id_presupuesto = ?', [estado, id], conn)
  },
}

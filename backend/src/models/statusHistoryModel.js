import { query } from '../config/db.js'

/** Acceso a `historial_estados`: línea de tiempo de cada solicitud. */
export const statusHistoryModel = {
  async add(repairId, estado, descripcion = null, conn) {
    await query('INSERT INTO historial_estados (id_solicitud, estado, descripcion) VALUES (?, ?, ?)', [
      repairId,
      estado,
      descripcion,
    ], conn)
  },

  listByRepair(repairId, conn) {
    return query(
      `SELECT id_historial, estado, descripcion, fecha
         FROM historial_estados WHERE id_solicitud = ? ORDER BY fecha ASC, id_historial ASC`,
      [repairId],
      conn,
    )
  },
}

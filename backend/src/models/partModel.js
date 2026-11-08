import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `piezas` (trazabilidad interna de PROTEC). */
export const partModel = {
  async create(data, conn) {
    const result = await query(
      `INSERT INTO piezas (id_solicitud, nombre, marca, numero_serie, codigo_qr, costo, tipo, verificada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.idSolicitud, data.nombre, data.marca || null, data.numeroSerie || null, data.codigoQr || null,
        Number(data.costo) || 0, data.tipo || 'original', data.verificada === false ? 0 : 1,
      ],
      conn,
    )
    return result.insertId
  },

  listByRepair(repairId, conn) {
    return query('SELECT * FROM piezas WHERE id_solicitud = ? ORDER BY fecha_registro ASC, id_pieza ASC', [repairId], conn)
  },

  findById(id, conn) {
    return queryOne('SELECT * FROM piezas WHERE id_pieza = ?', [id], conn)
  },

  async remove(id, conn) {
    await query('DELETE FROM piezas WHERE id_pieza = ?', [id], conn)
  },
}

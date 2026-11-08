import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `evidencias` (solo URL + public_id, nunca binarios). */
export const evidenceModel = {
  listByRepair(repairId, conn) {
    return query(
      `SELECT id_evidencia, url_imagen, public_id_cloudinary, descripcion, tipo_evidencia, id_autor, fecha_subida
         FROM evidencias WHERE id_solicitud = ? ORDER BY fecha_subida ASC, id_evidencia ASC`,
      [repairId],
      conn,
    )
  },

  async countByRepair(repairId, conn, { tipo } = {}) {
    const row = tipo
      ? await queryOne('SELECT COUNT(*) AS total FROM evidencias WHERE id_solicitud = ? AND tipo_evidencia = ?', [repairId, tipo], conn)
      : await queryOne('SELECT COUNT(*) AS total FROM evidencias WHERE id_solicitud = ?', [repairId], conn)
    return Number(row?.total ?? 0)
  },

  async existsPublicId(publicId, conn) {
    const row = await queryOne('SELECT 1 AS found FROM evidencias WHERE public_id_cloudinary = ? LIMIT 1', [publicId], conn)
    return Boolean(row)
  },

  /** tipoEvidencia: inicial | diagnostico | reparacion | pieza | final */
  async create(repairId, { url, publicId, descripcion = null, tipoEvidencia = 'inicial', autorId = null }, conn) {
    const result = await query(
      `INSERT INTO evidencias (id_solicitud, url_imagen, public_id_cloudinary, descripcion, tipo_evidencia, id_autor)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [repairId, url, publicId, descripcion, tipoEvidencia, autorId],
      conn,
    )
    return result.insertId
  },
}

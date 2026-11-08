import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `dispositivos`. */
export const deviceModel = {
  listByUser(userId, conn) {
    return query(
      `SELECT id_dispositivo, tipo, marca, modelo, numero_serie, fecha_registro
         FROM dispositivos WHERE id_usuario = ? ORDER BY fecha_registro DESC`,
      [userId],
      conn,
    )
  },

  /**
   * Busca un dispositivo idéntico del mismo usuario para no duplicarlo.
   * La comparación de marca/modelo no distingue mayúsculas (collation *_ci).
   */
  findMatching(userId, { tipo, marca, modelo, numeroSerie }, conn) {
    return queryOne(
      `SELECT id_dispositivo FROM dispositivos
        WHERE id_usuario = ? AND tipo = ? AND marca = ? AND modelo = ?
          AND ((numero_serie IS NULL AND ? IS NULL) OR numero_serie = ?)
        LIMIT 1`,
      [userId, tipo, marca, modelo, numeroSerie, numeroSerie],
      conn,
    )
  },

  async create(userId, { tipo, marca, modelo, numeroSerie }, conn) {
    const result = await query(
      'INSERT INTO dispositivos (id_usuario, tipo, marca, modelo, numero_serie) VALUES (?, ?, ?, ?, ?)',
      [userId, tipo, marca, modelo, numeroSerie],
      conn,
    )
    return result.insertId
  },
}

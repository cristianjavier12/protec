import { query, queryOne } from '../config/db.js'

/**
 * Tokens de un solo uso (solo se guarda su hash SHA-256).
 * Se usa para recuperar contraseña (`password_resets`) y verificar correo (`verificaciones_correo`).
 */
function oneTimeTokenModel(table, idColumn) {
  return {
    async create({ userId, tokenHash, minutes }, conn) {
      await query(
        `INSERT INTO ${table} (id_usuario, token_hash, expira) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
        [userId, tokenHash, minutes],
        conn,
      )
    },

    /** Token vigente: no usado y sin expirar. */
    findValid(tokenHash, conn) {
      return queryOne(`SELECT *, ${idColumn} AS id FROM ${table} WHERE token_hash = ? AND usado_en IS NULL AND expira > UTC_TIMESTAMP()`, [tokenHash], conn)
    },

    async markUsed(id, conn) {
      const result = await query(`UPDATE ${table} SET usado_en = UTC_TIMESTAMP() WHERE ${idColumn} = ? AND usado_en IS NULL`, [id], conn)
      return result.affectedRows === 1
    },

    /** Invalida los enlaces pendientes del usuario (solo el más reciente queda activo). */
    async invalidateForUser(userId, conn) {
      await query(`UPDATE ${table} SET usado_en = UTC_TIMESTAMP() WHERE id_usuario = ? AND usado_en IS NULL`, [userId], conn)
    },

    /** Cuántos enlaces pidió el usuario en la última hora (limita abusos por cuenta). */
    async countRecent(userId, conn) {
      const row = await queryOne(
        `SELECT COUNT(*) AS total FROM ${table} WHERE id_usuario = ? AND fecha_creacion > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)`,
        [userId],
        conn,
      )
      return Number(row?.total ?? 0)
    },

    async purgeExpired(conn) {
      await query(`DELETE FROM ${table} WHERE expira < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)`, [], conn)
    },
  }
}

export const passwordResetModel = oneTimeTokenModel('password_resets', 'id_reset')
export const emailVerificationModel = oneTimeTokenModel('verificaciones_correo', 'id_verificacion')

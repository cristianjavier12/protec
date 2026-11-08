import { queryOne, query } from '../config/db.js'

/**
 * Genera folios únicos con formato PRO-AAAA-NNNNN (ej. PRO-2026-00001).
 *
 * Se apoya en la tabla `folio_secuencias` y en LAST_INSERT_ID(expr), que es
 * atómico por conexión: dos solicitudes simultáneas nunca obtienen el mismo número.
 * DEBE ejecutarse con la misma conexión de la transacción que crea la solicitud.
 */
export async function generateFolio(conn, date = new Date()) {
  const year = date.getUTCFullYear()
  await query(
    `INSERT INTO folio_secuencias (anio, ultimo) VALUES (?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE ultimo = LAST_INSERT_ID(ultimo + 1)`,
    [year],
    conn,
  )
  const row = await queryOne('SELECT LAST_INSERT_ID() AS seq', [], conn)
  const seq = Number(row.seq)
  return `PRO-${year}-${String(seq).padStart(5, '0')}`
}

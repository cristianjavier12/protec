import mysql from 'mysql2/promise'
import { env } from './env.js'

/**
 * Pool de conexiones reutilizable para MySQL / MariaDB.
 * Usar `query` para consultas simples y `withTransaction` cuando
 * varias operaciones deban confirmarse juntas.
 */
export const pool = mysql.createPool({
  ...env.db,
  ...(env.dbSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false,
  namedPlaceholders: false,
})

// Todas las fechas se guardan en UTC; el frontend las muestra en la zona del usuario.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'")
})

/** Ejecuta una consulta y devuelve solo las filas. */
export async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params)
  return rows
}

/** Devuelve la primera fila o null. */
export async function queryOne(sql, params = [], conn = pool) {
  const rows = await query(sql, params, conn)
  return rows[0] ?? null
}

/**
 * Ejecuta `work(conn)` dentro de una transacción.
 * Si algo falla se hace ROLLBACK automáticamente.
 */
export async function withTransaction(work) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await work(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

/** Verifica la conexión al iniciar el servidor. */
export async function checkDatabaseConnection() {
  const conn = await pool.getConnection()
  try {
    await conn.ping()
  } finally {
    conn.release()
  }
}

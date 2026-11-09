/**
 * Crea la base de datos y las tablas de PROTEC.
 *   npm run db:init    -> crea lo que falte y aplica migraciones (no borra datos)
 *   npm run db:reset   -> ELIMINA las tablas y las vuelve a crear (solo desarrollo)
 *
 * Acepta DATABASE_URL / MYSQL_URL o las variables DB_* (ver config/env.js).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const reset = process.argv.includes('--reset')
const dbName = env.db.database

if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.error('El nombre de la base de datos solo puede contener letras, números y guiones bajos.')
  process.exit(1)
}

const TABLES_DROP_ORDER = [
  'verificaciones_correo',
  'password_resets',
  'calificaciones',
  'piezas',
  'notificaciones',
  'mensajes',
  'conversaciones',
  'logistica',
  'pagos',
  'presupuestos',
  'historial_estados',
  'diagnosticos',
  'evidencias',
  'solicitudes',
  'folio_secuencias',
  'dispositivos',
  'tecnicos',
  'usuarios',
]

/**
 * Migraciones idempotentes para bases creadas con versiones anteriores del esquema.
 * Cada paso comprueba primero si ya está aplicado.
 */
async function migrate(conn) {
  const columnInfo = async (table, column) => {
    const [rows] = await conn.query(
      'SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [dbName, table, column],
    )
    return rows[0] ?? null
  }
  const fkRule = async (table, constraint) => {
    const [rows] = await conn.query(
      'SELECT DELETE_RULE AS rule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
      [dbName, table, constraint],
    )
    return rows[0]?.rule ?? null
  }
  const applied = []

  if (!(await columnInfo('usuarios', 'token_version'))) {
    await conn.query('ALTER TABLE usuarios ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER estado')
    applied.push('usuarios.token_version')
  }
  if (!(await columnInfo('usuarios', 'correo_verificado'))) {
    await conn.query('ALTER TABLE usuarios ADD COLUMN correo_verificado BOOLEAN NOT NULL DEFAULT FALSE AFTER token_version')
    // Las cuentas creadas antes de esta función se consideran verificadas.
    await conn.query('UPDATE usuarios SET correo_verificado = 1')
    applied.push('usuarios.correo_verificado')
  }
  if (!(await columnInfo('usuarios', 'acepto_terminos_en'))) {
    await conn.query('ALTER TABLE usuarios ADD COLUMN acepto_terminos_en DATETIME NULL AFTER correo_verificado')
    applied.push('usuarios.acepto_terminos_en')
  }
  if (!(await columnInfo('pagos', 'stripe_session_id'))) {
    await conn.query('ALTER TABLE pagos ADD COLUMN stripe_session_id VARCHAR(255) NULL AFTER referencia, ADD UNIQUE KEY uq_pagos_stripe (stripe_session_id)')
    applied.push('pagos.stripe_session_id')
  }
  if (!(await columnInfo('pagos', 'registrado_por'))) {
    await conn.query(
      'ALTER TABLE pagos ADD COLUMN registrado_por INT UNSIGNED NULL AFTER stripe_session_id, ADD CONSTRAINT fk_pagos_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios (id_usuario) ON DELETE SET NULL',
    )
    applied.push('pagos.registrado_por')
  }
  if ((await fkRule('mensajes', 'fk_mensajes_remitente')) === 'CASCADE') {
    await conn.query('ALTER TABLE mensajes DROP FOREIGN KEY fk_mensajes_remitente')
    await conn.query('ALTER TABLE mensajes MODIFY id_remitente INT UNSIGNED NULL')
    await conn.query('ALTER TABLE mensajes ADD CONSTRAINT fk_mensajes_remitente FOREIGN KEY (id_remitente) REFERENCES usuarios (id_usuario) ON DELETE SET NULL')
    applied.push('mensajes.id_remitente (conserva el chat al eliminar cuentas)')
  }
  if ((await fkRule('calificaciones', 'fk_calificaciones_tecnico')) === 'CASCADE') {
    await conn.query('ALTER TABLE calificaciones DROP FOREIGN KEY fk_calificaciones_tecnico')
    await conn.query('ALTER TABLE calificaciones MODIFY id_tecnico INT UNSIGNED NULL')
    await conn.query('ALTER TABLE calificaciones ADD CONSTRAINT fk_calificaciones_tecnico FOREIGN KEY (id_tecnico) REFERENCES usuarios (id_usuario) ON DELETE SET NULL')
    applied.push('calificaciones.id_tecnico')
  }
  return applied
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
    ...(env.dbSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  })

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await conn.query(`USE \`${dbName}\``)

    if (reset) {
      if (env.isProduction) throw new Error('db:reset no está permitido en producción.')
      await conn.query('SET FOREIGN_KEY_CHECKS = 0')
      for (const table of TABLES_DROP_ORDER) await conn.query(`DROP TABLE IF EXISTS \`${table}\``)
      await conn.query('SET FOREIGN_KEY_CHECKS = 1')
      console.log('[db] Tablas eliminadas.')
    }

    const sql = await readFile(path.resolve(__dirname, '../database/schema.sql'), 'utf8')
    await conn.query(sql)
    const applied = await migrate(conn)
    if (!process.env.BREVO_API_KEY && !String(process.env.SMTP_PASS || '').startsWith('xkeysib-')) {
      await conn.query('UPDATE usuarios SET correo_verificado = 1 WHERE correo_verificado = 0')
    }
    if (applied.length) console.log(`[db] Migraciones aplicadas: ${applied.join(', ')}`)

    const [rows] = await conn.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [dbName])
    console.log(`[db] Base de datos "${dbName}" lista. Tablas: ${rows.map((r) => r.t).join(', ')}`)
  } finally {
    await conn.end()
  }
}

main().catch((error) => {
  console.error('[db] Error al inicializar la base de datos:', error.code ?? '', error.message)
  process.exit(1)
})

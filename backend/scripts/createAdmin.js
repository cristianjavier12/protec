/**
 * Crea (o actualiza) la cuenta de administrador inicial. Pensado para producción,
 * donde NO se cargan datos de ejemplo.
 *
 *   ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD="ClaveSegura123" npm run admin:create
 *
 * Opcionales: ADMIN_NOMBRE, ADMIN_APELLIDOS, ADMIN_TELEFONO.
 * Si la cuenta ya existe, se convierte en administrador y se actualiza su contraseña.
 */
import bcrypt from 'bcrypt'
import { pool } from '../src/config/db.js'
import { userModel } from '../src/models/userModel.js'
import { isEmail, normalizeEmail, passwordProblem } from '../src/utils/validators.js'

const correo = normalizeEmail(process.env.ADMIN_EMAIL)
const password = process.env.ADMIN_PASSWORD ?? ''
/**
 * --if-configured: modo de despliegue (lo usa `npm run start:prod`).
 * Si no hay variables no hace nada, y si la cuenta ya existe NO la modifica.
 */
const deployMode = process.argv.includes('--if-configured')

async function main() {
  if (deployMode && !process.env.ADMIN_EMAIL) return
  if (!isEmail(correo)) throw new Error('Define ADMIN_EMAIL con un correo válido.')
  const problem = passwordProblem(password)
  if (problem) throw new Error(`ADMIN_PASSWORD no es válida: ${problem}`)

  const existing = await userModel.findByEmail(correo)
  if (existing && deployMode) {
    console.log(`[admin] La cuenta ${correo} ya existe; no se modifica.`)
    return
  }
  const hash = await bcrypt.hash(password, 12)
  if (existing) {
    await pool.query("UPDATE usuarios SET rol = 'admin', estado = 1, password_hash = ?, token_version = token_version + 1 WHERE id_usuario = ?", [hash, existing.id_usuario])
    console.log(`[admin] La cuenta ${correo} ahora es administrador y su contraseña se actualizó.`)
    return
  }
  await userModel.create({
    nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    apellidos: process.env.ADMIN_APELLIDOS || 'PROTEC',
    correo,
    telefono: process.env.ADMIN_TELEFONO || '0000000000',
    passwordHash: hash,
    rol: 'admin',
    correoVerificado: true,
  })
  console.log(`[admin] Cuenta de administrador creada: ${correo}`)
}

main()
  .catch((error) => {
    console.error('[admin] Error:', error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())

import { userModel } from '../models/userModel.js'
import { AppError } from '../utils/AppError.js'
import { isTokenCurrent, verifySessionToken } from '../utils/tokens.js'

/**
 * Extrae el token del header `Authorization: Bearer <token>`.
 */
function readBearer(req) {
  const header = req.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token : null
}

/**
 * Valida el JWT y carga al usuario DESDE LA BASE DE DATOS.
 * Así una cuenta desactivada o eliminada pierde acceso aunque su token no haya expirado,
 * y nunca se confía en datos de identidad enviados por el frontend.
 */
async function resolveUser(token) {
  let payload
  try {
    payload = verifySessionToken(token)
  } catch {
    throw AppError.unauthorized()
  }
  const user = await userModel.findById(Number(payload.sub))
  if (!user) throw AppError.unauthorized()
  // Sesión abierta antes de un cambio de contraseña o de rol: ya no es válida.
  if (!isTokenCurrent(payload, user)) throw AppError.unauthorized()
  if (!user.estado) throw AppError.forbidden('Tu cuenta está desactivada. Contacta a soporte para más información.')
  return {
    id: user.id_usuario,
    rol: user.rol,
    nombre: user.nombre,
    apellidos: user.apellidos,
    correo: user.correo,
    telefono: user.telefono,
  }
}

/** Requiere sesión válida. */
export async function authenticateToken(req, _res, next) {
  try {
    const token = readBearer(req)
    if (!token) throw AppError.unauthorized('Inicia sesión para continuar.')
    req.user = await resolveUser(token)
    next()
  } catch (error) {
    next(error)
  }
}

/** Identifica al usuario si envía token, pero no lo exige (seguimiento público). */
export async function optionalAuth(req, _res, next) {
  const token = readBearer(req)
  if (!token) return next()
  try {
    req.user = await resolveUser(token)
  } catch {
    req.user = null
  }
  next()
}

/**
 * Restringe por rol. Uso: router.get('/x', authenticateToken, authorizeRoles('admin'), handler)
 * Preparado para los paneles de técnico y administrador.
 */
export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) return next(AppError.unauthorized())
  if (!roles.includes(req.user.rol)) return next(AppError.forbidden())
  next()
}

import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Tokens firmados con JWT_SECRET.
 *  - Sesión: identifica al usuario (sub) y su rol.
 *  - Evidencia: comprueba que una imagen subida pertenece al usuario
 *    antes de asociarla a una solicitud (evita URLs manipuladas).
 */

/**
 * `ver` = token_version del usuario: al cambiar o restablecer la contraseña
 * se incrementa en la BD y los tokens anteriores dejan de aceptarse.
 */
export function signSessionToken(user) {
  return jwt.sign({ sub: String(user.id_usuario), rol: user.rol, ver: Number(user.token_version ?? 0), typ: 'session' }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  })
}

export function verifySessionToken(token) {
  const payload = jwt.verify(token, env.jwt.secret)
  if (payload.typ !== 'session') throw new Error('Tipo de token inválido')
  return payload
}

/** ¿El token corresponde a la versión vigente de credenciales del usuario? */
export const isTokenCurrent = (payload, user) => Number(payload.ver ?? 0) === Number(user.token_version ?? 0)

export function signEvidenceToken({ userId, url, publicId, nombre, bytes }) {
  return jwt.sign({ uid: userId, url, pid: publicId, nombre, bytes, typ: 'evidence' }, env.jwt.secret, {
    expiresIn: '24h',
  })
}

export function verifyEvidenceToken(token) {
  const payload = jwt.verify(token, env.jwt.secret)
  if (payload.typ !== 'evidence') throw new Error('Tipo de token inválido')
  return payload
}

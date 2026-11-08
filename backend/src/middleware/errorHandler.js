import multer from 'multer'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { EVIDENCE_RULES } from '../utils/constants.js'

/** Ruta no encontrada dentro de /api. */
export function notFound(req, _res, next) {
  next(AppError.notFound(`No existe la ruta ${req.method} ${req.originalUrl}.`))
}

/**
 * Manejador central de errores.
 * Al usuario solo se le envían mensajes comprensibles; los detalles técnicos
 * (códigos SQL, stack traces) se registran en consola durante el desarrollo.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status ?? 500
  let message = err.expose ? err.message : 'Ocurrió un error inesperado. Inténtalo de nuevo en unos momentos.'
  let errors = err.errors

  if (err instanceof multer.MulterError) {
    status = 400
    const maxMb = Math.round(EVIDENCE_RULES.maxBytes / 1024 / 1024)
    message =
      {
        LIMIT_FILE_SIZE: `Cada imagen puede pesar como máximo ${maxMb} MB.`,
        LIMIT_FILE_COUNT: `Puedes adjuntar como máximo ${EVIDENCE_RULES.maxFiles} imágenes.`,
        LIMIT_UNEXPECTED_FILE: 'Se recibió un archivo inesperado.',
      }[err.code] ?? 'No pudimos procesar el archivo.'
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'El formato de los datos enviados no es válido.'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'Los datos enviados son demasiado grandes.'
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409
    message = 'Ya existe un registro con esa información.'
  } else if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code)) {
    status = 503
    message = 'El servicio no está disponible en este momento. Inténtalo más tarde.'
  }

  if (status >= 500 || env.isDevelopment) {
    const tag = status >= 500 ? 'error' : 'warn'
    console[tag](`[${req.method} ${req.originalUrl}] ${status}:`, status >= 500 ? err : err.message)
  }

  // `code` solo se expone para errores controlados (p. ej. EMAIL_NOT_VERIFIED), nunca códigos internos de MySQL.
  const code = err instanceof AppError && err.code ? err.code : undefined
  res.status(status).json({ message, ...(errors ? { errors } : {}), ...(code ? { code } : {}) })
}

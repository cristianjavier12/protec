import multer from 'multer'
import path from 'node:path'
import { AppError } from '../utils/AppError.js'
import { EVIDENCE_RULES } from '../utils/constants.js'

/**
 * Multer en memoria: el archivo se valida y se envía directo a Cloudinary,
 * sin escribirse en disco ni en la base de datos.
 */
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').slice(1).toLowerCase()
  if (!EVIDENCE_RULES.mimeTypes.includes(file.mimetype) || !EVIDENCE_RULES.extensions.includes(ext)) {
    return cb(AppError.badRequest('Formato no permitido. Solo se aceptan imágenes JPG, JPEG, PNG o WEBP.'))
  }
  cb(null, true)
}

export const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EVIDENCE_RULES.maxBytes, files: EVIDENCE_RULES.maxFiles },
  fileFilter,
})

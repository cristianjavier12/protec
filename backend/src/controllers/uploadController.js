import { evidenceModel } from '../models/evidenceModel.js'
import { storageService } from '../services/storageService.js'
import { AppError } from '../utils/AppError.js'
import { signEvidenceToken, verifyEvidenceToken } from '../utils/tokens.js'

/**
 * POST /api/uploads  (multipart, campo "file")
 * Sube una fotografía a Cloudinary y devuelve un token firmado que
 * después se usa para asociarla a la solicitud.
 */
export async function uploadEvidence(req, res) {
  if (!req.file) throw AppError.badRequest('Selecciona una imagen para subir.')
  const stored = await storageService.uploadEvidence(req.file, req.user.id)
  const nombre = (req.file.originalname || 'imagen').slice(0, 120)
  const token = signEvidenceToken({ userId: req.user.id, url: stored.url, publicId: stored.publicId, nombre, bytes: stored.bytes })
  res.status(201).json({
    evidence: { token, url: stored.url, nombre, bytes: stored.bytes, formato: stored.format },
    provider: storageService.provider,
  })
}

/**
 * DELETE /api/uploads  { token }
 * Elimina una imagen que aún NO se ha asociado a una solicitud.
 */
export async function deleteEvidence(req, res) {
  let payload
  try {
    payload = verifyEvidenceToken(req.body?.token)
  } catch {
    throw AppError.badRequest('La imagen no es válida o ya expiró.')
  }
  if (payload.uid !== req.user.id) throw AppError.forbidden()
  // Si ya forma parte de una solicitud no se elimina desde aquí (queda como evidencia).
  if (await evidenceModel.existsPublicId(payload.pid)) {
    throw AppError.conflict('Esta imagen ya forma parte de una solicitud y no puede eliminarse.')
  }
  await storageService.removeEvidence(payload.pid)
  res.json({ message: 'Imagen eliminada.' })
}

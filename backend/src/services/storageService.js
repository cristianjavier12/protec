import { randomBytes } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

/**
 * Almacenamiento de fotografías de evidencias.
 *
 *  - Producción / Cloudinary configurado: se suben a Cloudinary y se guarda
 *    solo la URL segura (secure_url) y el public_id.
 *  - Desarrollo sin credenciales: respaldo en backend/uploads para poder
 *    probar el flujo completo. El public_id lleva el prefijo "local/".
 *
 * En ningún caso se guarda el binario en MySQL.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')

const MAGIC = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP',
}

/** Detecta el formato real leyendo la firma del archivo (no confía en la extensión). */
export function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 12) return null
  return Object.keys(MAGIC).find((fmt) => MAGIC[fmt](buffer)) ?? null
}

const userFolder = (userId) => `${env.cloudinary.folder}/evidencias/u${userId}`

function uploadToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: userFolder(userId),
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 2000, height: 2000, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
    stream.end(buffer)
  })
}

async function saveLocally(buffer, userId, format) {
  const relativeDir = `evidencias/u${userId}`
  const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}.${format}`
  const dir = path.join(UPLOADS_DIR, relativeDir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fileName), buffer)
  return {
    url: `${env.publicUrl}/uploads/${relativeDir}/${fileName}`,
    publicId: `local/${relativeDir}/${fileName}`,
  }
}

export const storageService = {
  provider: cloudinaryEnabled ? 'cloudinary' : 'local',

  /** Sube una imagen validada y devuelve { url, publicId, bytes, format }. */
  async uploadEvidence(file, userId) {
    const format = detectImageFormat(file.buffer)
    if (!format) throw AppError.badRequest('El archivo no es una imagen válida (JPG, PNG o WEBP).')
    // En la nube el disco del servidor es temporal: sin Cloudinary las imágenes se perderían.
    if (!cloudinaryEnabled && env.isProduction) {
      console.error('[storage] Cloudinary no está configurado en producción.')
      throw new AppError('La subida de fotografías no está disponible en este momento.', 503)
    }

    if (cloudinaryEnabled) {
      try {
        const result = await uploadToCloudinary(file.buffer, userId)
        return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format }
      } catch (error) {
        console.error('[cloudinary] Error al subir imagen:', error?.message ?? error)
        throw new AppError('No pudimos subir la imagen. Inténtalo de nuevo en unos momentos.', 502)
      }
    }

    const saved = await saveLocally(file.buffer, userId, format)
    return { ...saved, bytes: file.size, format }
  },

  /** Elimina una imagen (se usa al quitarla en el paso 3 del formulario). */
  async removeEvidence(publicId) {
    try {
      if (publicId.startsWith('local/')) {
        const relative = publicId.slice('local/'.length)
        const target = path.resolve(UPLOADS_DIR, relative)
        if (!target.startsWith(UPLOADS_DIR)) return // protección contra path traversal
        await unlink(target).catch(() => {})
        return
      }
      if (cloudinaryEnabled) await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
    } catch (error) {
      console.error('[storage] No se pudo eliminar la imagen:', error?.message ?? error)
    }
  },

  /** Verifica que el public_id pertenezca a la carpeta del usuario. */
  belongsToUser(publicId, userId) {
    return publicId.startsWith(`local/evidencias/u${userId}/`) || publicId.startsWith(`${userFolder(userId)}/`)
  },
}

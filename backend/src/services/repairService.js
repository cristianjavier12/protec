import { withTransaction } from '../config/db.js'
import { deviceModel } from '../models/deviceModel.js'
import { diagnosisModel } from '../models/diagnosisModel.js'
import { evidenceModel } from '../models/evidenceModel.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { AppError } from '../utils/AppError.js'
import { EVIDENCE_RULES, REPAIR_STATUS, ROLES, isFinishedStatus } from '../utils/constants.js'
import {
  serializeRepairDetail,
  serializeRepairSummary,
  serializePublicTracking,
} from '../utils/serializers.js'
import { verifyEvidenceToken } from '../utils/tokens.js'
import { FOLIO_RE, normalizeFolio } from '../utils/validators.js'
import { generateFolio } from './folioService.js'
import { storageService } from './storageService.js'
import { assignTechnician } from './assignmentService.js'

/**
 * Reglas de autorización sobre una solicitud:
 *  - usuario: solo las suyas
 *  - técnico: las que tenga asignadas
 *  - admin: todas
 */
export function canAccessRepair(user, row) {
  if (!user || !row) return false
  if (user.rol === ROLES.ADMIN) return true
  if (row.id_usuario === user.id) return true
  if (
    user.rol === ROLES.TECHNICIAN &&
    (row.id_tecnico === user.id || (!row.id_tecnico && [REPAIR_STATUS.PENDING_TECH, REPAIR_STATUS.REGISTERED].includes(row.estado)))
  ) {
    return true
  }
  return false
}

/** Obtiene la solicitud por folio validando formato, existencia y permisos. */
export async function findAuthorizedRepair(rawFolio, user, conn) {
  const folio = normalizeFolio(rawFolio)
  if (!FOLIO_RE.test(folio)) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  const row = await repairModel.findByFolio(folio, conn)
  if (!row) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  if (!canAccessRepair(user, row)) {
    throw AppError.forbidden('No tienes permiso para consultar esta solicitud.')
  }
  return row
}

/**
 * Verifica los tokens firmados que devolvió POST /uploads.
 * Garantiza que cada imagen fue subida por este mismo usuario.
 * Se reutiliza para las evidencias que sube el técnico.
 */
export function resolveEvidenceTokens(items, userId, { maxFiles = EVIDENCE_RULES.maxFiles } = {}) {
  if (!Array.isArray(items)) return []
  if (items.length > maxFiles) {
    throw AppError.validation({ evidencias: `Puedes adjuntar como máximo ${maxFiles} imágenes.` })
  }
  const seen = new Set()
  return items.map((item) => {
    const token = typeof item === 'string' ? item : item?.token
    let payload
    try {
      payload = verifyEvidenceToken(token)
    } catch {
      throw AppError.validation(
        { evidencias: 'Alguna imagen expiró o no es válida. Elimínala y vuelve a subirla.' },
        'Revisa las imágenes adjuntas.',
      )
    }
    if (payload.uid !== userId || !storageService.belongsToUser(payload.pid, userId)) {
      throw AppError.forbidden('No puedes adjuntar imágenes que no te pertenecen.')
    }
    if (seen.has(payload.pid)) return null
    seen.add(payload.pid)
    const descripcion = typeof item?.descripcion === 'string' ? item.descripcion.trim().slice(0, 255) || null : null
    return { url: payload.url, publicId: payload.pid, descripcion: descripcion ?? payload.nombre ?? null }
  }).filter(Boolean)
}

async function loadDetail(row, conn) {
  const [evidencias, historial, diagnostico] = await Promise.all([
    evidenceModel.listByRepair(row.id_solicitud, conn),
    statusHistoryModel.listByRepair(row.id_solicitud, conn),
    diagnosisModel.findLatest(row.id_solicitud, 'chatbot', conn),
  ])
  return serializeRepairDetail(row, { evidencias, historial, diagnostico })
}

export const repairService = {
  /**
   * Crea una solicitud completa en una sola transacción:
   * 1. Reutiliza o registra el dispositivo  2. Genera folio  3. Crea la solicitud
   * 4. Asocia las imágenes  5. Registra el estado inicial en el historial.
   */
  async create(user, data) {
    const evidencias = resolveEvidenceTokens(data.evidencias, user.id)

    const repairId = await withTransaction(async (conn) => {
      const device = { tipo: data.tipo, marca: data.marca, modelo: data.modelo, numeroSerie: data.numeroSerie }
      const existing = await deviceModel.findMatching(user.id, device, conn)
      const deviceId = existing?.id_dispositivo ?? (await deviceModel.create(user.id, device, conn))

      const folio = await generateFolio(conn)
      const id = await repairModel.create(
        {
          folio,
          userId: user.id,
          deviceId,
          descripcion: data.descripcion,
          categoria: data.categoria,
          estado: REPAIR_STATUS.REGISTERED,
          requiereTecnico: false,
          metodoContacto: data.metodoContacto,
          solicitaRecoleccion: data.solicitaRecoleccion,
        },
        conn,
      )

      for (const ev of evidencias) {
        if (await evidenceModel.existsPublicId(ev.publicId, conn)) continue
        await evidenceModel.create(id, ev, conn)
      }

      const fotos = evidencias.length
      await statusHistoryModel.add(
        id,
        REPAIR_STATUS.REGISTERED,
        `Solicitud creada desde la plataforma${fotos ? ` con ${fotos} ${fotos === 1 ? 'fotografía' : 'fotografías'}` : ''}.`,
        conn,
      )
      // Al abrir un folio, queda disponible para los técnicos especialistas del área hasta que uno confirme o rechace.
      await repairModel.updateStatus(id, { estado: REPAIR_STATUS.PENDING_TECH, requiereTecnico: true, prioridad: 'media' }, conn)
      await statusHistoryModel.add(
        id,
        REPAIR_STATUS.PENDING_TECH,
        'Folio disponible para los técnicos especialistas del área. En espera de que un especialista confirme el folio.',
        conn,
      )
      return id
    })

    try {
      await assignTechnician(repairId)
    } catch (error) {
      console.error('[repairs] Error en asignación automática:', error.message)
    }

    const row = await repairModel.findById(repairId)
    return loadDetail(row)
  },

  async listForUser(user, { filter, search }) {
    const allowed = ['all', 'active', 'finished']
    const rows = await repairModel.listByUser(user.id, {
      filter: allowed.includes(filter) ? filter : 'all',
      search: typeof search === 'string' ? search.trim().toUpperCase().slice(0, 20) : '',
    })
    return rows.map(serializeRepairSummary)
  },

  async statsForUser(user) {
    return repairModel.countByUser(user.id)
  },

  async getDetail(user, folio) {
    const row = await findAuthorizedRepair(folio, user)
    return loadDetail(row)
  },

  /** Seguimiento público por folio: nunca expone datos personales. */
  async getPublicTracking(rawFolio, user) {
    const folio = normalizeFolio(rawFolio)
    if (!FOLIO_RE.test(folio)) return null
    const row = await repairModel.findByFolio(folio)
    if (!row) return null
    const historial = await statusHistoryModel.listByRepair(row.id_solicitud)
    return serializePublicTracking(row, historial, { isOwner: Boolean(user && row.id_usuario === user.id) })
  },

  /** Agrega fotografías a una solicitud existente del propio usuario. */
  async addEvidences(user, folio, items) {
    const row = await findAuthorizedRepair(folio, user)
    if (row.id_usuario !== user.id) throw AppError.forbidden('Solo el propietario puede agregar fotografías.')
    if (isFinishedStatus(row.estado)) throw AppError.badRequest('La solicitud ya está terminada.')

    const evidencias = resolveEvidenceTokens(items, user.id)
    if (!evidencias.length) throw AppError.validation({ evidencias: 'Selecciona al menos una imagen.' })

    await withTransaction(async (conn) => {
      // El límite de 5 aplica a las fotografías del cliente (las del técnico se cuentan aparte).
      const current = await evidenceModel.countByRepair(row.id_solicitud, conn, { tipo: 'inicial' })
      if (current + evidencias.length > EVIDENCE_RULES.maxFiles) {
        throw AppError.validation({
          evidencias: `Cada solicitud admite hasta ${EVIDENCE_RULES.maxFiles} imágenes. Te quedan ${Math.max(0, EVIDENCE_RULES.maxFiles - current)}.`,
        })
      }
      for (const ev of evidencias) {
        if (await evidenceModel.existsPublicId(ev.publicId, conn)) continue
        await evidenceModel.create(row.id_solicitud, ev, conn)
      }
    })

    return loadDetail(await repairModel.findById(row.id_solicitud))
  },
}

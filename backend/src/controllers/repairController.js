import { repairService } from '../services/repairService.js'
import { AppError } from '../utils/AppError.js'
import { validateRepairInput } from '../utils/validators.js'

/** POST /api/repairs — crea una solicitud completa (dispositivo, folio, imágenes, historial). */
export async function createRepair(req, res) {
  const { data, errors } = validateRepairInput(req.body)
  if (errors) throw AppError.validation(errors)
  const repair = await repairService.create(req.user, data)
  res.status(201).json({ message: 'Solicitud registrada correctamente.', repair })
}

/** GET /api/repairs?filter=all|active|finished&search=PRO-2026 */
export async function listMyRepairs(req, res) {
  const repairs = await repairService.listForUser(req.user, {
    filter: req.query.filter,
    search: req.query.search,
  })
  res.json({ repairs })
}

/** GET /api/repairs/:folio — detalle completo (solo propietario / personal autorizado). */
export async function getRepair(req, res) {
  const repair = await repairService.getDetail(req.user, req.params.folio)
  res.json({ repair })
}

/** GET /api/repairs/:folio/tracking — seguimiento público sin datos sensibles. */
export async function getTracking(req, res) {
  const tracking = await repairService.getPublicTracking(req.params.folio, req.user)
  if (!tracking) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  res.json({ tracking })
}

/** POST /api/repairs/:folio/evidencias { evidencias: [{ token }] } */
export async function addEvidences(req, res) {
  const items = Array.isArray(req.body?.evidencias) ? req.body.evidencias : []
  const repair = await repairService.addEvidences(req.user, req.params.folio, items)
  res.status(201).json({ message: 'Fotografías agregadas correctamente.', repair })
}

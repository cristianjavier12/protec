import { diagnosisService } from '../services/diagnosisService.js'
import { AppError } from '../utils/AppError.js'

const sanitizeAnswers = (value) => {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 40) throw AppError.badRequest('Las respuestas enviadas no son válidas.')
  return value.map((a) => String(a ?? '').slice(0, 300))
}

/** GET /api/diagnostics/:folio — estado del diagnóstico de una solicitud. */
export async function getSession(req, res) {
  const session = await diagnosisService.getSession(req.user, req.params.folio)
  res.json(session)
}

/** POST /api/diagnostics/:folio/answer { answers: string[] } */
export async function answer(req, res) {
  const answers = sanitizeAnswers(req.body?.answers)
  const result = await diagnosisService.answer(req.user, req.params.folio, answers)
  res.json(result)
}

/** POST /api/diagnostics/:folio/resolution { resolved: boolean } */
export async function resolve(req, res) {
  if (typeof req.body?.resolved !== 'boolean') throw AppError.badRequest('Indica si el problema quedó resuelto.')
  const session = await diagnosisService.resolve(req.user, req.params.folio, req.body.resolved)
  res.json(session)
}

/** POST /api/diagnostics/preview — diagnóstico demostrativo sin guardar datos. */
export async function preview(req, res) {
  sanitizeAnswers(req.body?.answers)
  res.json(diagnosisService.preview(req.body))
}

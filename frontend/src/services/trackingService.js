import { api, mockDelay } from './apiClient'
import { config } from '../utils/config'
import { findMockRepair } from '../data/trackingMock'
import { normalizeFolio } from '../utils/format'


/**
 * Forma común que consume la página de seguimiento:
 * { folio, deviceType, status, progress, finished, createdAt, updatedAt, history: [{ status, date, note }], isOwner }
 * La vista pública NUNCA incluye datos personales, fotografías ni descripciones.
 */
function fromApi(t) {
  return {
    folio: t.folio,
    deviceType: t.tipoDispositivo,
    status: t.estado,
    progress: t.progreso,
    finished: t.terminada,
    createdAt: t.fechaCreacion,
    updatedAt: t.fechaActualizacion,
    history: (t.historial ?? []).map((h) => ({ status: h.estado, date: h.fecha })),
    isOwner: Boolean(t.isOwner),
  }
}

function fromMock(m) {
  return {
    folio: m.folio,
    deviceType: m.device.type === 'phone' ? 'celular' : m.device.type === 'desktop' ? 'computadora' : m.device.type,
    status: m.status,
    progress: m.progress,
    finished: false,
    createdAt: m.createdAt,
    updatedAt: m.lastUpdate?.date,
    history: m.history,
    isOwner: false,
  }
}

/**
 * Consulta GET /repairs/:folio/tracking (público; si hay sesión, el backend
 * indica si el usuario es el propietario para ofrecer el detalle completo).
 * Devuelve null si el folio no existe.
 */
export async function getRepairByFolio(rawFolio) {
  const folio = normalizeFolio(rawFolio)
  if (!folio) return null

  if (config.useMocks) {
    await mockDelay(650)
    const mock = findMockRepair(folio)
    return mock ? fromMock(mock) : null
  }

  try {
    const res = await api.get(`/repairs/${encodeURIComponent(folio)}/tracking`)
    return res?.tracking ? fromApi(res.tracking) : null
  } catch (error) {
    if (error.status === 404 || error.status === 400) return null
    throw error
  }
}

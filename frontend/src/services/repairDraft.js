/**
 * Borrador de solicitud de reparación guardado en sessionStorage.
 * Permite conservar lo capturado entre pasos del wizard y al iniciar sesión.
 */
const KEY = 'protec:repair-draft'

export function loadRepairDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

export function saveRepairDraft(partial) {
  const next = { ...loadRepairDraft(), ...partial, updatedAt: new Date().toISOString() }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* almacenamiento no disponible */
  }
  return next
}

export function clearRepairDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

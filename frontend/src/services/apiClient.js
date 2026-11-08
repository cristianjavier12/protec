import { config } from '../utils/config'

/**
 * Cliente HTTP base para la API de PROTEC (Node.js + Express).
 * Incluye manejo de token JWT y errores.
 */
let authToken = (() => {
  try { return localStorage.getItem('protec_token') || null } catch { return null }
})()

export function setAuthToken(token) {
  authToken = token
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Se invoca cuando una petición autenticada recibe 401 (token expirado o inválido). */
let unauthorizedHandler = null
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

async function request(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const isFormData = body instanceof FormData
  const sentToken = authToken
  let response
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
        ...headers,
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      ...rest,
    })
  } catch {
    // Error de red: nunca mostrar mensajes técnicos al usuario.
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0, null)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && sentToken && unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(data?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.', response.status, data)
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),

  /**
   * Envía un FormData reportando el progreso (0-100) mediante XMLHttpRequest,
   * ya que fetch no expone el avance de subida.
   */
  upload: (path, formData, { onProgress } = {}) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const sentToken = authToken
      xhr.open('POST', `${config.apiUrl}${path}`)
      if (sentToken) xhr.setRequestHeader('Authorization', `Bearer ${sentToken}`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        let data = null
        try {
          data = JSON.parse(xhr.responseText)
        } catch {
          /* respuesta vacía */
        }
        if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
        if (xhr.status === 401 && sentToken && unauthorizedHandler) unauthorizedHandler()
        reject(new ApiError(data?.message || 'No pudimos subir la imagen. Inténtalo de nuevo.', xhr.status, data))
      }
      xhr.onerror = () =>
        reject(new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0, null))
      xhr.send(formData)
    }),
}

/** Simula latencia de red para los servicios con datos locales. */
export const mockDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

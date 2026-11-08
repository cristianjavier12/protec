import {
  CONTACT_METHODS,
  DESCRIPTION_RULES,
  DEVICE_ALIASES,
  PASSWORD_MIN,
  PROBLEM_CATEGORIES,
} from './constants.js'

/**
 * Validaciones del lado del servidor.
 * Nunca se confía únicamente en las validaciones del frontend.
 * Cada función devuelve { data, errors } donde `data` ya viene saneado.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+\d][\d\s-]{7,17}$/
const NAME_RE = /^[\p{L}\p{M}' .-]+$/u

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const hasErrors = (errors) => Object.keys(errors).length > 0

export const normalizeEmail = (v) => str(v).toLowerCase()
export const isEmail = (v) => EMAIL_RE.test(str(v)) && str(v).length <= 160
export const isPhone = (v) => PHONE_RE.test(str(v))

export const normalizeDeviceType = (v) => DEVICE_ALIASES[str(v).toLowerCase()] ?? null

function validateName(value, label, max, errors, key) {
  if (!value) errors[key] = `Ingresa tu ${label}.`
  else if (value.length < 2) errors[key] = `Tu ${label} debe tener al menos 2 caracteres.`
  else if (value.length > max) errors[key] = `Tu ${label} no puede superar ${max} caracteres.`
  else if (!NAME_RE.test(value)) errors[key] = `Tu ${label} contiene caracteres no válidos.`
}

export function validateRegisterInput(body = {}) {
  const errors = {}
  const data = {
    nombre: str(body.nombre),
    apellidos: str(body.apellidos),
    correo: normalizeEmail(body.correo ?? body.email),
    telefono: str(body.telefono),
    password: typeof body.password === 'string' ? body.password : '',
  }
  const confirm = typeof body.confirmPassword === 'string' ? body.confirmPassword : undefined

  validateName(data.nombre, 'nombre', 80, errors, 'nombre')
  validateName(data.apellidos, 'apellidos', 120, errors, 'apellidos')
  if (!data.correo) errors.correo = 'Ingresa tu correo electrónico.'
  else if (!isEmail(data.correo)) errors.correo = 'Ingresa un correo válido.'
  if (!data.telefono) errors.telefono = 'Ingresa tu teléfono.'
  else if (!isPhone(data.telefono)) errors.telefono = 'Ingresa un teléfono válido (8 a 18 dígitos).'
  if (!data.password) errors.password = 'Crea una contraseña.'
  else if (passwordProblem(data.password)) errors.password = passwordProblem(data.password)
  if (confirm !== undefined && confirm !== data.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  // Consentimiento expreso (Términos y Aviso de privacidad). El registro público lo exige.
  data.aceptaTerminos = body.aceptaTerminos === true || body.terms === true

  return { data, errors: hasErrors(errors) ? errors : null }
}

/** Reglas comunes para cualquier contraseña nueva (registro, cambio y recuperación). */
export function passwordProblem(password) {
  if (typeof password !== 'string' || !password) return 'Escribe la nueva contraseña.'
  if (password.length < PASSWORD_MIN) return `Debe tener al menos ${PASSWORD_MIN} caracteres.`
  if (password.length > 72) return 'La contraseña no puede superar 72 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) return 'Usa al menos una letra y un número.'
  return null
}

/** PUT /users/me/password: contraseña actual + nueva + confirmación. */
export function validatePasswordChange(body = {}) {
  const errors = {}
  const data = {
    actual: typeof body.actual === 'string' ? body.actual : '',
    nueva: typeof body.nueva === 'string' ? body.nueva : '',
    confirmacion: typeof body.confirmacion === 'string' ? body.confirmacion : '',
  }
  if (!data.actual) errors.actual = 'Escribe tu contraseña actual.'
  const problem = passwordProblem(data.nueva)
  if (problem) errors.nueva = problem
  else if (data.nueva === data.actual) errors.nueva = 'La nueva contraseña debe ser diferente a la actual.'
  if (data.confirmacion !== data.nueva) errors.confirmacion = 'Las contraseñas no coinciden.'
  return { data, errors: hasErrors(errors) ? errors : null }
}

export function validateLoginInput(body = {}) {
  const errors = {}
  const data = {
    correo: normalizeEmail(body.correo ?? body.email),
    password: typeof body.password === 'string' ? body.password : '',
  }
  if (!data.correo) errors.correo = 'Ingresa tu correo electrónico.'
  else if (!isEmail(data.correo)) errors.correo = 'Ingresa un correo válido.'
  if (!data.password) errors.password = 'Ingresa tu contraseña.'
  return { data, errors: hasErrors(errors) ? errors : null }
}

export function validateProfileInput(body = {}) {
  const errors = {}
  const correoRaw = body.correo ?? body.email
  const data = {
    nombre: str(body.nombre),
    apellidos: str(body.apellidos),
    telefono: str(body.telefono),
    correo: correoRaw !== undefined ? normalizeEmail(correoRaw) : undefined,
    passwordActual: typeof body.passwordActual === 'string' ? body.passwordActual : typeof body.password === 'string' ? body.password : '',
  }
  validateName(data.nombre, 'nombre', 80, errors, 'nombre')
  validateName(data.apellidos, 'apellidos', 120, errors, 'apellidos')
  if (!data.telefono) errors.telefono = 'Ingresa tu teléfono.'
  else if (!isPhone(data.telefono)) errors.telefono = 'Ingresa un teléfono válido (8 a 18 dígitos).'
  if (data.correo !== undefined) {
    if (!data.correo) errors.correo = 'Ingresa tu correo electrónico.'
    else if (!isEmail(data.correo)) errors.correo = 'Ingresa un correo válido.'
  }
  return { data, errors: hasErrors(errors) ? errors : null }
}

export function validateRepairInput(body = {}) {
  const errors = {}
  const tipo = normalizeDeviceType(body.tipo ?? body.deviceType)
  const categoria = str(body.categoria ?? body.category)
  const metodo = str(body.metodoContacto ?? body.contactMethod).toLowerCase() || 'chat'

  const data = {
    tipo,
    marca: str(body.marca ?? body.brand),
    modelo: str(body.modelo ?? body.model),
    numeroSerie: str(body.numeroSerie ?? body.serialNumber) || null,
    categoria: categoria || null,
    descripcion: str(body.descripcion ?? body.description),
    metodoContacto: metodo,
    solicitaRecoleccion: body.solicitaRecoleccion === true || body.solicitaRecoleccion === 'true',
    evidencias: Array.isArray(body.evidencias) ? body.evidencias : [],
    /** 'chatbot' = diagnóstico con el asistente · 'tecnico' = abrir folio directo para un técnico */
    atencion: body.atencion === 'tecnico' ? 'tecnico' : 'chatbot',
  }

  if (!tipo) errors.tipo = 'Selecciona un tipo de dispositivo válido (celular, laptop o computadora).'
  if (!data.marca) errors.marca = 'Selecciona la marca.'
  else if (data.marca.length > 60) errors.marca = 'La marca no puede superar 60 caracteres.'
  if (!data.modelo) errors.modelo = 'Indica el modelo del dispositivo.'
  else if (data.modelo.length > 80) errors.modelo = 'El modelo no puede superar 80 caracteres.'
  if (data.numeroSerie && data.numeroSerie.length > 60) errors.numeroSerie = 'El número de serie no puede superar 60 caracteres.'
  if (data.categoria && !PROBLEM_CATEGORIES.includes(data.categoria)) errors.categoria = 'Selecciona una categoría válida.'
  if (!data.descripcion) errors.descripcion = 'Describe el problema de tu dispositivo.'
  else if (data.descripcion.length < DESCRIPTION_RULES.min)
    errors.descripcion = `Describe el problema con al menos ${DESCRIPTION_RULES.min} caracteres.`
  else if (data.descripcion.length > DESCRIPTION_RULES.max)
    errors.descripcion = `La descripción no puede superar ${DESCRIPTION_RULES.max} caracteres.`
  if (!CONTACT_METHODS.includes(data.metodoContacto)) errors.metodoContacto = 'Selecciona un método de contacto válido.'

  return { data, errors: hasErrors(errors) ? errors : null }
}

/** Folio con formato PRO-AAAA-NNNNN */
export const FOLIO_RE = /^PRO-\d{4}-\d{5}$/

export function normalizeFolio(value) {
  const clean = str(value).toUpperCase().replace(/^#/, '').replace(/\s+/g, '')
  const match = clean.match(/^(?:PRO-?)?(\d{4})-?(\d{1,5})$/)
  if (match) return `PRO-${match[1]}-${match[2].padStart(5, '0')}`
  return clean
}

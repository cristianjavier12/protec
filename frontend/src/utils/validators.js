const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+\d][\d\s-]{7,17}$/

export const isEmail = (v = '') => EMAIL_RE.test(v.trim())
export const isPhone = (v = '') => PHONE_RE.test(v.trim())

/** Validación del formulario de inicio de sesión. */
export function validateLogin({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Ingresa tu correo electrónico.'
  else if (!isEmail(email)) errors.email = 'Ingresa un correo válido.'
  if (!password) errors.password = 'Ingresa tu contraseña.'
  return errors
}

/** Validación del formulario de registro. */
export function validateRegister(form) {
  const errors = {}
  if (!form.nombre.trim()) errors.nombre = 'Ingresa tu nombre.'
  if (!form.apellidos.trim()) errors.apellidos = 'Ingresa tus apellidos.'
  if (!form.email.trim()) errors.email = 'Ingresa tu correo electrónico.'
  else if (!isEmail(form.email)) errors.email = 'Ingresa un correo válido.'
  if (!form.telefono.trim()) errors.telefono = 'Ingresa tu teléfono.'
  else if (!isPhone(form.telefono)) errors.telefono = 'Ingresa un teléfono válido.'
  if (!form.password) errors.password = 'Crea una contraseña.'
  else if (passwordProblem(form.password)) errors.password = passwordProblem(form.password)
  if (!form.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña.'
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  if (!form.terms) errors.terms = 'Debes aceptar los términos y condiciones.'
  return errors
}

/** Mismas reglas que el backend para contraseñas nuevas. */
export function passwordProblem(password = '') {
  if (!password) return 'Escribe la nueva contraseña.'
  if (password.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (password.length > 72) return 'No puede superar 72 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) return 'Usa al menos una letra y un número.'
  return null
}

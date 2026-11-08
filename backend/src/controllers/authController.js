import { authService } from '../services/authService.js'
import { AppError } from '../utils/AppError.js'
import { validateLoginInput, validateRegisterInput } from '../utils/validators.js'

/** POST /api/auth/register */
export async function register(req, res) {
  const { data, errors } = validateRegisterInput(req.body)
  if (errors) throw AppError.validation(errors)
  const { user, verificationRequired } = await authService.register(data)
  res.status(201).json({
    message: verificationRequired
      ? 'Tu cuenta se creó. Te enviamos un correo para confirmar tu dirección antes de iniciar sesión.'
      : 'Tu cuenta se creó correctamente. Ya puedes iniciar sesión.',
    user,
    verificationRequired,
  })
}

/** POST /api/auth/verify-email */
export async function verifyEmail(req, res) {
  await authService.verifyEmail(req.body?.token)
  res.json({ message: '¡Correo confirmado! Ya puedes iniciar sesión.' })
}

/** POST /api/auth/resend-verification — respuesta idéntica exista o no la cuenta. */
export async function resendVerification(req, res) {
  await authService.resendVerification(req.body?.correo ?? req.body?.email)
  res.json({ message: 'Si la cuenta existe y aún no está confirmada, te enviamos un nuevo enlace de verificación.' })
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { data, errors } = validateLoginInput(req.body)
  if (errors) throw AppError.validation(errors)
  const { token, user } = await authService.login(data)
  res.json({ message: `Hola de nuevo, ${user.nombre}.`, token, user })
}

/** GET /api/auth/me */
export async function me(req, res) {
  const user = await authService.getProfile(req.user.id)
  res.json({ user })
}

/** POST /api/auth/forgot-password — respuesta idéntica exista o no la cuenta. */
export async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.body?.correo ?? req.body?.email)
  res.json({
    message: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.',
  })
}

/** GET /api/auth/reset-password/validate?token= */
export async function validateResetToken(req, res) {
  res.json({ valid: await authService.validateResetToken(req.query.token) })
}

/** POST /api/auth/reset-password */
export async function resetPassword(req, res) {
  await authService.resetPassword({ token: req.body?.token, password: req.body?.password, confirmacion: req.body?.confirmacion })
  res.json({ message: 'Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva contraseña.' })
}

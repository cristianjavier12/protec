import { deviceModel } from '../models/deviceModel.js'
import { authService } from '../services/authService.js'
import { repairService } from '../services/repairService.js'
import { AppError } from '../utils/AppError.js'
import { serializeDevice } from '../utils/serializers.js'
import { validatePasswordChange, validateProfileInput } from '../utils/validators.js'

/** GET /api/users/me — perfil + estadísticas básicas */
export async function getMe(req, res) {
  const [user, stats] = await Promise.all([
    authService.getProfile(req.user.id),
    repairService.statsForUser(req.user),
  ])
  res.json({ user, stats })
}

/** PUT /api/users/me — actualiza nombre, apellidos, teléfono y (confirmando con la contraseña actual) correo. */
export async function updateMe(req, res) {
  const { data, errors } = validateProfileInput(req.body)
  if (errors) throw AppError.validation(errors)
  const { user, token, emailChanged } = await authService.updateProfile(req.user.id, data)
  res.json({
    message: emailChanged ? 'Tu perfil y tu correo electrónico se actualizaron correctamente.' : 'Tus datos se actualizaron correctamente.',
    user,
    ...(token ? { token } : {}),
  })
}

/** GET /api/devices — dispositivos registrados por el usuario */
export async function listMyDevices(req, res) {
  const rows = await deviceModel.listByUser(req.user.id)
  res.json({ devices: rows.map(serializeDevice) })
}

/** PUT /api/users/me/password — requiere la contraseña actual. Devuelve un token nuevo. */
export async function changePassword(req, res) {
  const { data, errors } = validatePasswordChange(req.body)
  if (errors) throw AppError.validation(errors)
  const { token, user } = await authService.changePassword(req.user.id, data)
  res.json({ message: 'Tu contraseña se actualizó. Cerramos las sesiones abiertas en otros dispositivos.', token, user })
}

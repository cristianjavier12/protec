import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { withTransaction } from '../config/db.js'
import { emailVerificationEnabled, env } from '../config/env.js'
import { emailVerificationModel, passwordResetModel } from '../models/passwordResetModel.js'
import { userModel } from '../models/userModel.js'
import { AppError } from '../utils/AppError.js'
import { serializeUser } from '../utils/serializers.js'
import { signSessionToken } from '../utils/tokens.js'
import { isEmail, normalizeEmail, passwordProblem } from '../utils/validators.js'
import { mailService } from './mailService.js'

export const SALT_ROUNDS = 12
// Hash de referencia para comparar cuando el correo no existe (evita revelar cuentas por tiempo de respuesta).
const DUMMY_HASH = bcrypt.hashSync('protec-dummy-password', SALT_ROUNDS)
const MAX_RESETS_PER_HOUR = 5

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

/** Lógica de negocio de autenticación y perfil. */
export const authService = {
  async register(data) {
    if (!data.aceptaTerminos) {
      throw AppError.validation({ aceptaTerminos: 'Debes aceptar los Términos y condiciones y el Aviso de privacidad.' })
    }
    if (await userModel.existsByEmail(data.correo)) {
      throw AppError.conflict('Ya existe una cuenta registrada con este correo.', {
        correo: 'Ya existe una cuenta registrada con este correo.',
      })
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    // El rol SIEMPRE es "usuario" en el registro público (nunca se toma del cliente).
    const id = await userModel.create({
      ...data,
      passwordHash,
      rol: 'usuario',
      correoVerificado: !emailVerificationEnabled,
      aceptoTerminos: true,
    })
    const user = await userModel.findById(id)
    let verificationRequired = emailVerificationEnabled
    if (emailVerificationEnabled) {
      const sent = await this.sendVerification(user)
      if (!sent) {
        await userModel.markEmailVerified(id)
        user.correo_verificado = 1
        verificationRequired = false
      }
    }
    return { user: serializeUser(user), verificationRequired }
  },

  /** Envía (o reenvía) el enlace para confirmar el correo. */
  async sendVerification(user) {
    const token = crypto.randomBytes(32).toString('hex')
    await withTransaction(async (conn) => {
      await emailVerificationModel.invalidateForUser(user.id_usuario, conn)
      await emailVerificationModel.create({ userId: user.id_usuario, tokenHash: sha256(token), minutes: env.verifyTokenHours * 60 }, conn)
    })
    emailVerificationModel.purgeExpired().catch(() => {})
    const url = `${env.frontendUrl}/verificar-correo?token=${token}`
    return mailService.sendEmailVerification({ to: user.correo, nombre: user.nombre, url, hours: env.verifyTokenHours })
  },

  /** Reenvío del enlace de verificación si la cuenta existe y aún no está confirmada. */
  async resendVerification(rawEmail) {
    const correo = normalizeEmail(rawEmail)
    if (!isEmail(correo)) throw AppError.validation({ correo: 'Ingresa un correo válido.' })
    const user = await userModel.findByEmail(correo)
    if (!user || !user.estado) {
      throw AppError.notFound('No encontramos ninguna cuenta registrada con ese correo electrónico.')
    }
    if (user.correo_verificado) return
    if ((await emailVerificationModel.countRecent(user.id_usuario)) >= MAX_RESETS_PER_HOUR) return
    await this.sendVerification(user)
  },

  /** Confirma el correo con un enlace vigente de un solo uso. */
  async verifyEmail(token) {
    const invalid = AppError.badRequest('El enlace de verificación no es válido o ya venció. Solicita uno nuevo.')
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalid
    await withTransaction(async (conn) => {
      const row = await emailVerificationModel.findValid(sha256(token), conn)
      if (!row || !(await emailVerificationModel.markUsed(row.id, conn))) throw invalid
      await emailVerificationModel.invalidateForUser(row.id_usuario, conn)
      await userModel.markEmailVerified(row.id_usuario, conn)
    })
  },

  async login({ correo, password }) {
    const row = await userModel.findByEmailWithPassword(correo)
    // Mismo mensaje para correo inexistente o contraseña incorrecta (no revela cuentas).
    const invalid = AppError.unauthorized('Correo o contraseña incorrectos.')
    if (!row) {
      await bcrypt.compare(password, DUMMY_HASH) // tiempo de respuesta similar
      throw invalid
    }
    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) throw invalid
    if (!row.estado) throw AppError.forbidden('Tu cuenta está desactivada. Contacta a soporte para más información.')
    if (emailVerificationEnabled && !row.correo_verificado) {
      throw new AppError('Confirma tu correo para iniciar sesión. Revisa tu bandeja de entrada (y spam).', 403, { code: 'EMAIL_NOT_VERIFIED' })
    }

    return { token: signSessionToken(row), user: serializeUser(row) }
  },

  async getProfile(userId) {
    const row = await userModel.findById(userId)
    if (!row) throw AppError.notFound('No encontramos tu cuenta.')
    return serializeUser(row)
  },

  async updateProfile(userId, data) {
    const current = await userModel.findByIdWithPassword(userId)
    if (!current) throw AppError.notFound('No encontramos tu cuenta.')

    const nextEmail = data.correo !== undefined ? normalizeEmail(data.correo) : normalizeEmail(current.correo)
    const emailChanged = nextEmail !== normalizeEmail(current.correo)

    if (emailChanged) {
      if (!data.passwordActual) {
        throw AppError.validation(
          { passwordActual: 'Ingresa tu contraseña actual para modificar tu correo.' },
          'Ingresa tu contraseña actual para modificar tu correo.',
        )
      }
      const ok = await bcrypt.compare(data.passwordActual, current.password_hash)
      if (!ok) {
        throw AppError.validation(
          { passwordActual: 'La contraseña actual no es correcta.' },
          'La contraseña actual no es correcta.',
        )
      }
      const existing = await userModel.findByEmail(nextEmail)
      if (existing && existing.id_usuario !== userId) {
        throw AppError.conflict('Ya existe una cuenta registrada con este correo.', {
          correo: 'Ya existe una cuenta registrada con este correo.',
        })
      }
    }

    const row = await userModel.updateProfile(userId, { ...data, correo: nextEmail, emailChanged })
    return {
      user: serializeUser(row),
      token: emailChanged ? signSessionToken(row) : undefined,
      emailChanged,
    }
  },

  /**
   * Cambio de contraseña desde el perfil: exige la contraseña actual.
   * Cierra las demás sesiones y devuelve un token nuevo para la sesión actual.
   */
  async changePassword(userId, { actual, nueva }) {
    const row = await userModel.findByIdWithPassword(userId)
    if (!row) throw AppError.notFound('No encontramos tu cuenta.')
    if (!(await bcrypt.compare(actual, row.password_hash))) {
      throw AppError.validation({ actual: 'La contraseña actual no es correcta.' }, 'La contraseña actual no es correcta.')
    }
    const updated = await userModel.updatePassword(userId, await bcrypt.hash(nueva, SALT_ROUNDS))
    mailService.sendPasswordChanged({ to: updated.correo, nombre: updated.nombre }).catch(() => {})
    return { token: signSessionToken(updated), user: serializeUser(updated) }
  },

  /**
   * Solicitud de recuperación. Verifica que exista una cuenta activa con ese correo
   * antes de generar y enviar el enlace (que vence en RESET_TOKEN_MINUTES).
   */
  async requestPasswordReset(rawEmail) {
    const correo = normalizeEmail(rawEmail)
    if (!isEmail(correo)) throw AppError.validation({ correo: 'Ingresa un correo válido.' })

    const user = await userModel.findByEmail(correo)
    if (!user || !user.estado) {
      throw AppError.notFound('No encontramos ninguna cuenta registrada con ese correo electrónico.')
    }
    if ((await passwordResetModel.countRecent(user.id_usuario)) >= MAX_RESETS_PER_HOUR) {
      throw AppError.tooMany('Ya solicitaste varios enlaces recientemente. Espera unos minutos antes de intentarlo de nuevo.')
    }

    const token = crypto.randomBytes(32).toString('hex')
    await withTransaction(async (conn) => {
      await passwordResetModel.invalidateForUser(user.id_usuario, conn)
      await passwordResetModel.create({ userId: user.id_usuario, tokenHash: sha256(token), minutes: env.resetTokenMinutes }, conn)
    })
    passwordResetModel.purgeExpired().catch(() => {})

    const url = `${env.frontendUrl}/restablecer-contrasena?token=${token}`
    await mailService.sendPasswordReset({ to: user.correo, nombre: user.nombre, url, minutes: env.resetTokenMinutes })
  },

  /** ¿El enlace sigue siendo válido? (para mostrar el formulario o un aviso de enlace vencido). */
  async validateResetToken(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false
    return Boolean(await passwordResetModel.findValid(sha256(token)))
  },

  /** Restablece la contraseña con un enlace vigente de un solo uso. */
  async resetPassword({ token, password, confirmacion }) {
    const problem = passwordProblem(password)
    if (problem) throw AppError.validation({ password: problem })
    if (confirmacion !== undefined && confirmacion !== password) throw AppError.validation({ confirmacion: 'Las contraseñas no coinciden.' })

    const expired = AppError.badRequest('El enlace no es válido o ya venció. Solicita uno nuevo.')
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw expired

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await withTransaction(async (conn) => {
      const reset = await passwordResetModel.findValid(sha256(token), conn)
      if (!reset || !(await passwordResetModel.markUsed(reset.id_reset, conn))) throw expired
      await passwordResetModel.invalidateForUser(reset.id_usuario, conn)
      // Quien recibió el enlace en su correo también demostró que el correo es suyo.
      await userModel.markEmailVerified(reset.id_usuario, conn)
      return userModel.updatePassword(reset.id_usuario, passwordHash, conn)
    })
    mailService.sendPasswordChanged({ to: user.correo, nombre: user.nombre }).catch(() => {})
  },
}

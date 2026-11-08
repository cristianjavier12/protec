import bcrypt from 'bcrypt'
import { query, withTransaction } from '../config/db.js'
import { technicianModel } from '../models/technicianModel.js'
import { userModel } from '../models/userModel.js'
import { AppError } from '../utils/AppError.js'
import { FINISHED_STATUSES, ROLES, SPECIALTY_DEVICES } from '../utils/constants.js'
import { serializeUser } from '../utils/serializers.js'
import { FOLIO_RE, normalizeFolio, validateRegisterInput } from '../utils/validators.js'
import { SALT_ROUNDS } from './authService.js'
import { mailService } from './mailService.js'
import { emitToUsers, notify } from './notificationService.js'
import { storageService } from './storageService.js'

/**
 * Gestión administrativa de cuentas y folios.
 * Reglas de seguridad:
 *  - El administrador no puede eliminarse ni cambiar su propio rol.
 *  - Siempre debe quedar al menos un administrador activo.
 *  - Un técnico con solicitudes activas no se elimina ni se degrada: primero se reasignan.
 */

const ACTIVE_FILTER = `estado NOT IN (${FINISHED_STATUSES.map(() => '?').join(', ')})`

async function activeAssignedCount(techUserId, conn) {
  const [row] = await query(`SELECT COUNT(*) AS total FROM solicitudes WHERE id_tecnico = ? AND ${ACTIVE_FILTER}`, [techUserId, ...FINISHED_STATUSES], conn)
  return Number(row?.total ?? 0)
}

function parseSpecialty(value) {
  if (!Object.hasOwn(SPECIALTY_DEVICES, value)) throw AppError.validation({ especialidad: 'Selecciona una especialidad válida.' })
  return value
}

/** Borra físicamente las imágenes de evidencias (Cloudinary o disco) después de confirmar la transacción. */
async function purgeEvidenceFiles(publicIds) {
  await Promise.allSettled(publicIds.filter((id) => id && !id.startsWith('seed/')).map((id) => storageService.removeEvidence(id)))
}

async function evidenceIdsFor(whereSql, params, conn) {
  const rows = await query(`SELECT e.public_id_cloudinary AS pid FROM evidencias e JOIN solicitudes s ON s.id_solicitud = e.id_solicitud WHERE ${whereSql}`, params, conn)
  return rows.map((r) => r.pid)
}

export const adminService = {
  /** Crea cuentas de técnico, administrador o cliente con una contraseña temporal. */
  async createAccount(admin, body) {
    const rol = [ROLES.TECHNICIAN, ROLES.ADMIN, ROLES.USER].includes(body.rol) ? body.rol : null
    if (!rol) throw AppError.validation({ rol: 'Selecciona el tipo de cuenta.' })
    const { data, errors } = validateRegisterInput(body)
    if (errors) throw AppError.validation(errors)
    const especialidad = rol === ROLES.TECHNICIAN ? parseSpecialty(body.especialidad ?? 'general') : null
    if (await userModel.existsByEmail(data.correo)) {
      throw AppError.conflict('Ya existe una cuenta con este correo.', { correo: 'Ya existe una cuenta con este correo.' })
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    const id = await withTransaction(async (conn) => {
      const userId = await userModel.create({ ...data, passwordHash, rol, correoVerificado: true }, conn)
      if (especialidad) await technicianModel.create({ userId, especialidad }, conn)
      return userId
    })
    mailService.sendAccountCreated({ to: data.correo, nombre: data.nombre, rol }).catch(() => {})
    console.log(`[admin] ${admin.correo} creó la cuenta ${data.correo} (${rol}).`)
    return serializeUser(await userModel.findById(id))
  },

  /**
   * Cambia el rol de una cuenta (por ejemplo, convertir un cliente en técnico).
   * Las sesiones abiertas del usuario se cierran para que entre con sus nuevos permisos.
   */
  async changeRole(admin, userId, body) {
    const target = await userModel.findById(Number(userId))
    if (!target) throw AppError.notFound('No encontramos esa cuenta.')
    if (target.id_usuario === admin.id) throw AppError.conflict('No puedes cambiar el rol de tu propia cuenta.')
    const rol = [ROLES.TECHNICIAN, ROLES.ADMIN, ROLES.USER].includes(body.rol) ? body.rol : null
    if (!rol) throw AppError.validation({ rol: 'Selecciona un rol válido.' })
    if (rol === target.rol) throw AppError.conflict('La cuenta ya tiene ese rol.')
    const especialidad = rol === ROLES.TECHNICIAN ? parseSpecialty(body.especialidad ?? 'general') : null

    await withTransaction(async (conn) => {
      if (target.rol === ROLES.ADMIN && (await userModel.countAdmins(conn)) <= 1) {
        throw AppError.conflict('Debe existir al menos un administrador activo.')
      }
      if (target.rol === ROLES.TECHNICIAN) {
        const active = await activeAssignedCount(target.id_usuario, conn)
        if (active) throw AppError.conflict(`Este técnico tiene ${active} solicitud(es) activa(s). Reasígnalas antes de cambiar su rol.`)
        await query('UPDATE tecnicos SET estado = 0, disponible = 0 WHERE id_usuario = ?', [target.id_usuario], conn)
      }
      await userModel.updateRole(target.id_usuario, rol, conn)
      if (rol === ROLES.TECHNICIAN) {
        const profile = await technicianModel.findByUserId(target.id_usuario, conn)
        if (profile) await query('UPDATE tecnicos SET estado = 1, disponible = 1, especialidad = ? WHERE id_usuario = ?', [especialidad, target.id_usuario], conn)
        else await technicianModel.create({ userId: target.id_usuario, especialidad }, conn)
      }
    })

    const label = rol === ROLES.TECHNICIAN ? 'técnico' : rol === ROLES.ADMIN ? 'administrador' : 'cliente'
    await notify({ userId: target.id_usuario, tipo: 'sistema', titulo: 'Tu cuenta cambió de tipo', mensaje: `Ahora tu cuenta es de ${label}. Vuelve a iniciar sesión para ver tus nuevas opciones.` })
    emitToUsers([target.id_usuario], 'session:revoked', { reason: 'role' })
    console.log(`[admin] ${admin.correo} cambió el rol de ${target.correo}: ${target.rol} -> ${rol}.`)
    return serializeUser(await userModel.findById(target.id_usuario))
  },

  /**
   * Elimina una cuenta.
   *  - Cliente: se eliminan también sus solicitudes (con fotografías, pagos, chat e historial).
   *  - Técnico: solo si no tiene solicitudes activas; sus trabajos terminados conservan el historial.
   *  - Administrador: nunca la propia ni la última cuenta de administrador.
   */
  async deleteUser(admin, userId) {
    const target = await userModel.findById(Number(userId))
    if (!target) throw AppError.notFound('No encontramos esa cuenta.')
    if (target.id_usuario === admin.id) throw AppError.conflict('No puedes eliminar tu propia cuenta.')

    let publicIds = []
    let removedRepairs = 0
    await withTransaction(async (conn) => {
      if (target.rol === ROLES.ADMIN && (await userModel.countAdmins(conn)) <= 1) {
        throw AppError.conflict('Debe existir al menos un administrador activo.')
      }
      if (target.rol === ROLES.TECHNICIAN) {
        const active = await activeAssignedCount(target.id_usuario, conn)
        if (active) throw AppError.conflict(`Este técnico tiene ${active} solicitud(es) activa(s). Reasígnalas antes de eliminar la cuenta.`)
      }
      // Solicitudes propias (como cliente): se eliminan antes que la cuenta para respetar las llaves foráneas.
      publicIds = await evidenceIdsFor('s.id_usuario = ?', [target.id_usuario], conn)
      await query('DELETE n FROM notificaciones n JOIN solicitudes s ON s.id_solicitud = n.id_solicitud WHERE s.id_usuario = ?', [target.id_usuario], conn)
      const result = await query('DELETE FROM solicitudes WHERE id_usuario = ?', [target.id_usuario], conn)
      removedRepairs = result.affectedRows
      await userModel.remove(target.id_usuario, conn)
    })

    await purgeEvidenceFiles(publicIds)
    emitToUsers([target.id_usuario], 'session:revoked', { reason: 'deleted' })
    console.log(`[admin] ${admin.correo} eliminó la cuenta ${target.correo} (${target.rol}) y ${removedRepairs} solicitud(es).`)
    return { removedRepairs }
  },

  /** Elimina un folio con todo su contenido (fotografías, pagos, chat, historial...). */
  async deleteRepair(admin, rawFolio) {
    const folio = normalizeFolio(rawFolio)
    if (!FOLIO_RE.test(folio)) throw AppError.notFound('No encontramos una solicitud con ese folio.')
    const [repair] = await query('SELECT id_solicitud, id_usuario, id_tecnico, folio FROM solicitudes WHERE folio = ?', [folio])
    if (!repair) throw AppError.notFound('No encontramos una solicitud con ese folio.')

    let publicIds = []
    await withTransaction(async (conn) => {
      publicIds = await evidenceIdsFor('s.id_solicitud = ?', [repair.id_solicitud], conn)
      await query('DELETE FROM notificaciones WHERE id_solicitud = ?', [repair.id_solicitud], conn)
      await query('DELETE FROM solicitudes WHERE id_solicitud = ?', [repair.id_solicitud], conn)
      if (repair.id_tecnico) await technicianModel.recalculateRating(repair.id_tecnico, conn)
    })

    await purgeEvidenceFiles(publicIds)
    await notify({ userId: repair.id_usuario, tipo: 'sistema', titulo: 'Solicitud eliminada', mensaje: `La solicitud ${folio} fue eliminada por administración. Si tienes dudas, contacta a soporte.` })
    if (repair.id_tecnico) {
      await notify({ userId: repair.id_tecnico, tipo: 'sistema', titulo: 'Solicitud eliminada', mensaje: `La solicitud ${folio} fue eliminada por administración.` })
    }
    emitToUsers([repair.id_usuario, repair.id_tecnico], 'repair:updated', { folio, repairId: repair.id_solicitud, deleted: true })
    console.log(`[admin] ${admin.correo} eliminó la solicitud ${folio}.`)
    return { folio }
  },
}

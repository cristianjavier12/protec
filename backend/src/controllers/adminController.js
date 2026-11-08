import { query, withTransaction } from '../config/db.js'
import { paymentModel } from '../models/paymentModel.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { technicianModel } from '../models/technicianModel.js'
import { labelSpecialty, notifyAssignment } from '../services/assignmentService.js'
import { adminService } from '../services/adminService.js'
import { emitRepairUpdated, notify } from '../services/notificationService.js'
import { registerManualPayment } from '../services/workflowService.js'
import { AppError } from '../utils/AppError.js'
import { ALLOWED_STATUSES, DEVICE_TYPES, REPAIR_STATUS as S, SPECIALTY_DEVICES, STATUS_PROGRESS, isFinishedStatus } from '../utils/constants.js'
import { iso, serializePayment } from '../utils/serializers.js'
import { FOLIO_RE, normalizeFolio } from '../utils/validators.js'

/* ===== Dashboard ===== */

export async function getDashboard(_req, res) {
  const [stats, revenue, techs, [users], byStatus, byDevice] = await Promise.all([
    repairModel.globalStats(),
    paymentModel.revenueSummary(),
    technicianModel.listAll(),
    query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'usuario'"),
    repairModel.statusBreakdown(),
    repairModel.deviceBreakdown(),
  ])
  res.json({
    stats: {
      solicitudesTotales: stats.total,
      activas: stats.activas,
      enReparacion: stats.enReparacion,
      terminadas: stats.terminadas,
      pendientesTecnico: stats.pendientesTecnico,
      usuariosRegistrados: Number(users.total),
      tecnicos: techs.length,
      tecnicosDisponibles: techs.filter((t) => t.estado && t.disponible).length,
    },
    ingresos: revenue,
    porEstado: byStatus.map((s) => ({ estado: s.estado, total: Number(s.total) })),
    porDispositivo: byDevice.map((d) => ({ tipo: d.tipo, total: Number(d.total) })),
  })
}

/* ===== Técnicos ===== */

const serializeTech = (t) => ({
  id: t.id_tecnico,
  userId: t.id_usuario,
  nombre: `${t.nombre} ${t.apellidos}`.trim(),
  correo: t.correo,
  especialidad: t.especialidad,
  especialidadLabel: labelSpecialty(t.especialidad),
  activo: Boolean(t.estado),
  disponible: Boolean(t.disponible),
  calificacion: Number(t.calificacion),
  serviciosTerminados: Number(t.servicios_terminados),
  reparacionesActivas: Number(t.reparaciones_activas ?? 0),
})

export async function listTechnicians(_req, res) {
  res.json({ technicians: (await technicianModel.listAll()).map(serializeTech) })
}

export async function updateTechnician(req, res) {
  const techId = Number(req.params.id)
  const [tech] = await query('SELECT * FROM tecnicos WHERE id_tecnico = ?', [techId])
  if (!tech) throw AppError.notFound('No encontramos ese técnico.')
  const { activo, disponible, especialidad } = req.body ?? {}
  if (activo !== undefined) await technicianModel.updateStatus(techId, activo === true)
  if (disponible !== undefined) await technicianModel.updateAvailability(tech.id_usuario, disponible === true)
  if (especialidad !== undefined) {
    if (!Object.hasOwn(SPECIALTY_DEVICES, especialidad)) throw AppError.validation({ especialidad: 'Especialidad no válida.' })
    await technicianModel.updateSpecialty(techId, especialidad)
  }
  const updated = (await technicianModel.listAll()).find((t) => t.id_tecnico === techId)
  res.json({ message: 'Técnico actualizado.', technician: serializeTech(updated) })
}

/* ===== Solicitudes ===== */

export async function listRepairs(req, res) {
  const q = req.query
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const { rows, total } = await repairModel.listAll({
    estado: ALLOWED_STATUSES.includes(q.estado) ? q.estado : null,
    tecnico: q.tecnico === 'none' ? 'none' : Number(q.tecnico) || null,
    tipoDispositivo: DEVICE_TYPES.includes(q.tipoDispositivo) ? q.tipoDispositivo : null,
    desde: isDate(q.desde) ? q.desde : null,
    hasta: isDate(q.hasta) ? q.hasta : null,
    search: typeof q.search === 'string' ? q.search.trim().toUpperCase().slice(0, 20) : '',
    limit: Math.min(Number(q.limit) || 50, 100),
    offset: Math.max(Number(q.offset) || 0, 0),
  })
  res.json({
    total,
    repairs: rows.map((r) => ({
      folio: r.folio,
      estado: r.estado,
      progreso: STATUS_PROGRESS[r.estado] ?? 0,
      terminada: isFinishedStatus(r.estado),
      prioridad: r.prioridad,
      categoria: r.categoria,
      cliente: `${r.cliente_nombre} ${r.cliente_apellidos}`.trim(),
      tecnico: r.id_tecnico ? { id: r.id_tecnico, nombre: `${r.tecnico_nombre} ${r.tecnico_apellidos}`.trim() } : null,
      dispositivo: { tipo: r.dispositivo_tipo, marca: r.dispositivo_marca, modelo: r.dispositivo_modelo },
      fechaCreacion: iso(r.fecha_creacion),
      fechaActualizacion: iso(r.fecha_actualizacion),
    })),
  })
}

/**
 * Asignación manual. Si la solicitud está "Pendiente de técnico" pasa a "Técnico asignado";
 * en cualquier otra etapa activa solo cambia el responsable. Siempre deja rastro en el historial.
 */
export async function assignTech(req, res) {
  const folio = normalizeFolio(req.params.folio)
  if (!FOLIO_RE.test(folio)) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  const repair = await repairModel.findByFolio(folio)
  if (!repair) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  if (isFinishedStatus(repair.estado)) throw AppError.conflict('La solicitud ya está finalizada.')
  if (!repair.requiere_tecnico && repair.estado !== S.PENDING_TECH && !repair.id_tecnico) {
    throw AppError.conflict('La solicitud aún no requiere técnico (falta el diagnóstico inicial).')
  }

  const techUserId = Number(req.body?.technicianUserId)
  const [tech] = await query(
    `SELECT t.*, u.nombre, u.apellidos FROM tecnicos t JOIN usuarios u ON u.id_usuario = t.id_usuario
      WHERE t.id_usuario = ? AND t.estado = 1 AND u.estado = 1`,
    [techUserId],
  )
  if (!tech) throw AppError.validation({ technicianUserId: 'Selecciona un técnico activo.' })
  if (repair.id_tecnico === tech.id_usuario) throw AppError.conflict('Ese técnico ya está asignado.')

  const firstAssignment = repair.estado === S.PENDING_TECH
  await withTransaction(async (conn) => {
    if (firstAssignment) {
      await query('UPDATE solicitudes SET id_tecnico = ?, estado = ? WHERE id_solicitud = ?', [tech.id_usuario, S.TECH_ASSIGNED, repair.id_solicitud], conn)
      await statusHistoryModel.add(repair.id_solicitud, S.TECH_ASSIGNED, `Asignación manual: ${tech.nombre} ${tech.apellidos} (${labelSpecialty(tech.especialidad)}).`, conn)
    } else {
      await query('UPDATE solicitudes SET id_tecnico = ? WHERE id_solicitud = ?', [tech.id_usuario, repair.id_solicitud], conn)
      await statusHistoryModel.add(repair.id_solicitud, 'Técnico reasignado', `Ahora atiende ${tech.nombre} ${tech.apellidos}.`, conn)
    }
  })

  if (repair.id_tecnico && !firstAssignment) {
    await notify({ userId: repair.id_tecnico, repairId: repair.id_solicitud, folio, tipo: 'sistema', titulo: 'Solicitud reasignada', mensaje: `La solicitud ${folio} fue reasignada a otro técnico.` })
  }
  await notifyAssignment(repair, tech)
  emitRepairUpdated({ ...repair, id_tecnico: tech.id_usuario })
  res.json({ message: 'Técnico asignado.' })
}

/* ===== Usuarios ===== */

export async function listUsers(_req, res) {
  const rows = await query(
    `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.telefono, u.rol, u.estado, u.correo_verificado, u.fecha_registro,
            t.especialidad,
            (SELECT COUNT(*) FROM solicitudes s WHERE s.id_usuario = u.id_usuario) AS solicitudes,
            (SELECT COUNT(*) FROM solicitudes s WHERE s.id_tecnico = u.id_usuario
               AND s.estado NOT IN ('Finalizado','Resuelto mediante diagnóstico','Presupuesto rechazado')) AS asignadas_activas
       FROM usuarios u
       LEFT JOIN tecnicos t ON t.id_usuario = u.id_usuario
      ORDER BY u.fecha_registro DESC LIMIT 500`,
  )
  res.json({
    users: rows.map((u) => ({
      id: u.id_usuario,
      nombre: `${u.nombre} ${u.apellidos}`.trim(),
      correo: u.correo,
      telefono: u.telefono,
      rol: u.rol,
      especialidad: u.rol === 'tecnico' ? u.especialidad : null,
      activo: Boolean(u.estado),
      verificado: Boolean(u.correo_verificado),
      solicitudes: Number(u.solicitudes),
      asignadasActivas: Number(u.asignadas_activas),
      fechaRegistro: iso(u.fecha_registro),
    })),
  })
}

export async function createUser(req, res) {
  const user = await adminService.createAccount(req.user, req.body ?? {})
  res.status(201).json({ message: 'Cuenta creada.', user })
}

export async function changeUserRole(req, res) {
  const user = await adminService.changeRole(req.user, req.params.id, req.body ?? {})
  res.json({ message: 'Rol actualizado. La persona deberá iniciar sesión de nuevo.', user })
}

export async function deleteUser(req, res) {
  const result = await adminService.deleteUser(req.user, req.params.id)
  res.json({ message: 'Cuenta eliminada.', ...result })
}

export async function deleteRepair(req, res) {
  const result = await adminService.deleteRepair(req.user, req.params.folio)
  res.json({ message: `Solicitud ${result.folio} eliminada.`, ...result })
}

/** Pago recibido en el centro de servicio (efectivo o transferencia). */
export async function registerPayment(req, res) {
  const repair = await registerManualPayment(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: 'Pago registrado.', repair })
}

/* ===== Pagos ===== */

export async function listPayments(_req, res) {
  const [rows, ingresos] = await Promise.all([paymentModel.listAll({ limit: 100 }), paymentModel.revenueSummary()])
  res.json({ payments: rows.map(serializePayment), ingresos })
}

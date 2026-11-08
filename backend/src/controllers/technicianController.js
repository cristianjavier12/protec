import { repairModel } from '../models/repairModel.js'
import { technicianModel } from '../models/technicianModel.js'
import * as workflow from '../services/workflowService.js'
import { REPAIR_STATUS as S, STATUS_PROGRESS } from '../utils/constants.js'
import { iso } from '../utils/serializers.js'

/** Grupos de estados para tarjetas y filtros del panel del técnico. */
const GROUPS = {
  pending: [S.TECH_ASSIGNED, S.BUDGET_REJECTED, S.PENDING_DEPOSIT, S.READY_TO_RECEIVE, S.PICKUP_PENDING, S.PICKUP_SCHEDULED, S.DEVICE_RECEIVED],
  in_review: [S.IN_REVIEW],
  in_repair: [S.IN_REPAIR, S.WAITING_PART],
  finished: [S.REPAIR_DONE, S.READY, S.DELIVERY_SCHEDULED, S.DELIVERY_IN_TRANSIT, S.FINISHED],
}

export async function getDashboard(req, res) {
  const filter = Object.hasOwn(GROUPS, req.query.filter) ? req.query.filter : null
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 40) : ''

  const [profile, counts, rows] = await Promise.all([
    technicianModel.findByUserId(req.user.id),
    repairModel.countByTechnicianGroups(req.user.id, {
      pendientes_diagnostico: [S.TECH_ASSIGNED, S.DEVICE_RECEIVED, S.IN_REVIEW],
      en_reparacion: GROUPS.in_repair,
      terminadas: GROUPS.finished,
    }),
    repairModel.listByTechnician(req.user.id, { statuses: filter ? GROUPS[filter] : null, search }),
  ])

  res.json({
    perfil: profile
      ? {
          especialidad: profile.especialidad,
          disponible: Boolean(profile.disponible),
          calificacion: Number(profile.calificacion),
          serviciosTerminados: Number(profile.servicios_terminados),
        }
      : null,
    stats: {
      asignadas: counts.total ?? 0,
      pendientesDiagnostico: counts.pendientes_diagnostico ?? 0,
      enReparacion: counts.en_reparacion ?? 0,
      terminadas: counts.terminadas ?? 0,
    },
    repairs: rows.map((r) => ({
      folio: r.folio,
      estado: r.estado,
      progreso: STATUS_PROGRESS[r.estado] ?? 0,
      prioridad: r.prioridad,
      categoria: r.categoria,
      descripcion: r.descripcion_problema,
      cliente: `${r.cliente_nombre} ${r.cliente_apellidos}`.trim(),
      dispositivo: { tipo: r.dispositivo_tipo, marca: r.dispositivo_marca, modelo: r.dispositivo_modelo },
      evidenciasTotal: Number(r.evidencias_total ?? 0),
      fechaAsignacion: iso(r.fecha_asignacion),
      fechaCreacion: iso(r.fecha_creacion),
      fechaActualizacion: iso(r.fecha_actualizacion),
      transiciones: workflow.techTransitions(r),
    })),
  })
}

export async function getRepairDetail(req, res) {
  res.json({ repair: await workflow.getTechnicianDetail(req.user, req.params.folio) })
}

export async function saveDiagnosis(req, res) {
  const repair = await workflow.saveTechnicalDiagnosis(req.user, req.params.folio, req.body ?? {})
  res.json({ message: 'Diagnóstico técnico guardado.', repair })
}

export async function createBudget(req, res) {
  const repair = await workflow.createBudget(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: 'Presupuesto enviado al cliente.', repair })
}

export async function updateStatus(req, res) {
  const repair = await workflow.updateStatusByTechnician(req.user, req.params.folio, req.body ?? {})
  res.json({ message: 'Estado actualizado.', repair })
}

export async function addEvidences(req, res) {
  const repair = await workflow.addTechnicianEvidences(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: 'Evidencias registradas.', repair })
}

export async function addPart(req, res) {
  const repair = await workflow.addPart(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: 'Pieza registrada.', repair })
}

export async function removePart(req, res) {
  const repair = await workflow.removePart(req.user, req.params.folio, req.params.partId)
  res.json({ message: 'Pieza eliminada.', repair })
}

export async function updateLogisticsStatus(req, res) {
  const repair = await workflow.advanceLogistics(req.user, req.params.folio, req.params.logId, req.body ?? {})
  res.json({ message: 'Logística actualizada.', repair })
}

export async function toggleAvailability(req, res) {
  const disponible = req.body?.disponible === true
  await technicianModel.updateAvailability(req.user.id, disponible)
  res.json({ message: disponible ? 'Ahora estás disponible.' : 'Marcado como ocupado.', disponible })
}

import { query, withTransaction } from '../config/db.js'
import { env, stripeEnabled } from '../config/env.js'
import { stripe } from '../config/stripe.js'
import { budgetModel } from '../models/budgetModel.js'
import { diagnosisModel } from '../models/diagnosisModel.js'
import { evidenceModel } from '../models/evidenceModel.js'
import { logisticsModel } from '../models/logisticsModel.js'
import { partModel } from '../models/partModel.js'
import { paymentModel } from '../models/paymentModel.js'
import { ratingModel } from '../models/ratingModel.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { technicianModel } from '../models/technicianModel.js'
import { userModel } from '../models/userModel.js'
import { AppError } from '../utils/AppError.js'
import {
  BUDGET_STATUSES,
  EVIDENCE_TYPES,
  LOGISTICS_FLOW,
  REPAIR_STATUS as S,
  SCHEDULE_SLOTS,
  TECH_TRANSITIONS,
  WORKSHOP_STATUSES,
  isFinishedStatus,
} from '../utils/constants.js'
import {
  serializeBudget,
  serializeDiagnosis,
  serializeLogistics,
  serializePart,
  serializePayment,
  serializeRating,
  serializeRepairDetail,
  serializeTechnicianPublic,
} from '../utils/serializers.js'
import { FOLIO_RE, normalizeFolio } from '../utils/validators.js'
import { emitRepairUpdated, notify } from './notificationService.js'
import { findAuthorizedRepair, resolveEvidenceTokens } from './repairService.js'

/**
 * Flujo completo de reparación.
 * Toda regla de negocio del ciclo de vida vive aquí; los controladores solo validan
 * la forma de la petición y delegan. Cada cambio:
 *   1) se valida contra el estado actual (sin saltos incoherentes),
 *   2) se guarda en una transacción con su entrada en historial_estados,
 *   3) genera notificación + evento en tiempo real.
 */

/* ======================= utilidades ======================= */

const NOW = Symbol('NOW')
const round2 = (n) => Math.round(Number(n) * 100) / 100
const mxn = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const MAX_AMOUNT = 999999

function parseAmount(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw AppError.validation({ [field]: 'Ingresa un monto.' })
    return 0
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
    throw AppError.validation({ [field]: 'Ingresa un monto válido entre 0 y 999,999.' })
  }
  return round2(n)
}

function parseFutureDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw AppError.validation({ [field]: 'Selecciona una fecha válida.' })
  }
  const today = new Date()
  const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  if (value < todayStr) throw AppError.validation({ [field]: 'La fecha no puede ser anterior a hoy.' })
  return value
}

function parseAddress(body) {
  const direccion = text(body.direccion, 300)
  if (direccion.length < 10) throw AppError.validation({ direccion: 'Escribe la dirección completa (calle, número, colonia).' })
  const horario = text(body.horario, 60)
  if (!SCHEDULE_SLOTS.includes(horario)) throw AppError.validation({ horario: 'Selecciona un horario disponible.' })
  return {
    direccion,
    referencias: text(body.referencias, 255) || null,
    fechaProgramada: parseFutureDate(body.fechaPreferida, 'fechaPreferida'),
    horario,
  }
}

/** Cambia el estado de la solicitud y registra el historial (dentro de la transacción recibida). */
async function setStatus(repairId, estado, descripcion, extra = {}, conn) {
  const sets = ['estado = ?']
  const params = [estado]
  for (const [column, value] of Object.entries(extra)) {
    // Las columnas provienen de este módulo, nunca del cliente.
    if (value === NOW) sets.push(`${column} = NOW()`)
    else {
      sets.push(`${column} = ?`)
      params.push(value)
    }
  }
  params.push(repairId)
  await query(`UPDATE solicitudes SET ${sets.join(', ')} WHERE id_solicitud = ?`, params, conn)
  await statusHistoryModel.add(repairId, estado, descripcion ? String(descripcion).slice(0, 500) : null, conn)
}

/** Registra un evento en el historial sin cambiar el estado (diagnóstico, presupuesto, piezas...). */
const addEvent = (repairId, label, descripcion, conn) =>
  statusHistoryModel.add(repairId, label, descripcion ? String(descripcion).slice(0, 500) : null, conn)

/** Re-lee la solicitud con bloqueo y verifica que siga en uno de los estados esperados. */
async function assertLockedStatus(repairId, expected, conn) {
  const locked = await repairModel.lockForUpdate(repairId, conn)
  const list = Array.isArray(expected) ? expected : [expected]
  if (!locked || !list.includes(locked.estado)) {
    throw AppError.conflict('La solicitud cambió de estado. Actualiza la página e inténtalo de nuevo.')
  }
  return locked
}

async function afterChange(repairId, notifications = []) {
  const fresh = await repairModel.findById(repairId)
  for (const n of notifications) {
    await notify({ repairId, folio: fresh?.folio, ...n })
  }
  emitRepairUpdated(fresh)
  return fresh
}

function paymentSummary(budget, pagos) {
  const accepted = budget?.estado === 'Aceptado'
  const paid = pagos.filter((p) => p.estado === 'pagado')
  const sum = (tipo) => round2(paid.filter((p) => p.tipo === tipo).reduce((acc, p) => acc + Number(p.monto), 0))
  const anticipoPagado = sum('anticipo')
  const pagoFinalPagado = sum('pago_final')
  const totalPagado = round2(anticipoPagado + pagoFinalPagado)
  const costoTotal = accepted ? Number(budget.costo_total) : 0
  return {
    costoTotal,
    anticipoRequerido: accepted ? Number(budget.anticipo_requerido) : 0,
    anticipoPagado,
    pagoFinalPagado,
    totalPagado,
    saldoPendiente: accepted ? Math.max(0, round2(costoTotal - totalPagado)) : 0,
  }
}

/* ======================= detalle ======================= */

async function loadBundle(row) {
  const id = row.id_solicitud
  const [evidencias, historial, diagChatbot, diagTecnico, budget, piezas, logistica, pagos, rating, techProfile] = await Promise.all([
    evidenceModel.listByRepair(id),
    statusHistoryModel.listByRepair(id),
    diagnosisModel.findLatest(id, 'chatbot'),
    diagnosisModel.findLatest(id, 'tecnico'),
    budgetModel.findByRepair(id),
    partModel.listByRepair(id),
    logisticsModel.listByRepair(id),
    paymentModel.listByRepair(id),
    ratingModel.findByRepair(id),
    row.id_tecnico ? technicianModel.getPublicProfile(row.id_tecnico) : null,
  ])
  return { evidencias, historial, diagChatbot, diagTecnico, budget, piezas, logistica, pagos, rating, techProfile }
}

function userActions(row, { budget, resumen, rating, isOwner }) {
  const e = row.estado
  return {
    respondBudget: isOwner && budget?.estado === 'Pendiente',
    payDeposit: isOwner && e === S.PENDING_DEPOSIT && budget?.estado === 'Aceptado' && resumen.anticipoPagado === 0,
    schedulePickup: isOwner && e === S.PICKUP_PENDING,
    payFinal: isOwner && e === S.REPAIR_DONE && resumen.anticipoPagado > 0 && resumen.saldoPendiente > 0,
    chooseDelivery: isOwner && e === S.READY && !row.metodo_entrega,
    rate: isOwner && e === S.FINISHED && Boolean(row.id_tecnico) && !rating,
    chat: Boolean(row.id_tecnico),
    chatReadOnly: isFinishedStatus(e),
    searchingTechnician: e === S.PENDING_TECH && !row.id_tecnico,
  }
}

/** Transiciones manuales disponibles para el técnico en el estado actual. */
export function techTransitions(row) {
  const next = TECH_TRANSITIONS[row.estado] ?? []
  if (row.estado === S.READY) return row.metodo_entrega === 'recoger' ? next : []
  return next
}

function techActions(row, { budget, logistica }) {
  const e = row.estado
  const nextLogistics = logistica
    .filter((l) => l.estado !== 'Cancelada')
    .map((l) => {
      const flow = LOGISTICS_FLOW[l.tipo] ?? []
      const idx = flow.indexOf(l.estado)
      return { id: l.id_logistica, tipo: l.tipo, next: idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null }
    })
    .filter((l) => l.next)

  const waiting = {
    [S.PENDING_TECH]: 'Confirma el folio para aceptar el caso y comenzar con el diagnóstico y presupuesto, o recházalo si no puedes atenderlo.',
    [S.PENDING_DEPOSIT]: 'Esperando que el cliente registre el anticipo del 50 %.',
    [S.PICKUP_PENDING]: 'Esperando que el cliente programe la recolección.',
    [S.BUDGET_REJECTED]: 'El cliente rechazó el presupuesto. Puedes enviar uno nuevo.',
    [S.REPAIR_DONE]: 'Esperando el pago del saldo pendiente.',
    [S.READY]: row.metodo_entrega ? null : 'Esperando que el cliente elija el método de entrega.',
  }[e]

  return {
    transitions: techTransitions(row),
    canConfirmFolio: e === S.PENDING_TECH || e === S.REGISTERED,
    canRejectFolio: e === S.PENDING_TECH || e === S.REGISTERED || (e === S.TECH_ASSIGNED && (!budget || budget.estado === 'Rechazado')),
    canDiagnose: WORKSHOP_STATUSES.includes(e) || e === S.BUDGET_REJECTED,
    canBudget: BUDGET_STATUSES.includes(e) && (!budget || budget.estado === 'Rechazado'),
    canWork: WORKSHOP_STATUSES.includes(e) || e === S.READY,
    logistics: nextLogistics,
    waitingFor: (budget?.estado === 'Pendiente' ? 'Esperando que el cliente responda el presupuesto.' : waiting) ?? null,
  }
}

async function buildDetail(row, viewer, { asTechnician = false } = {}) {
  const b = await loadBundle(row)
  const resumen = paymentSummary(b.budget, b.pagos)
  const detail = {
    ...serializeRepairDetail(row, { evidencias: b.evidencias, historial: b.historial, diagnostico: b.diagChatbot }),
    tecnicoPerfil: serializeTechnicianPublic(b.techProfile),
    diagnosticoTecnico: serializeDiagnosis(b.diagTecnico),
    presupuesto: serializeBudget(b.budget),
    pagos: b.pagos.filter((p) => p.estado !== 'cancelado').map(serializePayment),
    resumenPagos: resumen,
    piezas: b.piezas.map(serializePart),
    logistica: b.logistica.map(serializeLogistics),
    calificacion: serializeRating(b.rating),
    acciones: userActions(row, { budget: b.budget, resumen, rating: b.rating, isOwner: viewer.id === row.id_usuario }),
  }
  if (asTechnician) {
    const client = await userModel.findById(row.id_usuario)
    detail.cliente = client ? { id: row.id_usuario, nombre: client.nombre, apellidos: client.apellidos, telefono: client.telefono } : null
    detail.accionesTecnico = techActions(row, b)
  }
  return detail
}

/** Detalle completo para propietario, técnico asignado o admin. Conserva el formato del detalle original. */
export async function getRepairDetail(user, folio) {
  const row = await findAuthorizedRepair(folio, user)
  return buildDetail(row, user)
}

/* ======================= técnico ======================= */

/** Solo el técnico asignado puede operar la solicitud (otro técnico recibe 403). */
export async function findAssignedRepair(rawFolio, user) {
  const folio = normalizeFolio(rawFolio)
  if (!FOLIO_RE.test(folio)) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  const row = await repairModel.findByFolio(folio)
  if (!row) throw AppError.notFound('No encontramos una solicitud con ese folio.')
  if (row.id_tecnico !== user.id) throw AppError.forbidden('Esta solicitud no está asignada a tu cuenta.')
  return row
}

export async function getTechnicianDetail(user, folio) {
  const row = await findAssignedRepair(folio, user)
  return buildDetail(row, user, { asTechnician: true })
}

/**
 * Permite al técnico especializado confirmar (aceptar) o rechazar un folio asignado.
 * - Si confirma (accept === true): pasa a "Técnico asignado" y notifica al cliente.
 * - Si rechaza (accept === false): pasa a "Folio rechazado", libera el folio y notifica al cliente.
 */
export async function respondTechnicianAssignment(user, rawFolio, body) {
  const row = await findAssignedRepair(rawFolio, user)
  const accept = body.accept === true
  const motivo = text(body.motivo, 300)
  const techUser = await userModel.findById(user.id)
  const techName = techUser ? `${techUser.nombre} ${techUser.apellidos}`.trim() : 'El técnico'

  if (accept) {
    if (![S.PENDING_TECH, S.REGISTERED].includes(row.estado)) {
      throw AppError.conflict('Este folio ya fue confirmado.')
    }
    await withTransaction(async (conn) => {
      await assertLockedStatus(row.id_solicitud, [S.PENDING_TECH, S.REGISTERED], conn)
      await setStatus(
        row.id_solicitud,
        S.TECH_ASSIGNED,
        `${techName} confirmó el folio y aceptó atender la solicitud.`,
        { id_tecnico: user.id, requiere_tecnico: 1 },
        conn,
      )
    })

    await afterChange(row.id_solicitud, [
      {
        userId: row.id_usuario,
        tipo: 'estado',
        email: true,
        titulo: 'Técnico confirmó tu folio',
        mensaje: `${techName} confirmó tu solicitud ${row.folio} (${row.dispositivo_marca} ${row.dispositivo_modelo}). Ya puedes comunicarte por chat.`,
      },
    ])
    return getTechnicianDetail(user, row.folio)
  }

  const currentBudget = await budgetModel.findByRepair(row.id_solicitud)
  if (
    ![S.PENDING_TECH, S.REGISTERED, S.TECH_ASSIGNED].includes(row.estado) ||
    (currentBudget && currentBudget.estado === 'Aceptado')
  ) {
    throw AppError.conflict('Ya no es posible rechazar este folio porque el proceso de reparación ya inició.')
  }

  await withTransaction(async (conn) => {
    await assertLockedStatus(row.id_solicitud, [S.PENDING_TECH, S.REGISTERED, S.TECH_ASSIGNED], conn)
    await setStatus(
      row.id_solicitud,
      S.FOLIO_REJECTED,
      `${techName} rechazó el folio.${motivo ? ` Motivo: ${motivo}` : ''}`,
      { id_tecnico: null },
      conn,
    )
  })

  await afterChange(row.id_solicitud, [
    {
      userId: row.id_usuario,
      tipo: 'estado',
      email: true,
      titulo: 'Folio rechazado por el técnico',
      mensaje: `${techName} rechazó la solicitud ${row.folio} (${row.dispositivo_marca} ${row.dispositivo_modelo}).${motivo ? ` Motivo: ${motivo}` : ''}`,
    },
  ])
  return { rejected: true, folio: row.folio }
}

export async function saveTechnicalDiagnosis(user, folio, body) {
  const row = await findAssignedRepair(folio, user)
  if (!(WORKSHOP_STATUSES.includes(row.estado) || row.estado === S.BUDGET_REJECTED)) {
    throw AppError.conflict('No es posible registrar diagnóstico en el estado actual.')
  }
  const diagnostico = text(body.diagnostico, 2000)
  if (diagnostico.length < 10) throw AppError.validation({ diagnostico: 'Describe el diagnóstico técnico (mínimo 10 caracteres).' })
  const costo = parseAmount(body.costoEstimado, 'costoEstimado')
  const tiempo = text(body.tiempoEstimado, 60) || null

  await withTransaction(async (conn) => {
    await diagnosisModel.create(row.id_solicitud, { tipo: 'tecnico', resultado: diagnostico, detalle: { costoEstimado: costo, tiempoEstimado: tiempo } }, conn)
    await query(
      'UPDATE solicitudes SET diagnostico_final = ?, costo_estimado = ?, tiempo_estimado = ? WHERE id_solicitud = ?',
      [diagnostico, costo || null, tiempo, row.id_solicitud],
      conn,
    )
    await addEvent(row.id_solicitud, 'Diagnóstico técnico', diagnostico, conn)
  })

  await afterChange(row.id_solicitud, [
    {
      userId: row.id_usuario,
      tipo: 'reparacion',
      titulo: 'Diagnóstico técnico disponible',
      mensaje: `Tu técnico registró el diagnóstico de ${row.folio}${tiempo ? ` (tiempo estimado: ${tiempo})` : ''}.`,
    },
  ])
  return getTechnicianDetail(user, row.folio)
}

export async function createBudget(user, folio, body) {
  const row = await findAssignedRepair(folio, user)
  if (!BUDGET_STATUSES.includes(row.estado)) throw AppError.conflict('Solo puedes enviar presupuesto antes de que el cliente lo acepte.')
  const current = await budgetModel.findByRepair(row.id_solicitud)
  if (current && current.estado !== 'Rechazado') throw AppError.conflict('Ya existe un presupuesto vigente para esta solicitud.')

  const diagnostico = text(body.diagnostico, 2000)
  if (diagnostico.length < 10) throw AppError.validation({ diagnostico: 'Describe el diagnóstico del presupuesto (mínimo 10 caracteres).' })
  const manoObra = parseAmount(body.manoObra, 'manoObra', { required: true })
  const costoPiezas = parseAmount(body.costoPiezas, 'costoPiezas')
  const costoTotal = round2(manoObra + costoPiezas)
  if (costoTotal <= 0) throw AppError.validation({ manoObra: 'El costo total debe ser mayor a cero.' })
  const anticipoRequerido = round2(costoTotal * 0.5)
  const tiempoEstimado = text(body.tiempoEstimado, 60) || null

  await withTransaction(async (conn) => {
    await assertLockedStatus(row.id_solicitud, BUDGET_STATUSES, conn)
    await budgetModel.create({ idSolicitud: row.id_solicitud, diagnostico, manoObra, costoPiezas, costoTotal, anticipoRequerido, tiempoEstimado }, conn)
    await query(
      'UPDATE solicitudes SET estado = ?, costo_estimado = ?, tiempo_estimado = COALESCE(?, tiempo_estimado) WHERE id_solicitud = ?',
      [S.TECH_ASSIGNED, costoTotal, tiempoEstimado, row.id_solicitud],
      conn,
    )
    await addEvent(row.id_solicitud, 'Presupuesto enviado', `Total ${mxn(costoTotal)} · Anticipo requerido (50 %) ${mxn(anticipoRequerido)}.`, conn)
  })

  await afterChange(row.id_solicitud, [
    {
      userId: row.id_usuario,
      tipo: 'presupuesto',
      email: true,
      titulo: 'Tu presupuesto está disponible',
      mensaje: `Revisa el presupuesto de ${row.folio}: total ${mxn(costoTotal)}, anticipo ${mxn(anticipoRequerido)}.`,
    },
  ])
  return getTechnicianDetail(user, row.folio)
}

const STATUS_MESSAGES = {
  [S.DEVICE_RECEIVED]: 'Tu dispositivo fue recibido por el técnico.',
  [S.IN_REVIEW]: 'Tu dispositivo está en revisión.',
  [S.IN_REPAIR]: 'Tu dispositivo entró en reparación.',
  [S.WAITING_PART]: 'Tu reparación está en espera de una pieza.',
  [S.REPAIR_DONE]: 'Tu dispositivo está listo. Realiza el pago del saldo para programar la entrega.',
  [S.FINISHED]: 'Tu dispositivo fue entregado. ¡Gracias por confiar en PROTEC!',
}

export async function updateStatusByTechnician(user, folio, body) {
  const row = await findAssignedRepair(folio, user)
  const estado = text(body.estado, 40)
  const allowed = techTransitions(row)
  if (!allowed.includes(estado)) {
    throw AppError.badRequest(
      allowed.length
        ? `Desde "${row.estado}" solo puedes avanzar a: ${allowed.join(', ')}.`
        : `En el estado "${row.estado}" no hay cambios manuales disponibles.`,
    )
  }
  const comentario = text(body.comentario, 500)
  const extra = {}
  if (estado === S.REPAIR_DONE) {
    const resumen = text(body.resumenReparacion, 2000)
    if (resumen.length < 10) throw AppError.validation({ resumenReparacion: 'Describe el trabajo realizado (mínimo 10 caracteres).' })
    extra.resumen_reparacion = resumen
    if (!row.diagnostico_final) {
      const budget = await budgetModel.findByRepair(row.id_solicitud)
      if (budget?.diagnostico) extra.diagnostico_final = budget.diagnostico
    }
  }
  if (estado === S.FINISHED) extra.fecha_finalizacion = NOW

  const descripcion =
    comentario ||
    (estado === S.REPAIR_DONE ? `Trabajo realizado: ${extra.resumen_reparacion}` : null) ||
    (estado === S.FINISHED ? 'El cliente recogió su dispositivo en el centro de servicio. Entrega completada.' : null)

  await withTransaction(async (conn) => {
    await assertLockedStatus(row.id_solicitud, row.estado, conn)
    await setStatus(row.id_solicitud, estado, descripcion, extra, conn)
    if (estado === S.FINISHED) await technicianModel.recalculateRating(user.id, conn)
  })

  await afterChange(row.id_solicitud, [
    {
      userId: row.id_usuario,
      tipo: estado === S.REPAIR_DONE ? 'reparacion' : 'estado',
      email: estado === S.REPAIR_DONE || estado === S.FINISHED,
      titulo: estado === S.REPAIR_DONE ? 'Tu dispositivo está listo' : `Tu reparación cambió a ${estado}`,
      mensaje: `${STATUS_MESSAGES[estado] ?? `Tu reparación cambió a ${estado}.`}${comentario ? ` Nota del técnico: ${comentario}` : ''}`,
    },
  ])
  return getTechnicianDetail(user, row.folio)
}

const EVIDENCE_LABELS = { inicial: 'Estado inicial', diagnostico: 'Diagnóstico', reparacion: 'Reparación', pieza: 'Pieza', final: 'Equipo reparado' }
const MAX_TECH_EVIDENCES = 30

export async function addTechnicianEvidences(user, folio, body) {
  const row = await findAssignedRepair(folio, user)
  if (!(WORKSHOP_STATUSES.includes(row.estado) || row.estado === S.READY)) {
    throw AppError.conflict('No es posible agregar evidencias en el estado actual.')
  }
  const tipo = EVIDENCE_TYPES.includes(body.tipoEvidencia) ? body.tipoEvidencia : null
  if (!tipo) throw AppError.validation({ tipoEvidencia: 'Selecciona el tipo de evidencia.' })
  const descripcion = text(body.descripcion, 255) || null
  const items = resolveEvidenceTokens(body.evidencias, user.id)
  if (!items.length) throw AppError.validation({ evidencias: 'Selecciona al menos una imagen.' })

  await withTransaction(async (conn) => {
    const current = (await evidenceModel.countByRepair(row.id_solicitud, conn)) - (await evidenceModel.countByRepair(row.id_solicitud, conn, { tipo: 'inicial' }))
    if (current + items.length > MAX_TECH_EVIDENCES) {
      throw AppError.validation({ evidencias: `Se alcanzó el máximo de ${MAX_TECH_EVIDENCES} evidencias técnicas.` })
    }
    for (const ev of items) {
      if (await evidenceModel.existsPublicId(ev.publicId, conn)) continue
      await evidenceModel.create(row.id_solicitud, { ...ev, descripcion: descripcion ?? EVIDENCE_LABELS[tipo], tipoEvidencia: tipo, autorId: user.id }, conn)
    }
    await addEvent(row.id_solicitud, 'Evidencia agregada', `${items.length} fotografía(s) · ${EVIDENCE_LABELS[tipo]}${descripcion ? ` · ${descripcion}` : ''}`, conn)
  })

  await afterChange(row.id_solicitud, [
    { userId: row.id_usuario, tipo: 'reparacion', titulo: 'Se agregó una nueva evidencia', mensaje: `Tu técnico subió ${items.length} fotografía(s) (${EVIDENCE_LABELS[tipo]}) en ${row.folio}.` },
  ])
  return getTechnicianDetail(user, row.folio)
}

const PART_TYPES = ['original', 'compatible', 'otro']

export async function addPart(user, folio, body) {
  const row = await findAssignedRepair(folio, user)
  if (!WORKSHOP_STATUSES.includes(row.estado)) throw AppError.conflict('No es posible registrar piezas en el estado actual.')
  const nombre = text(body.nombre, 120)
  if (nombre.length < 2) throw AppError.validation({ nombre: 'Escribe el nombre de la pieza.' })
  const tipo = PART_TYPES.includes(body.tipo) ? body.tipo : 'original'
  const data = {
    idSolicitud: row.id_solicitud,
    nombre,
    marca: text(body.marca, 80) || null,
    numeroSerie: text(body.numeroSerie, 80) || null,
    codigoQr: text(body.codigoQr, 120) || null,
    costo: parseAmount(body.costo, 'costo'),
    tipo,
    verificada: body.verificada !== false,
  }

  await withTransaction(async (conn) => {
    await partModel.create(data, conn)
    await addEvent(row.id_solicitud, 'Pieza registrada', `${nombre}${data.marca ? ` · ${data.marca}` : ''} · ${tipo}${data.numeroSerie ? ` · S/N ${data.numeroSerie}` : ''}`, conn)
  })

  await afterChange(row.id_solicitud, [
    { userId: row.id_usuario, tipo: 'reparacion', titulo: 'Pieza registrada', mensaje: `Se registró la pieza "${nombre}" en tu reparación ${row.folio}.` },
  ])
  return getTechnicianDetail(user, row.folio)
}

export async function removePart(user, folio, partId) {
  const row = await findAssignedRepair(folio, user)
  if (!WORKSHOP_STATUSES.includes(row.estado)) throw AppError.conflict('No es posible modificar piezas en el estado actual.')
  const part = await partModel.findById(Number(partId))
  if (!part || part.id_solicitud !== row.id_solicitud) throw AppError.notFound('No encontramos esa pieza.')
  await withTransaction(async (conn) => {
    await partModel.remove(part.id_pieza, conn)
    await addEvent(row.id_solicitud, 'Pieza eliminada', `Se retiró el registro de "${part.nombre}".`, conn)
  })
  await afterChange(row.id_solicitud)
  return getTechnicianDetail(user, row.folio)
}

/** Avanza la logística un paso a la vez (etapas registradas por el técnico). */
export async function advanceLogistics(user, folio, logisticsId, body) {
  const row = await findAssignedRepair(folio, user)
  const entry = await logisticsModel.findById(Number(logisticsId))
  if (!entry || entry.id_solicitud !== row.id_solicitud) throw AppError.notFound('No encontramos ese registro logístico.')

  const flow = LOGISTICS_FLOW[entry.tipo]
  const expected = flow[flow.indexOf(entry.estado) + 1]
  const estado = text(body.estado, 40)
  if (!expected || estado !== expected) {
    throw AppError.badRequest(expected ? `El siguiente paso es "${expected}".` : 'Este registro logístico ya fue completado.')
  }

  const isPickup = entry.tipo === 'recoleccion'
  const requiredStatus = isPickup ? [S.PICKUP_SCHEDULED] : [S.DELIVERY_SCHEDULED, S.DELIVERY_IN_TRANSIT]
  const completed = estado === flow[flow.length - 1]
  const notes = {
    'Repartidor en camino': 'El repartidor va en camino a recoger tu dispositivo.',
    'Dispositivo recogido': 'El repartidor recogió tu dispositivo.',
    'Entregado al técnico': 'Recolección completada: el dispositivo fue entregado al técnico.',
    'En camino': 'Tu dispositivo va en camino a tu domicilio.',
    'Dispositivo entregado': 'Dispositivo entregado en tu domicilio. Servicio finalizado.',
  }

  await withTransaction(async (conn) => {
    await assertLockedStatus(row.id_solicitud, requiredStatus, conn)
    await logisticsModel.updateStatus(entry.id_logistica, estado, { completed }, conn)
    if (estado === 'Entregado al técnico') {
      await setStatus(row.id_solicitud, S.DEVICE_RECEIVED, notes[estado], {}, conn)
    } else if (estado === 'En camino') {
      await setStatus(row.id_solicitud, S.DELIVERY_IN_TRANSIT, notes[estado], {}, conn)
    } else if (estado === 'Dispositivo entregado') {
      await setStatus(row.id_solicitud, S.FINISHED, notes[estado], { fecha_finalizacion: NOW }, conn)
      await technicianModel.recalculateRating(user.id, conn)
    } else {
      await addEvent(row.id_solicitud, estado, notes[estado], conn)
    }
  })

  await afterChange(row.id_solicitud, [
    { userId: row.id_usuario, tipo: 'logistica', titulo: isPickup ? 'Actualización de recolección' : 'Actualización de entrega', mensaje: `${notes[estado]} (${row.folio})` },
  ])
  return getTechnicianDetail(user, row.folio)
}

/* ======================= usuario ======================= */

async function findOwnedRepair(folio, user) {
  const row = await findAuthorizedRepair(folio, user)
  if (row.id_usuario !== user.id) throw AppError.forbidden('Solo el propietario de la solicitud puede realizar esta acción.')
  return row
}

export async function respondBudget(user, folio, body) {
  const row = await findOwnedRepair(folio, user)
  const budget = await budgetModel.findByRepair(row.id_solicitud)
  if (!budget || budget.estado !== 'Pendiente') throw AppError.conflict('No hay un presupuesto pendiente de respuesta.')
  const accept = body.accept === true
  const motivo = text(body.motivo, 300)

  await withTransaction(async (conn) => {
    const result = await query("UPDATE presupuestos SET estado = ? WHERE id_presupuesto = ? AND estado = 'Pendiente'", [accept ? 'Aceptado' : 'Rechazado', budget.id_presupuesto], conn)
    if (!result.affectedRows) throw AppError.conflict('Este presupuesto ya fue respondido.')
    if (accept) {
      await setStatus(row.id_solicitud, S.PENDING_DEPOSIT, `Presupuesto aceptado (${mxn(budget.costo_total)}). Anticipo requerido: ${mxn(budget.anticipo_requerido)}.`, {}, conn)
    } else {
      await setStatus(row.id_solicitud, S.BUDGET_REJECTED, `El cliente rechazó el presupuesto.${motivo ? ` Motivo: ${motivo}` : ''}`, {}, conn)
    }
  })

  await afterChange(row.id_solicitud, [
    {
      userId: row.id_tecnico,
      tipo: 'presupuesto',
      titulo: accept ? 'Presupuesto aceptado' : 'Presupuesto rechazado',
      mensaje: accept ? `El cliente aceptó el presupuesto de ${row.folio}. Pendiente de anticipo.` : `El cliente rechazó el presupuesto de ${row.folio}.${motivo ? ` Motivo: ${motivo}` : ''}`,
    },
    {
      userId: row.id_usuario,
      tipo: 'presupuesto',
      titulo: accept ? 'Presupuesto aceptado' : 'Presupuesto rechazado',
      mensaje: accept ? `Realiza el anticipo de ${mxn(budget.anticipo_requerido)} para continuar con ${row.folio}.` : `Registramos que rechazaste el presupuesto de ${row.folio}.`,
    },
  ])
  return getRepairDetail(user, row.folio)
}

export async function getPaymentInfo(user, folio) {
  const row = await findAuthorizedRepair(folio, user)
  const [budget, pagos] = await Promise.all([budgetModel.findByRepair(row.id_solicitud), paymentModel.listByRepair(row.id_solicitud)])
  const resumen = paymentSummary(budget, pagos)
  const acciones = userActions(row, { budget, resumen, rating: null, isOwner: row.id_usuario === user.id })
  return {
    folio: row.folio,
    estado: row.estado,
    dispositivo: { tipo: row.dispositivo_tipo, marca: row.dispositivo_marca, modelo: row.dispositivo_modelo },
    presupuesto: serializeBudget(budget),
    pagos: pagos.filter((p) => p.estado !== 'cancelado').map(serializePayment),
    resumenPagos: resumen,
    pagoDisponible: acciones.payDeposit ? 'anticipo' : acciones.payFinal ? 'pago_final' : null,
    pagoEnLinea: stripeEnabled,
  }
}

const PAYMENT_LABEL = { anticipo: 'Anticipo', pago_final: 'Pago final' }
const METHOD_LABEL = { Tarjeta: 'tarjeta (Stripe)', Transferencia: 'transferencia', Efectivo: 'efectivo' }

/**
 * Calcula el monto que corresponde pagar ahora y el estado siguiente.
 * Debe ejecutarse dentro de una transacción con la solicitud bloqueada.
 */
async function duePayment(row, tipo, conn) {
  if (!['anticipo', 'pago_final'].includes(tipo)) throw AppError.validation({ tipo: 'Tipo de pago no válido.' })
  const expected = tipo === 'anticipo' ? S.PENDING_DEPOSIT : S.REPAIR_DONE
  await assertLockedStatus(row.id_solicitud, expected, conn)
  const budget = await budgetModel.findByRepair(row.id_solicitud, conn)
  if (budget?.estado !== 'Aceptado') throw AppError.conflict('No hay un presupuesto aceptado.')
  const resumen = paymentSummary(budget, await paymentModel.listByRepair(row.id_solicitud, conn))
  if (tipo === 'anticipo') {
    if (resumen.anticipoPagado > 0) throw AppError.conflict('El anticipo ya fue registrado.')
    return { monto: resumen.anticipoRequerido, nextStatus: row.solicita_recoleccion ? S.PICKUP_PENDING : S.READY_TO_RECEIVE }
  }
  if (resumen.anticipoPagado <= 0) throw AppError.conflict('Primero se debe registrar el anticipo.')
  if (resumen.saldoPendiente <= 0) throw AppError.conflict('No hay saldo pendiente.')
  return { monto: resumen.saldoPendiente, nextStatus: S.READY }
}

/** Registra en el historial el pago confirmado y avanza la solicitud. */
async function advanceAfterPayment(row, { tipo, monto, metodo, nextStatus }, conn) {
  await addEvent(row.id_solicitud, tipo === 'anticipo' ? 'Anticipo registrado' : 'Pago final registrado', `${PAYMENT_LABEL[tipo]} de ${mxn(monto)} · Pago con ${METHOD_LABEL[metodo]}.`, conn)
  const note =
    nextStatus === S.PICKUP_PENDING
      ? 'Programa la recolección de tu dispositivo.'
      : nextStatus === S.READY_TO_RECEIVE
        ? 'Lleva tu dispositivo al centro de servicio para iniciar la reparación.'
        : 'Elige cómo quieres recibir tu dispositivo.'
  await setStatus(row.id_solicitud, nextStatus, note, {}, conn)
}

const paymentNotifications = (row, tipo, monto, metodo) => [
  { userId: row.id_usuario, tipo: 'pago', email: true, titulo: tipo === 'anticipo' ? 'Anticipo recibido' : 'Pago final recibido', mensaje: `Recibimos tu pago de ${mxn(monto)} (${METHOD_LABEL[metodo]}) para ${row.folio}.` },
  { userId: row.id_tecnico, tipo: 'pago', titulo: tipo === 'anticipo' ? 'Anticipo recibido' : 'Pago final recibido', mensaje: `Se confirmó ${tipo === 'anticipo' ? 'el anticipo' : 'el pago final'} (${mxn(monto)}) de ${row.folio}.` },
]

/** Cancela intentos de pago con tarjeta que quedaron abiertos (best-effort en Stripe). */
async function cancelPendingCheckouts(repairId, tipo, conn) {
  const pending = (await paymentModel.listByRepair(repairId, conn)).filter((p) => p.estado === 'pendiente' && p.tipo === tipo)
  for (const p of pending) {
    await query("UPDATE pagos SET estado = 'cancelado' WHERE id_pago = ? AND estado = 'pendiente'", [p.id_pago], conn)
    if (stripe && p.stripe_session_id) stripe.checkout.sessions.expire(p.stripe_session_id).catch(() => {})
  }
}

/**
 * Inicia el pago con tarjeta mediante Stripe Checkout.
 * La tarjeta se captura en la página segura de Stripe: PROTEC nunca recibe sus datos.
 */
export async function createCheckoutSession(user, folio, body) {
  const row = await findOwnedRepair(folio, user)
  if (!stripe) throw new AppError('El pago en línea no está disponible por el momento. Puedes pagar en efectivo o transferencia en el centro de servicio.', 503)
  const tipo = body.tipo

  const { pagoId, monto } = await withTransaction(async (conn) => {
    const due = await duePayment(row, tipo, conn)
    if (due.monto < 10) throw AppError.conflict('El monto mínimo para pagar en línea es de $10.00 MXN.')
    await cancelPendingCheckouts(row.id_solicitud, tipo, conn)
    const id = await paymentModel.create({ idSolicitud: row.id_solicitud, tipo, monto: due.monto, estado: 'pendiente', metodo: 'Tarjeta', referencia: 'Stripe Checkout' }, conn)
    return { pagoId: id, monto: due.monto }
  })

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        locale: 'es-419',
        customer_email: user.correo,
        client_reference_id: String(pagoId),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: env.stripe.currency,
              unit_amount: Math.round(monto * 100),
              product_data: {
                name: `${tipo === 'anticipo' ? 'Anticipo (50 %)' : 'Saldo de la reparación'} · ${row.folio}`,
                description: `${row.dispositivo_marca} ${row.dispositivo_modelo}`,
              },
            },
          },
        ],
        metadata: { pagoId: String(pagoId), folio: row.folio, tipo },
        payment_intent_data: { metadata: { pagoId: String(pagoId), folio: row.folio, tipo } },
        expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
        success_url: `${env.frontendUrl}/reparacion/${row.folio}/pago?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.frontendUrl}/reparacion/${row.folio}/pago?cancelado=1`,
      },
      { idempotencyKey: `protec-pago-${pagoId}` },
    )
    await query('UPDATE pagos SET stripe_session_id = ? WHERE id_pago = ?', [session.id, pagoId])
    return { url: session.url }
  } catch (error) {
    await query("UPDATE pagos SET estado = 'cancelado' WHERE id_pago = ?", [pagoId])
    console.error('[stripe] No se pudo crear la sesión de pago:', error.type ?? error.code ?? error.message)
    throw new AppError('No pudimos iniciar el pago con tarjeta. Inténtalo de nuevo en unos minutos.', 502)
  }
}

/**
 * Confirma un pago de Stripe a partir de la sesión de Checkout (webhook o verificación al regresar).
 * Es idempotente: si el pago ya estaba confirmado no hace nada.
 */
export async function confirmStripeSession(session) {
  const pagoId = Number(session?.metadata?.pagoId || session?.client_reference_id)
  if (!pagoId || session.payment_status !== 'paid') return { confirmed: false }

  const result = await withTransaction(async (conn) => {
    const [pago] = await query('SELECT * FROM pagos WHERE id_pago = ? FOR UPDATE', [pagoId], conn)
    if (!pago || pago.stripe_session_id !== session.id) return null
    if (pago.estado === 'pagado') return { already: true }
    if (Math.round(Number(pago.monto) * 100) !== session.amount_total || session.currency !== env.stripe.currency) {
      console.error(`[stripe] Monto o moneda no coinciden para el pago ${pagoId}. Revisión manual requerida.`)
      return null
    }
    const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    await query("UPDATE pagos SET estado = 'pagado', referencia = ?, fecha = NOW() WHERE id_pago = ?", [`Stripe ${intent ?? session.id}`.slice(0, 120), pagoId], conn)

    const row = await repairModel.findById(pago.id_solicitud, conn)
    const expected = pago.tipo === 'anticipo' ? S.PENDING_DEPOSIT : S.REPAIR_DONE
    const locked = await repairModel.lockForUpdate(pago.id_solicitud, conn)
    if (locked?.estado === expected) {
      const nextStatus = pago.tipo === 'anticipo' ? (row.solicita_recoleccion ? S.PICKUP_PENDING : S.READY_TO_RECEIVE) : S.READY
      await advanceAfterPayment(row, { tipo: pago.tipo, monto: Number(pago.monto), metodo: 'Tarjeta', nextStatus }, conn)
    } else {
      await addEvent(pago.id_solicitud, 'Pago confirmado', `${PAYMENT_LABEL[pago.tipo]} de ${mxn(pago.monto)} confirmado por Stripe.`, conn)
    }
    return { row, tipo: pago.tipo, monto: Number(pago.monto) }
  })

  if (result?.row) await afterChange(result.row.id_solicitud, paymentNotifications(result.row, result.tipo, result.monto, 'Tarjeta'))
  return { confirmed: Boolean(result) }
}

/** Al regresar de Stripe, el frontend verifica la sesión (respaldo si el webhook tarda). */
export async function verifyCheckoutSession(user, folio, sessionId) {
  if (!stripe) throw new AppError('El pago en línea no está disponible.', 503)
  const row = await findOwnedRepair(folio, user)
  if (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw AppError.badRequest('Sesión de pago no válida.')
  const [pago] = await query('SELECT * FROM pagos WHERE stripe_session_id = ? AND id_solicitud = ?', [sessionId, row.id_solicitud])
  if (!pago) throw AppError.notFound('No encontramos ese pago.')
  if (pago.estado !== 'pagado') {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    await confirmStripeSession(session)
  }
  const [updated] = await query('SELECT * FROM pagos WHERE id_pago = ?', [pago.id_pago])
  return { pago: serializePayment(updated), pagado: updated.estado === 'pagado' }
}

/** Webhook de Stripe: la firma se verifica con STRIPE_WEBHOOK_SECRET antes de procesar el evento. */
export async function handleStripeWebhook(rawBody, signature) {
  if (!stripe || !env.stripe.webhookSecret) throw new AppError('Webhook no configurado.', 503)
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret)
  } catch {
    throw AppError.badRequest('Firma de webhook inválida.')
  }
  const session = event.data?.object
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    await confirmStripeSession(session)
  } else if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
    await query("UPDATE pagos SET estado = 'cancelado' WHERE stripe_session_id = ? AND estado = 'pendiente'", [session.id])
  }
  return { received: true }
}

/**
 * Pago recibido en el centro de servicio (efectivo o transferencia), registrado por el administrador.
 */
export async function registerManualPayment(admin, folio, body) {
  const row = await findAuthorizedRepair(folio, admin)
  const tipo = body.tipo
  const metodo = ['Efectivo', 'Transferencia'].includes(body.metodo) ? body.metodo : null
  if (!metodo) throw AppError.validation({ metodo: 'Selecciona efectivo o transferencia.' })
  const referencia = text(body.referencia, 100)
  if (metodo === 'Transferencia' && referencia.length < 3) throw AppError.validation({ referencia: 'Escribe la referencia o folio de la transferencia.' })

  let monto = 0
  await withTransaction(async (conn) => {
    const due = await duePayment(row, tipo, conn)
    monto = due.monto
    await cancelPendingCheckouts(row.id_solicitud, tipo, conn)
    await paymentModel.create(
      { idSolicitud: row.id_solicitud, tipo, monto, estado: 'pagado', metodo, referencia: referencia || `Recibido en sucursal por ${admin.nombre}`, registradoPor: admin.id },
      conn,
    )
    await advanceAfterPayment(row, { tipo, monto, metodo, nextStatus: due.nextStatus }, conn)
  })

  await afterChange(row.id_solicitud, paymentNotifications(row, tipo, monto, metodo))
  return getRepairDetail(admin, row.folio)
}

export async function schedulePickup(user, folio, body) {
  const row = await findOwnedRepair(folio, user)
  if (row.estado !== S.PICKUP_PENDING) throw AppError.conflict('La recolección solo se programa después de registrar el anticipo.')
  const data = parseAddress(body)

  await withTransaction(async (conn) => {
    await assertLockedStatus(row.id_solicitud, S.PICKUP_PENDING, conn)
    await logisticsModel.create({ idSolicitud: row.id_solicitud, tipo: 'recoleccion', ...data, estado: 'Recolección programada' }, conn)
    await setStatus(row.id_solicitud, S.PICKUP_SCHEDULED, `Recolección programada para el ${data.fechaProgramada} (${data.horario}).`, {}, conn)
  })

  await afterChange(row.id_solicitud, [
    { userId: row.id_usuario, tipo: 'logistica', email: true, titulo: 'Recolección programada', mensaje: `Tu recolección quedó programada para el ${data.fechaProgramada} (${data.horario}).` },
    { userId: row.id_tecnico, tipo: 'logistica', titulo: 'Recolección programada', mensaje: `El cliente programó la recolección de ${row.folio} para el ${data.fechaProgramada} (${data.horario}).` },
  ])
  return getRepairDetail(user, row.folio)
}

export async function scheduleDelivery(user, folio, body) {
  const row = await findOwnedRepair(folio, user)
  if (row.estado !== S.READY || row.metodo_entrega) throw AppError.conflict('La entrega se configura después del pago final.')
  const metodo = body.metodo === 'domicilio' ? 'domicilio' : body.metodo === 'recoger' ? 'recoger' : null
  if (!metodo) throw AppError.validation({ metodo: 'Selecciona cómo quieres recibir tu dispositivo.' })

  if (metodo === 'recoger') {
    await withTransaction(async (conn) => {
      await assertLockedStatus(row.id_solicitud, S.READY, conn)
      await query('UPDATE solicitudes SET metodo_entrega = ? WHERE id_solicitud = ?', ['recoger', row.id_solicitud], conn)
      await addEvent(row.id_solicitud, 'Entrega en centro de servicio', 'El cliente recogerá el dispositivo personalmente.', conn)
    })
    await afterChange(row.id_solicitud, [
      { userId: row.id_tecnico, tipo: 'logistica', titulo: 'El cliente recogerá en persona', mensaje: `Marca ${row.folio} como Finalizado cuando entregues el dispositivo.` },
    ])
  } else {
    const data = parseAddress(body)
    await withTransaction(async (conn) => {
      await assertLockedStatus(row.id_solicitud, S.READY, conn)
      await logisticsModel.create({ idSolicitud: row.id_solicitud, tipo: 'entrega', ...data, estado: 'Entrega programada' }, conn)
      await setStatus(row.id_solicitud, S.DELIVERY_SCHEDULED, `Entrega a domicilio programada para el ${data.fechaProgramada} (${data.horario}).`, { metodo_entrega: 'domicilio' }, conn)
    })
    await afterChange(row.id_solicitud, [
      { userId: row.id_usuario, tipo: 'logistica', email: true, titulo: 'Entrega programada', mensaje: `Tu entrega quedó programada para el ${data.fechaProgramada} (${data.horario}).` },
      { userId: row.id_tecnico, tipo: 'logistica', titulo: 'Entrega a domicilio programada', mensaje: `Entrega de ${row.folio} programada para el ${data.fechaProgramada} (${data.horario}).` },
    ])
  }
  return getRepairDetail(user, row.folio)
}

export async function rateService(user, folio, body) {
  const row = await findOwnedRepair(folio, user)
  if (row.estado !== S.FINISHED) throw AppError.conflict('Podrás calificar cuando el servicio esté finalizado.')
  if (!row.id_tecnico) throw AppError.conflict('Esta solicitud no tuvo técnico asignado.')
  const puntuacion = Number(body.puntuacion)
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) throw AppError.validation({ puntuacion: 'Selecciona de 1 a 5 estrellas.' })
  const comentario = text(body.comentario, 500) || null

  try {
    await withTransaction(async (conn) => {
      await ratingModel.create({ idSolicitud: row.id_solicitud, userId: user.id, technicianId: row.id_tecnico, puntuacion, comentario }, conn)
      await technicianModel.recalculateRating(row.id_tecnico, conn)
      await addEvent(row.id_solicitud, 'Servicio calificado', `Calificación: ${puntuacion}/5`, conn)
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw AppError.conflict('Ya calificaste este servicio.')
    throw error
  }

  await afterChange(row.id_solicitud, [
    { userId: row.id_tecnico, tipo: 'sistema', titulo: 'Nueva calificación', mensaje: `Recibiste ${puntuacion} de 5 estrellas en ${row.folio}.` },
  ])
  return getRepairDetail(user, row.folio)
}

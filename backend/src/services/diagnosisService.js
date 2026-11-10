import { withTransaction, queryOne } from '../config/db.js'
import { diagnosisModel } from '../models/diagnosisModel.js'
import { repairModel } from '../models/repairModel.js'
import { statusHistoryModel } from '../models/statusHistoryModel.js'
import { AppError } from '../utils/AppError.js'
import { PROBLEM_CATEGORIES, REPAIR_STATUS, STATUS_PROGRESS } from '../utils/constants.js'
import { serializeDiagnosis } from '../utils/serializers.js'
import { normalizeDeviceType } from '../utils/validators.js'
import { runDiagnosis, summarizeResult } from './chatbot/engine.js'
import { findAuthorizedRepair } from './repairService.js'
import { assignTechnician } from './assignmentService.js'

/**
 * Orquesta el diagnóstico de una solicitud:
 * usa el motor de reglas y persiste el resultado en `diagnosticos`,
 * `solicitudes` e `historial_estados`.
 */

const contextFromRow = (row) => ({
  deviceType: row.dispositivo_tipo,
  category: row.categoria,
  description: row.descripcion_problema,
})

const repairInfo = (row) => ({
  folio: row.folio,
  estado: row.estado,
  progreso: STATUS_PROGRESS[row.estado] ?? 0,
  categoria: row.categoria,
  descripcion: row.descripcion_problema,
  requiereTecnico: Boolean(row.requiere_tecnico),
  dispositivo: { tipo: row.dispositivo_tipo, marca: row.dispositivo_marca, modelo: row.dispositivo_modelo },
  fechaCreacion: row.fecha_creacion instanceof Date ? row.fecha_creacion.toISOString() : row.fecha_creacion,
})

function ensureOwner(user, row) {
  if (row.id_usuario !== user.id) {
    throw AppError.forbidden('Solo el propietario de la solicitud puede realizar el diagnóstico.')
  }
}

/** Bloquea la fila para evitar diagnósticos duplicados por peticiones simultáneas. */
async function lockStatus(conn, repairId) {
  const row = await queryOne('SELECT estado FROM solicitudes WHERE id_solicitud = ? FOR UPDATE', [repairId], conn)
  return row?.estado
}

function awaitingResolution(row, diagnosis) {
  const detalle = diagnosis?.detalle
  return Boolean(
    row.estado === REPAIR_STATUS.DIAGNOSIS && detalle?.result?.selfFixSteps?.length && !detalle?.resolution,
  )
}

const CAN_DIAGNOSE_STATUSES = [REPAIR_STATUS.REGISTERED, REPAIR_STATUS.PENDING_TECH]

export const diagnosisService = {
  async getSession(user, folio) {
    const row = await findAuthorizedRepair(folio, user)
    const diagnosis = serializeDiagnosis(await diagnosisModel.findLatest(row.id_solicitud, 'chatbot'))
    const isOwner = row.id_usuario === user.id
    return {
      repair: repairInfo(row),
      diagnostico: diagnosis,
      canStart: isOwner && !diagnosis && CAN_DIAGNOSE_STATUSES.includes(row.estado),
      awaitingResolution: isOwner && awaitingResolution(row, diagnosis),
    }
  },

  /**
   * Recibe TODAS las respuestas dadas hasta el momento y devuelve el siguiente paso.
   * Cuando el motor llega a un resultado, se guarda automáticamente.
   */
  async answer(user, folio, answers) {
    const row = await findAuthorizedRepair(folio, user)
    ensureOwner(user, row)
    if (!CAN_DIAGNOSE_STATUSES.includes(row.estado)) {
      throw AppError.conflict('Esta solicitud ya cuenta con un diagnóstico preliminar.')
    }

    const outcome = runDiagnosis(contextFromRow(row), answers)
    if (outcome.status !== 'result') return outcome

    const { result, transcript } = outcome
    const summary = summarizeResult(result)

    await withTransaction(async (conn) => {
      const estadoActual = await lockStatus(conn, row.id_solicitud)
      if (!CAN_DIAGNOSE_STATUSES.includes(estadoActual)) {
        throw AppError.conflict('Esta solicitud ya cuenta con un diagnóstico preliminar.')
      }

      await diagnosisModel.create(
        row.id_solicitud,
        {
          tipo: 'chatbot',
          resultado: summary,
          detalle: { version: 1, ruleId: result.ruleId, result, transcript },
        },
        conn,
      )

      const nextStatus = result.requiresTechnician ? REPAIR_STATUS.PENDING_TECH : REPAIR_STATUS.DIAGNOSIS
      await repairModel.updateStatus(
        row.id_solicitud,
        {
          estado: nextStatus,
          requiereTecnico: result.requiresTechnician,
          diagnosticoInicial: summary,
          prioridad: result.priority,
        },
        conn,
      )

      await statusHistoryModel.add(
        row.id_solicitud,
        REPAIR_STATUS.DIAGNOSIS,
        `Diagnóstico preliminar del asistente: ${result.problem}`,
        conn,
      )
      if (result.requiresTechnician && estadoActual === REPAIR_STATUS.REGISTERED) {
        await statusHistoryModel.add(
          row.id_solicitud,
          REPAIR_STATUS.PENDING_TECH,
          'El caso requiere revisión de un técnico. En espera de confirmación.',
          conn,
        )
      }
    })

    // Intentar asignación automática de técnico
    if (result.requiresTechnician) {
      try {
        await assignTechnician(row.id_solicitud)
      } catch (err) {
        console.error('[diagnosis] Error en asignación automática:', err.message)
      }
    }

    const updated = await repairModel.findById(row.id_solicitud)
    return { ...outcome, repair: repairInfo(updated) }
  },

  /** El usuario indica si la solución sugerida resolvió el problema. */
  async resolve(user, folio, resolved) {
    const row = await findAuthorizedRepair(folio, user)
    ensureOwner(user, row)
    const latest = await diagnosisModel.findLatest(row.id_solicitud, 'chatbot')
    const diagnosis = serializeDiagnosis(latest)
    if (!awaitingResolution(row, diagnosis)) {
      throw AppError.conflict('Esta solicitud no tiene una solución pendiente de confirmar.')
    }

    await withTransaction(async (conn) => {
      const estadoActual = await lockStatus(conn, row.id_solicitud)
      if (estadoActual !== REPAIR_STATUS.DIAGNOSIS) {
        throw AppError.conflict('El estado de la solicitud cambió. Recarga la página.')
      }

      await diagnosisModel.updateDetail(
        latest.id_diagnostico,
        { ...diagnosis.detalle, resolution: { resolved, fecha: new Date().toISOString() } },
        conn,
      )

      if (resolved) {
        await repairModel.updateStatus(row.id_solicitud, { estado: REPAIR_STATUS.RESOLVED_BY_DIAGNOSIS, requiereTecnico: false }, conn)
        await statusHistoryModel.add(
          row.id_solicitud,
          REPAIR_STATUS.RESOLVED_BY_DIAGNOSIS,
          'El usuario confirmó que la solución sugerida por el asistente resolvió el problema.',
          conn,
        )
      } else {
        await repairModel.updateStatus(
          row.id_solicitud,
          {
            estado: REPAIR_STATUS.PENDING_TECH,
            requiereTecnico: true,
            diagnosticoInicial: `${row.diagnostico_inicial ?? ''}\nSeguimiento: la solución sugerida no resolvió el problema; se requiere técnico.`.trim(),
            prioridad: 'media',
          },
          conn,
        )
        await statusHistoryModel.add(
          row.id_solicitud,
          REPAIR_STATUS.PENDING_TECH,
          'La solución sugerida no resolvió el problema. El caso se escaló a un técnico.',
          conn,
        )
      }
    })

    // Si se escaló a técnico, intentar asignación automática
    if (!resolved) {
      try {
        await assignTechnician(row.id_solicitud)
      } catch (err) {
        console.error('[diagnosis] Error en asignación automática:', err.message)
      }
    }

    return this.getSession(user, folio)
  },

  /** Diagnóstico rápido sin guardar nada (página pública /diagnostico). */
  preview(body = {}) {
    const deviceType = normalizeDeviceType(body.deviceType ?? body.tipo)
    const category = PROBLEM_CATEGORIES.includes(body.category) ? body.category : null
    const description = typeof body.description === 'string' ? body.description.slice(0, 1500) : ''
    const answers = Array.isArray(body.answers) ? body.answers.map((a) => String(a ?? '').slice(0, 300)) : []
    return runDiagnosis({ deviceType, category, description }, answers)
  },
}

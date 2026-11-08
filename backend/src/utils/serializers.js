import { STATUS_PROGRESS, isFinishedStatus } from './constants.js'

/**
 * Convierte filas de MySQL en objetos para la API (camelCase).
 * Centralizar esto evita exponer columnas sensibles por accidente.
 */

export const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null)
const money = (value) => (value === null || value === undefined ? null : Number(value))

export const parseJson = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function serializeUser(row) {
  if (!row) return null
  return {
    id: row.id_usuario,
    nombre: row.nombre,
    apellidos: row.apellidos,
    correo: row.correo,
    telefono: row.telefono,
    rol: row.rol,
    activo: Boolean(row.estado),
    fechaRegistro: iso(row.fecha_registro),
  }
}

export function serializeDevice(row) {
  return {
    id: row.id_dispositivo,
    tipo: row.tipo,
    marca: row.marca,
    modelo: row.modelo,
    numeroSerie: row.numero_serie ?? null,
    fechaRegistro: iso(row.fecha_registro),
  }
}

const technicianOf = (row) =>
  row.id_tecnico
    ? { id: row.id_tecnico, nombre: [row.tecnico_nombre, row.tecnico_apellidos].filter(Boolean).join(' ') }
    : null

/** Resumen para listados (Mis reparaciones, paneles). */
export function serializeRepairSummary(row) {
  return {
    id: row.id_solicitud,
    folio: row.folio,
    estado: row.estado,
    progreso: STATUS_PROGRESS[row.estado] ?? 0,
    terminada: isFinishedStatus(row.estado),
    categoria: row.categoria,
    descripcion: row.descripcion_problema,
    prioridad: row.prioridad ?? null,
    requiereTecnico: Boolean(row.requiere_tecnico),
    evidenciasTotal: Number(row.evidencias_total ?? 0),
    tecnico: technicianOf(row),
    dispositivo: {
      id: row.id_dispositivo,
      tipo: row.dispositivo_tipo,
      marca: row.dispositivo_marca,
      modelo: row.dispositivo_modelo,
    },
    fechaCreacion: iso(row.fecha_creacion),
    fechaActualizacion: iso(row.fecha_actualizacion),
  }
}

export function serializeEvidence(row) {
  return {
    id: row.id_evidencia,
    url: row.url_imagen,
    descripcion: row.descripcion,
    tipoEvidencia: row.tipo_evidencia ?? 'inicial',
    fechaSubida: iso(row.fecha_subida),
  }
}

export function serializeHistory(row) {
  return { id: row.id_historial, estado: row.estado, descripcion: row.descripcion, fecha: iso(row.fecha) }
}

export function serializeDiagnosis(row) {
  if (!row) return null
  return {
    id: row.id_diagnostico,
    tipo: row.tipo,
    resultado: row.resultado,
    detalle: parseJson(row.detalle),
    fecha: iso(row.fecha_diagnostico),
  }
}

export function serializeBudget(row) {
  if (!row) return null
  return {
    id: row.id_presupuesto,
    diagnostico: row.diagnostico,
    manoObra: money(row.mano_obra),
    costoPiezas: money(row.costo_piezas),
    costoTotal: money(row.costo_total),
    anticipoRequerido: money(row.anticipo_requerido),
    tiempoEstimado: row.tiempo_estimado,
    estado: row.estado,
    fecha: iso(row.fecha_creacion),
  }
}

export function serializePayment(row) {
  return {
    id: row.id_pago,
    tipo: row.tipo,
    monto: money(row.monto),
    estado: row.estado,
    metodo: row.metodo,
    referencia: row.referencia,
    fecha: iso(row.fecha),
    ...(row.folio ? { folio: row.folio } : {}),
    ...(row.nombre ? { usuario: `${row.nombre} ${row.apellidos ?? ''}`.trim() } : {}),
  }
}

export function serializePart(row) {
  return {
    id: row.id_pieza,
    nombre: row.nombre,
    marca: row.marca,
    numeroSerie: row.numero_serie,
    codigoQr: row.codigo_qr,
    costo: money(row.costo),
    tipo: row.tipo,
    verificada: Boolean(row.verificada),
    fecha: iso(row.fecha_registro),
  }
}

export function serializeLogistics(row) {
  return {
    id: row.id_logistica,
    tipo: row.tipo,
    direccion: row.direccion,
    referencias: row.referencias,
    horario: row.horario,
    fechaProgramada: iso(row.fecha_programada),
    fechaReal: iso(row.fecha_real),
    estado: row.estado,
    observaciones: row.observaciones,
  }
}

export function serializeMessage(row) {
  const deleted = row.id_remitente === null || row.nombre === null || row.nombre === undefined
  return {
    id: row.id_mensaje,
    idRemitente: row.id_remitente,
    nombre: deleted ? 'Cuenta eliminada' : row.nombre,
    apellidos: deleted ? '' : row.apellidos,
    rol: deleted ? null : row.rol,
    mensaje: row.mensaje,
    fechaEnvio: iso(row.fecha_envio),
    leido: Boolean(row.leido),
  }
}

export function serializeNotification(row) {
  return {
    id: row.id_notificacion,
    tipo: row.tipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: Boolean(row.leida),
    fecha: iso(row.fecha),
    repairId: row.id_solicitud ?? null,
    folio: row.folio ?? null,
  }
}

export function serializeRating(row) {
  if (!row) return null
  return { puntuacion: row.puntuacion, comentario: row.comentario, fecha: iso(row.fecha) }
}

/** Perfil público del técnico: nunca incluye correo ni teléfono. */
export function serializeTechnicianPublic(row) {
  if (!row) return null
  return {
    nombre: `${row.nombre} ${row.apellidos ?? ''}`.trim(),
    especialidad: row.especialidad,
    calificacion: Number(row.calificacion),
    serviciosTerminados: Number(row.servicios_terminados),
  }
}

/** Detalle completo (solo para el propietario o personal autorizado). */
export function serializeRepairDetail(row, { evidencias = [], historial = [], diagnostico = null } = {}) {
  return {
    ...serializeRepairSummary(row),
    prioridad: row.prioridad,
    diagnosticoInicial: row.diagnostico_inicial,
    costoEstimado: row.costo_estimado !== null && row.costo_estimado !== undefined ? Number(row.costo_estimado) : null,
    metodoContacto: row.metodo_contacto,
    solicitaRecoleccion: Boolean(row.solicita_recoleccion),
    resumenReparacion: row.resumen_reparacion ?? null,
    diagnosticoFinal: row.diagnostico_final ?? null,
    tiempoEstimado: row.tiempo_estimado ?? null,
    metodoEntrega: row.metodo_entrega ?? null,
    fechaFinalizacion: iso(row.fecha_finalizacion),
    dispositivo: {
      id: row.id_dispositivo,
      tipo: row.dispositivo_tipo,
      marca: row.dispositivo_marca,
      modelo: row.dispositivo_modelo,
      numeroSerie: row.dispositivo_numero_serie ?? null,
    },
    evidencias: evidencias.map(serializeEvidence),
    historial: historial.map(serializeHistory),
    diagnostico: serializeDiagnosis(diagnostico),
  }
}

/**
 * Vista pública del seguimiento: SIN datos personales, fotografías,
 * descripciones ni mensajes. Solo estado general y línea de tiempo básica.
 */
export function serializePublicTracking(row, historial = [], { isOwner = false } = {}) {
  return {
    folio: row.folio,
    tipoDispositivo: row.dispositivo_tipo,
    estado: row.estado,
    progreso: STATUS_PROGRESS[row.estado] ?? 0,
    terminada: isFinishedStatus(row.estado),
    fechaCreacion: iso(row.fecha_creacion),
    fechaActualizacion: iso(row.fecha_actualizacion),
    historial: historial.map((h) => ({ estado: h.estado, fecha: iso(h.fecha) })),
    isOwner,
  }
}

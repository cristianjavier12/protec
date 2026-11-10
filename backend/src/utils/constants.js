/**
 * Constantes de dominio compartidas por modelos, servicios y validaciones.
 */

export const ROLES = Object.freeze({
  USER: 'usuario',
  TECHNICIAN: 'tecnico',
  ADMIN: 'admin',
})

export const DEVICE_TYPES = Object.freeze(['celular', 'laptop', 'computadora'])

/** Alias aceptados desde el frontend (?device=phone, etc.). */
export const DEVICE_ALIASES = Object.freeze({
  celular: 'celular',
  phone: 'celular',
  movil: 'celular',
  smartphone: 'celular',
  laptop: 'laptop',
  notebook: 'laptop',
  computadora: 'computadora',
  desktop: 'computadora',
  pc: 'computadora',
})

export const PROBLEM_CATEGORIES = Object.freeze([
  'Pantalla',
  'Batería',
  'Carga',
  'Encendido',
  'Rendimiento',
  'Software',
  'Almacenamiento',
  'Sonido',
  'Conectividad',
  'Otro',
])

export const CONTACT_METHODS = Object.freeze(['chat', 'llamada'])

/**
 * Estados del ciclo de vida de una solicitud (en orden).
 * `progress` se usa para la barra de avance en el frontend.
 */
export const REPAIR_STATUS = Object.freeze({
  REGISTERED: 'Solicitud registrada',
  DIAGNOSIS: 'Diagnóstico inicial',
  PENDING_TECH: 'Pendiente de técnico',
  TECH_ASSIGNED: 'Técnico asignado',
  FOLIO_REJECTED: 'Folio rechazado',
  PENDING_DEPOSIT: 'Pendiente de anticipo',
  BUDGET_REJECTED: 'Presupuesto rechazado',
  READY_TO_RECEIVE: 'Listo para recibir dispositivo',
  PICKUP_PENDING: 'Recolección pendiente',
  PICKUP_SCHEDULED: 'Recolección programada',
  DEVICE_RECEIVED: 'Equipo recibido',
  IN_REVIEW: 'En revisión',
  IN_REPAIR: 'En reparación',
  WAITING_PART: 'Esperando pieza',
  REPAIR_DONE: 'Reparación terminada',
  READY: 'Listo para entrega',
  DELIVERY_SCHEDULED: 'Entrega programada',
  DELIVERY_IN_TRANSIT: 'En camino',
  FINISHED: 'Finalizado',
  RESOLVED_BY_DIAGNOSIS: 'Resuelto mediante diagnóstico',
})

export const STATUS_PROGRESS = Object.freeze({
  [REPAIR_STATUS.REGISTERED]: 5,
  [REPAIR_STATUS.DIAGNOSIS]: 10,
  [REPAIR_STATUS.PENDING_TECH]: 15,
  [REPAIR_STATUS.TECH_ASSIGNED]: 20,
  [REPAIR_STATUS.FOLIO_REJECTED]: 0,
  [REPAIR_STATUS.PENDING_DEPOSIT]: 25,
  [REPAIR_STATUS.BUDGET_REJECTED]: 20,
  [REPAIR_STATUS.READY_TO_RECEIVE]: 30,
  [REPAIR_STATUS.PICKUP_PENDING]: 30,
  [REPAIR_STATUS.PICKUP_SCHEDULED]: 35,
  [REPAIR_STATUS.DEVICE_RECEIVED]: 40,
  [REPAIR_STATUS.IN_REVIEW]: 50,
  [REPAIR_STATUS.IN_REPAIR]: 65,
  [REPAIR_STATUS.WAITING_PART]: 60,
  [REPAIR_STATUS.REPAIR_DONE]: 80,
  [REPAIR_STATUS.READY]: 90,
  [REPAIR_STATUS.DELIVERY_SCHEDULED]: 92,
  [REPAIR_STATUS.DELIVERY_IN_TRANSIT]: 95,
  [REPAIR_STATUS.FINISHED]: 100,
  [REPAIR_STATUS.RESOLVED_BY_DIAGNOSIS]: 100,
})

export const ALLOWED_STATUSES = Object.freeze(Object.values(REPAIR_STATUS))

export const FINISHED_STATUSES = Object.freeze([
  REPAIR_STATUS.FINISHED,
  REPAIR_STATUS.RESOLVED_BY_DIAGNOSIS,
  REPAIR_STATUS.FOLIO_REJECTED,
])

export const isFinishedStatus = (estado) => FINISHED_STATUSES.includes(estado)

/**
 * Transiciones MANUALES que puede hacer el técnico desde "Actualizar estado".
 * Las demás etapas las disparan acciones del flujo para evitar saltos incoherentes:
 *  - Presupuesto aceptado   -> Pendiente de anticipo        (usuario)
 *  - Anticipo pagado        -> Listo para recibir / Recolección pendiente (usuario)
 *  - Recolección completada -> Equipo recibido               (logística)
 *  - Pago final             -> Listo para entrega            (usuario)
 *  - Entrega a domicilio    -> Entrega programada / En camino / Finalizado (logística)
 * "Listo para entrega -> Finalizado" solo aplica cuando el cliente recoge en persona.
 */
export const TECH_TRANSITIONS = Object.freeze({
  [REPAIR_STATUS.READY_TO_RECEIVE]: [REPAIR_STATUS.DEVICE_RECEIVED],
  [REPAIR_STATUS.DEVICE_RECEIVED]: [REPAIR_STATUS.IN_REVIEW],
  [REPAIR_STATUS.IN_REVIEW]: [REPAIR_STATUS.IN_REPAIR, REPAIR_STATUS.WAITING_PART],
  [REPAIR_STATUS.IN_REPAIR]: [REPAIR_STATUS.REPAIR_DONE, REPAIR_STATUS.WAITING_PART],
  [REPAIR_STATUS.WAITING_PART]: [REPAIR_STATUS.IN_REPAIR],
  [REPAIR_STATUS.READY]: [REPAIR_STATUS.FINISHED],
})

/** Estados en los que el técnico puede registrar diagnóstico y enviar presupuesto. */
export const BUDGET_STATUSES = Object.freeze([
  REPAIR_STATUS.TECH_ASSIGNED,
  REPAIR_STATUS.BUDGET_REJECTED,
])

/** Estados en los que el técnico puede subir evidencias y registrar piezas. */
export const WORKSHOP_STATUSES = Object.freeze([
  REPAIR_STATUS.TECH_ASSIGNED,
  REPAIR_STATUS.DEVICE_RECEIVED,
  REPAIR_STATUS.IN_REVIEW,
  REPAIR_STATUS.IN_REPAIR,
  REPAIR_STATUS.WAITING_PART,
  REPAIR_STATUS.REPAIR_DONE,
])

/** Secuencias logísticas (etapas registradas por el técnico, sin GPS). */
export const LOGISTICS_FLOW = Object.freeze({
  recoleccion: ['Recolección programada', 'Repartidor en camino', 'Dispositivo recogido', 'Entregado al técnico'],
  entrega: ['Entrega programada', 'En camino', 'Dispositivo entregado'],
})

/** Especialidades de técnico → tipos de dispositivo que puede atender */
export const SPECIALTY_DEVICES = Object.freeze({
  celulares: ['celular'],
  laptops: ['laptop'],
  computadoras: ['computadora'],
  laptops_computadoras: ['laptop', 'computadora'],
  general: ['celular', 'laptop', 'computadora'],
})

/** Reglas de evidencias */
export const EVIDENCE_RULES = Object.freeze({
  maxFiles: 5,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
})

export const DESCRIPTION_RULES = Object.freeze({ min: 20, max: 1500 })
export const PASSWORD_MIN = 8

export const EVIDENCE_TYPES = Object.freeze(['inicial', 'diagnostico', 'reparacion', 'pieza', 'final'])

export const PAYMENT_TYPES = Object.freeze(['anticipo', 'pago_final'])
export const PAYMENT_STATUSES = Object.freeze(['pendiente', 'pagado', 'cancelado'])
export const PAYMENT_METHODS = Object.freeze(['Tarjeta', 'Transferencia', 'Efectivo'])

export const LOGISTICS_TYPES = Object.freeze(['recoleccion', 'entrega'])
export const LOGISTICS_STATUSES = Object.freeze([
  'Pendiente', 'Programada', 'Recolección programada', 'Repartidor en camino',
  'Dispositivo recogido', 'Entregado al técnico', 'Entrega programada',
  'En camino', 'Dispositivo entregado', 'Completada', 'Cancelada',
])

export const NOTIFICATION_TYPES = Object.freeze([
  'estado', 'mensaje', 'presupuesto', 'pago', 'logistica', 'reparacion', 'sistema',
])

export const SCHEDULE_SLOTS = Object.freeze(['9:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'])

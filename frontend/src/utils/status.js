/**
 * Colores semánticos de los estados de una reparación (consistentes en toda la app).
 *  amarillo  -> pendiente        azul        -> en revisión
 *  eléctrico -> en reparación    naranja     -> esperando pieza
 *  verde     -> terminada        verde oscuro -> finalizado
 */
export const TONE_CLASSES = {
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  electric: 'bg-electric/10 text-electric ring-electric/25',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
}

/** Color sólido (puntos de timeline, barras de gráficas). */
export const TONE_DOT = {
  gray: 'bg-slate-400',
  yellow: 'bg-amber-500',
  blue: 'bg-sky-500',
  indigo: 'bg-indigo-500',
  electric: 'bg-electric',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-700',
}

const STATUS_TONE = {
  'Solicitud registrada': 'gray',
  'Diagnóstico inicial': 'blue',
  'Pendiente de técnico': 'yellow',
  'Técnico asignado': 'indigo',
  'Pendiente de anticipo': 'yellow',
  'Presupuesto rechazado': 'red',
  'Listo para recibir dispositivo': 'yellow',
  'Recolección pendiente': 'yellow',
  'Recolección programada': 'indigo',
  'Equipo recibido': 'blue',
  'En revisión': 'blue',
  'En reparación': 'electric',
  'Esperando pieza': 'orange',
  'Reparación terminada': 'green',
  'Listo para entrega': 'green',
  'Entrega programada': 'indigo',
  'En camino': 'indigo',
  Finalizado: 'emerald',
  'Resuelto mediante diagnóstico': 'emerald',
}

export const statusToneOf = (estado) => STATUS_TONE[estado] ?? 'gray'

/** Tono para eventos del historial que no son estados (presupuesto, pagos, piezas...). */
const EVENT_TONE = {
  'Diagnóstico técnico': 'blue',
  'Presupuesto enviado': 'yellow',
  'Anticipo registrado': 'green',
  'Pago final registrado': 'green',
  'Evidencia agregada': 'electric',
  'Pieza registrada': 'electric',
  'Pieza eliminada': 'gray',
  'Repartidor en camino': 'indigo',
  'Dispositivo recogido': 'indigo',
  'Entrega en centro de servicio': 'indigo',
  'Técnico reasignado': 'indigo',
  'Servicio calificado': 'emerald',
}

export const historyToneOf = (label) => STATUS_TONE[label] ?? EVENT_TONE[label] ?? 'gray'

export const SPECIALTY_LABELS = {
  celulares: 'Celulares',
  laptops: 'Laptops',
  computadoras: 'Computadoras',
  laptops_computadoras: 'Laptops y computadoras',
  general: 'Reparación general',
}

export const EVIDENCE_TYPE_LABELS = {
  inicial: 'Estado inicial',
  diagnostico: 'Diagnóstico',
  reparacion: 'Reparación',
  pieza: 'Pieza reemplazada',
  final: 'Equipo reparado',
}

export const PART_TYPE_LABELS = { original: 'Original', compatible: 'Compatible', otro: 'Otro' }

export const SCHEDULE_SLOTS = ['9:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00']

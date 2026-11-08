/**
 * Estados del ciclo de vida de una reparación.
 * Las `key` coinciden con los valores de `solicitudes.estado` en MySQL.
 */
export const REPAIR_STATUSES = [
  { key: 'Solicitud registrada', label: 'Solicitud registrada' },
  { key: 'Diagnóstico inicial', label: 'Diagnóstico inicial' },
  { key: 'Pendiente de técnico', label: 'Pendiente de técnico' },
  { key: 'Técnico asignado', label: 'Técnico asignado' },
  { key: 'Pendiente de anticipo', label: 'Presupuesto y anticipo' },
  { key: 'Equipo recibido', label: 'Equipo recibido' },
  { key: 'En revisión', label: 'En revisión' },
  { key: 'En reparación', label: 'En reparación' },
  { key: 'Reparación terminada', label: 'Reparación terminada' },
  { key: 'Listo para entrega', label: 'Listo para entrega' },
  { key: 'Finalizado', label: 'Finalizado' },
]

/**
 * Estados intermedios que se agrupan en la etapa visible más cercana
 * de la línea de tiempo resumida (el historial completo se muestra en RepairTimeline).
 */
const STATUS_ALIASES = {
  'Resuelto mediante diagnóstico': 'Finalizado',
  'Presupuesto rechazado': 'Pendiente de anticipo',
  'Listo para recibir dispositivo': 'Pendiente de anticipo',
  'Recolección pendiente': 'Pendiente de anticipo',
  'Recolección programada': 'Pendiente de anticipo',
  'Esperando pieza': 'En reparación',
  'Entrega programada': 'Listo para entrega',
  'En camino': 'Listo para entrega',
}

export const FINISHED_STATUSES = ['Finalizado', 'Resuelto mediante diagnóstico']
export const isFinishedStatus = (key) => FINISHED_STATUSES.includes(key)

export const getStatusIndex = (key) => REPAIR_STATUSES.findIndex((s) => s.key === (STATUS_ALIASES[key] ?? key))
export const getStatusLabel = (key) => REPAIR_STATUSES.find((s) => s.key === key)?.label ?? key

/**
 * Solicitudes simuladas para modo mock.
 */
const MOCK_REPAIRS = {
  'PRO-1025': {
    folio: 'PRO-1025',
    device: { type: 'laptop', label: 'Laptop Lenovo', brand: 'Lenovo', model: 'IdeaPad 5 14"' },
    issue: 'La pantalla permanece negra al encender.',
    status: 'En reparación',
    progress: 60,
    technician: { name: 'Carlos M.', specialty: 'Laptops y equipos portátiles' },
    createdAt: '2026-10-08T10:15:00-06:00',
    estimatedDelivery: '2026-10-18T18:00:00-06:00',
    lastUpdate: {
      message: 'Se inició el reemplazo del componente dañado.',
      date: '2026-10-15T12:40:00-06:00',
    },
    history: [
      {
        status: 'Solicitud registrada',
        date: '2026-10-08T10:15:00-06:00',
        note: 'Solicitud creada desde la plataforma con 3 fotografías adjuntas.',
      },
      {
        status: 'Diagnóstico inicial',
        date: '2026-10-08T10:32:00-06:00',
        note: 'El diagnóstico inicial sugiere una falla en el cable flex de video.',
      },
      {
        status: 'Técnico asignado',
        date: '2026-10-09T09:05:00-06:00',
        note: 'Carlos M. fue asignado y confirmó el costo aproximado.',
      },
      {
        status: 'En revisión',
        date: '2026-10-11T13:20:00-06:00',
        note: 'El equipo fue recolectado y recibido en el centro de servicio.',
      },
      {
        status: 'En reparación',
        date: '2026-10-15T12:40:00-06:00',
        note: 'Se inició el reemplazo del componente dañado.',
      },
    ],
  },
}

export const DEMO_FOLIO = 'PRO-1025'

export const findMockRepair = (folio) => MOCK_REPAIRS[folio] ?? null

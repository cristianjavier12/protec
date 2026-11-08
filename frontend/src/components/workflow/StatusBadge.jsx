import { StatusBadge as BaseStatusBadge } from '../tracking/TrackingElements'

/**
 * Badge de estado con color semántico automático (utils/status.js):
 * Pendiente = amarillo · En revisión = azul · En reparación = azul eléctrico ·
 * Esperando pieza = naranja · Reparación terminada = verde · Finalizado = verde oscuro.
 */
export default function StatusBadge({ estado, className }) {
  return <BaseStatusBadge label={estado} className={className} />
}

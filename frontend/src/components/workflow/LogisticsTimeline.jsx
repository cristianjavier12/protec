import { Check, MapPin, PackageCheck, Truck } from 'lucide-react'
import { formatDate, formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

export const LOGISTICS_FLOW = {
  recoleccion: ['Recolección programada', 'Repartidor en camino', 'Dispositivo recogido', 'Entregado al técnico'],
  entrega: ['Entrega programada', 'En camino', 'Dispositivo entregado'],
}

/**
 * Seguimiento logístico por etapas. No hay GPS en esta versión:
 * se muestran solo los estados registrados, sin mapa ni ubicación en vivo.
 */
export default function LogisticsTimeline({ entry, action, horizontal = false }) {
  const flow = LOGISTICS_FLOW[entry.tipo] ?? []
  const current = flow.indexOf(entry.estado)
  const done = current === flow.length - 1
  const isPickup = entry.tipo === 'recoleccion'

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn('grid size-10 place-items-center rounded-xl', done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600')}>
            {done ? <PackageCheck className="size-5" aria-hidden /> : <Truck className="size-5" aria-hidden />}
          </span>
          <div>
            <p className="font-bold text-ink">{isPickup ? 'Recolección' : 'Entrega a domicilio'}</p>
            <p className="text-xs text-muted">
              {entry.fechaProgramada ? formatDate(entry.fechaProgramada, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Fecha por confirmar'}
              {entry.horario ? ` · ${entry.horario}` : ''}
            </p>
          </div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', done ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200')}>
          {done ? 'Completada' : entry.estado}
        </span>
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-muted">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {entry.direccion}
          {entry.referencias && <span className="block text-xs text-muted/80">Referencias: {entry.referencias}</span>}
        </span>
      </p>

      <ol className={cn('mt-4 grid gap-2.5', horizontal && 'md:grid-flow-col md:auto-cols-fr md:gap-3')}>
        {flow.map((step, i) => {
          const state = i < current || done ? 'done' : i === current ? 'current' : 'pending'
          return (
            <li key={step} className={cn('flex items-center gap-2.5', horizontal && 'md:flex-col md:items-start md:gap-2')}>
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                  state === 'done' && 'bg-emerald-500 text-white',
                  state === 'current' && 'animate-pulse-ring bg-electric text-white',
                  state === 'pending' && 'border-2 border-line bg-white text-muted',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn('text-sm', state === 'pending' ? 'text-muted' : 'font-semibold text-ink')}>{step}</span>
            </li>
          )
        })}
      </ol>

      {entry.fechaReal && done && <p className="mt-3 text-xs text-muted">Completada el {formatDateTime(entry.fechaReal)}</p>}
      <p className="mt-3 text-[11px] text-muted/80">Seguimiento por etapas, actualizado por el técnico en cada cambio.</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

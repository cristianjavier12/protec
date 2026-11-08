import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatDateTime } from '../../utils/format'
import { TONE_DOT, historyToneOf } from '../../utils/status'
import { cn } from '../../utils/cn'

/**
 * Historial completo (trazabilidad) en una línea de tiempo vertical.
 * Muestra cada evento con su fecha y la observación registrada.
 */
export default function RepairTimeline({ history = [], collapsible = true, initial = 6, newestFirst = false }) {
  const [expanded, setExpanded] = useState(!collapsible)
  const ordered = newestFirst ? [...history].reverse() : history
  const hidden = collapsible && !expanded && ordered.length > initial
  const items = hidden ? (newestFirst ? ordered.slice(0, initial) : ordered.slice(-initial)) : ordered

  if (!history.length) return <p className="text-sm text-muted">Sin movimientos registrados.</p>

  return (
    <div>
      {hidden && !newestFirst && (
        <button type="button" onClick={() => setExpanded(true)} className="mb-4 text-sm font-semibold text-electric hover:underline">
          Ver {ordered.length - initial} eventos anteriores
        </button>
      )}
      <ol className="relative">
        {items.map((h, i) => {
          const isLast = i === items.length - 1
          const current = newestFirst ? i === 0 : isLast
          return (
            <li key={h.id ?? `${h.estado}-${h.fecha}-${i}`} className={cn('relative flex gap-4', !isLast && 'pb-6')}>
              {!isLast && <span aria-hidden className="absolute top-4 bottom-0 left-[7px] w-0.5 bg-line" />}
              <span
                className={cn(
                  'relative mt-1 size-4 shrink-0 rounded-full ring-4 ring-white',
                  TONE_DOT[historyToneOf(h.estado)],
                  current && 'animate-pulse-ring',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="font-semibold text-ink">{h.estado}</p>
                  <time className="text-xs text-muted" dateTime={h.fecha}>
                    {formatDateTime(h.fecha)}
                  </time>
                </div>
                {h.descripcion && <p className="mt-1 text-sm leading-relaxed break-words text-muted">{h.descripcion}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {collapsible && ordered.length > initial && (expanded || newestFirst) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-electric hover:underline"
        >
          {expanded ? 'Mostrar menos' : 'Ver historial completo'}
          <ChevronDown className={cn('size-4 transition', expanded && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  )
}

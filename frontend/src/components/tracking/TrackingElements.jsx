import { Check } from 'lucide-react'
import { REPAIR_STATUSES, getStatusIndex } from '../../data/trackingMock'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'
import { TONE_CLASSES, statusToneOf } from '../../utils/status'

/** Barra de progreso con degradado. */
export function ProgressBar({ value = 0, label = 'Progreso', showLabel = true, className }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{label}</span>
          <span className="font-bold text-electric">{pct}%</span>
        </div>
      )}
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="relative h-full rounded-full bg-brand-gradient transition-[width] duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        >
          <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.45),transparent)] bg-[length:200%_100%] animate-[shimmer_2.4s_linear_infinite]" />
        </div>
      </div>
    </div>
  )
}

/** Estado visual de cada paso respecto al estado actual. */
const stepState = (index, currentIndex) =>
  index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending'

function StepDot({ state, size = 'md' }) {
  const s = size === 'sm' ? 'size-6' : 'size-8'
  if (state === 'done') {
    return (
      <span className={cn('grid shrink-0 place-items-center rounded-full bg-emerald-500 text-white', s)}>
        <Check className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className={cn('animate-pulse-ring grid shrink-0 place-items-center rounded-full bg-electric', s)}>
        <span className="size-2 rounded-full bg-white" />
      </span>
    )
  }
  return <span className={cn('shrink-0 rounded-full border-2 border-line bg-white', s)} />
}

const STATE_LABEL = { done: 'Completado', current: 'En curso', pending: 'Pendiente' }

/**
 * Línea de tiempo de estados.
 * variant="compact": lista sencilla (preview en Inicio).
 * variant="detailed": incluye fecha y nota de cada etapa (página de seguimiento).
 */
export function StatusTimeline({ status, history = [], variant = 'detailed', className }) {
  const currentIndex = getStatusIndex(status)
  const lastIndex = REPAIR_STATUSES.length - 1
  // Si hay varias entradas del mismo estado, se conserva la más reciente.
  const historyByStatus = Object.fromEntries(
    history.map((h) => [REPAIR_STATUSES[getStatusIndex(h.status)]?.key ?? h.status, h]),
  )
  const compact = variant === 'compact'

  return (
    <ol className={cn('relative', className)}>
      {REPAIR_STATUSES.map((step, i) => {
        const state = i === lastIndex && currentIndex === lastIndex ? 'done' : stepState(i, currentIndex)
        const entry = historyByStatus[step.key]
        const isLast = i === REPAIR_STATUSES.length - 1
        return (
          <li key={step.key} className={cn('relative flex gap-4', compact ? 'pb-3.5' : 'pb-7', isLast && 'pb-0')}>
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute w-0.5',
                  compact ? 'top-6 bottom-0 left-[11px]' : 'top-8 bottom-0 left-[15px]',
                  state === 'done' ? 'bg-emerald-500' : 'bg-line',
                )}
              />
            )}
            <StepDot state={state} size={compact ? 'sm' : 'md'} />
            <div className={cn('min-w-0 flex-1', compact ? 'pt-0.5' : 'pt-1')}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    'text-sm',
                    state === 'pending' ? 'text-muted' : 'font-semibold text-ink',
                    !compact && 'sm:text-base',
                  )}
                >
                  {step.label}
                </p>
                {compact ? (
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      state === 'done' && 'text-emerald-600',
                      state === 'current' && 'text-electric',
                      state === 'pending' && 'text-muted/70',
                    )}
                  >
                    {STATE_LABEL[state]}
                  </span>
                ) : (
                  entry?.date && <span className="text-xs text-muted">{formatDateTime(entry.date)}</span>
                )}
              </div>
              {!compact && (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {entry?.note ?? (state === 'pending' ? 'Etapa pendiente.' : '')}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Badge del estado actual. El tono se deduce del estado si no se indica (ver utils/status.js). */
export function StatusBadge({ label, tone, className }) {
  const resolved = TONE_CLASSES[tone] ? tone : statusToneOf(label)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ring-1',
        TONE_CLASSES[resolved],
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}

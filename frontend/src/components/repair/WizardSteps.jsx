import { Check, Lock } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Indicador de pasos del wizard.
 * steps: [{ id, label, description }]
 * current: índice del paso activo
 * completed: Set/array de índices completados
 * unlockedUntil: último índice habilitado (los demás se muestran bloqueados)
 */
export default function WizardSteps({ steps, current, completed = [], unlockedUntil = 0, onStepClick }) {
  const done = new Set(completed)

  return (
    <nav aria-label="Pasos de la solicitud">
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const isDone = done.has(i)
          const isCurrent = i === current
          const isLocked = i > unlockedUntil
          const isLast = i === steps.length - 1
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-5 left-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem)] rounded-full',
                    isDone ? 'bg-brand-gradient' : 'bg-line',
                  )}
                />
              )}
              <button
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && onStepClick?.(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative z-10 grid size-10 place-items-center rounded-full text-sm font-bold transition-all duration-300',
                  isDone && 'bg-emerald-500 text-white',
                  isCurrent && !isDone && !isLocked && 'bg-electric text-white shadow-glow ring-4 ring-electric/15',
                  !isDone && !isCurrent && !isLocked && 'border-2 border-electric/40 bg-white text-electric',
                  isLocked && !isCurrent && 'border border-line bg-surface text-muted/70',
                  isLocked && isCurrent && 'border border-electric/30 bg-white text-electric ring-4 ring-electric/10',
                )}
                aria-label={`Paso ${i + 1}: ${step.label}${isLocked ? ' (bloqueado)' : ''}`}
              >
                {isDone ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : isLocked ? (
                  <Lock className="size-3.5" />
                ) : (
                  i + 1
                )}
              </button>
              <div className="mt-3 hidden text-center sm:block">
                <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Paso {i + 1}</p>
                <p className={cn('mt-0.5 text-sm font-semibold', isCurrent ? 'text-ink' : 'text-muted')}>
                  {step.label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-center text-sm font-semibold text-ink sm:hidden">
        Paso {current + 1} de {steps.length}: <span className="text-electric">{steps[current]?.label}</span>
      </p>
    </nav>
  )
}

import { AlertTriangle, CheckCircle2, ClipboardCheck, Lightbulb, ListChecks, Wrench } from 'lucide-react'
import { cn } from '../../utils/cn'

const PRIORITY = {
  alta: { label: 'Prioridad alta', tone: 'bg-red-50 text-red-700 ring-red-200' },
  media: { label: 'Prioridad media', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  baja: { label: 'Prioridad baja', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
}

/**
 * Resultado del diagnóstico preliminar generado por el motor de reglas.
 * result: { title, problem, recommendation, attention, priority, requiresTechnician, selfFixSteps, tips }
 */
export default function DiagnosisResultCard({ result, className, children }) {
  if (!result) return null
  const priority = PRIORITY[result.priority] ?? PRIORITY.media
  const selfFix = !result.requiresTechnician && result.selfFixSteps?.length > 0

  return (
    <div className={cn('rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-electric/10 text-electric">
            <ClipboardCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-electric uppercase">Diagnóstico preliminar</p>
            <p className="font-bold text-ink">{result.title}</p>
          </div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', priority.tone)}>
          {priority.label}
        </span>
      </div>

      <dl className="mt-6 grid gap-4">
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-xs font-semibold text-muted">Posible problema</dt>
          <dd className="mt-1 text-ink">{result.problem}</dd>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <dt className="text-xs font-semibold text-muted">Recomendación</dt>
          <dd className="mt-1 text-ink">{result.recommendation}</dd>
        </div>
      </dl>

      <div
        className={cn(
          'mt-4 flex items-start gap-3 rounded-2xl border p-4',
          selfFix ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70',
        )}
      >
        {selfFix ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <Wrench className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
        )}
        <div>
          <p className="text-sm font-semibold text-ink">{result.attention}</p>
          <p className="mt-0.5 text-sm text-muted">
            {selfFix
              ? 'Puedes intentar estos pasos antes de enviar tu equipo.'
              : 'Este caso requiere la revisión de un técnico especializado.'}
          </p>
        </div>
      </div>

      {selfFix && (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ListChecks className="size-4 text-electric" aria-hidden /> Pasos sugeridos
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {result.selfFixSteps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-electric text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.tips?.length > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Lightbulb className="size-4 text-amber-500" aria-hidden /> Recomendaciones
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            {result.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-electric/60" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs text-muted">
        <AlertTriangle className="size-3.5 shrink-0 text-muted" aria-hidden />
        Este diagnóstico es orientativo y no sustituye la revisión de un técnico.
      </p>

      {children && <div className="mt-6 border-t border-line pt-6">{children}</div>}
    </div>
  )
}

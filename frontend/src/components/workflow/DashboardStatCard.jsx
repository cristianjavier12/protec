import { cn } from '../../utils/cn'

const TONES = {
  electric: 'bg-electric/10 text-electric',
  aqua: 'bg-aqua/15 text-sky-700',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-500',
  indigo: 'bg-indigo-50 text-indigo-600',
  navy: 'bg-navy text-aqua',
}

/** Tarjeta de indicador para dashboards. */
export default function DashboardStatCard({ icon: Icon, label, value, hint, tone = 'electric', loading = false, className }) {
  return (
    <div className={cn('rounded-3xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-line/70" />
          ) : (
            <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{value}</p>
          )}
        </div>
        {Icon && (
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', TONES[tone])}>
            <Icon className="size-5" aria-hidden />
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  )
}

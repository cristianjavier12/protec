import { AlertTriangle, RotateCcw } from 'lucide-react'
import Button from '../ui/Button'
import { cn } from '../../utils/cn'

/** Tarjeta de sección con el estilo de PROTEC. */
export function SectionCard({ title, icon: Icon, action, className, children, id }) {
  return (
    <section id={id} className={cn('rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-7', className)}>
      {title && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            {Icon && <Icon className="size-[18px] text-electric" aria-hidden />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** Estado vacío ilustrado con acción opcional. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center', className)}>
      {Icon && (
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-muted shadow-soft">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/** Bloques de carga (skeleton). */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-2xl bg-line/60', className)} />
}

export function SkeletonList({ rows = 3, className = 'h-24' }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

/** Error amigable con reintento (nunca muestra mensajes técnicos). */
export function ErrorState({ title = 'No pudimos cargar la información.', description, onRetry }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description ?? 'Revisa tu conexión e inténtalo de nuevo.'}</p>
      {onRetry && (
        <Button variant="secondary" leadingIcon={RotateCcw} className="mt-5" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

/** Mensaje de error de formulario. */
export function FormError({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      {message}
    </p>
  )
}

/** Clases compartidas para inputs. */
export const inputClass =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-electric focus:ring-4 focus:ring-electric/10 disabled:bg-surface'

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

/** Primer mensaje de error de validación del backend para un campo. */
export const fieldError = (err, field) => err?.data?.errors?.[field]

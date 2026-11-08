import { BadgeCheck, CircleAlert, Hash, QrCode, Trash2 } from 'lucide-react'
import { PART_TYPE_LABELS } from '../../utils/status'
import { formatCurrency, formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'

/**
 * Pieza utilizada (trazabilidad interna).
 * "Verificada" significa que el técnico registró y revisó la pieza dentro de PROTEC;
 * no implica certificación del fabricante.
 */
export default function PartCard({ part, onRemove, removing = false, showCost = true }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-4">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-2xl',
          part.verificada ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}
      >
        {part.verificada ? <BadgeCheck className="size-5" aria-hidden /> : <CircleAlert className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-ink">{part.nombre}</p>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted">{PART_TYPE_LABELS[part.tipo] ?? part.tipo}</span>
        </div>
        <dl className="mt-1.5 grid gap-x-5 gap-y-1 text-sm text-muted sm:grid-cols-2">
          {part.marca && (
            <div>
              <dt className="sr-only">Marca</dt>
              <dd>Marca: <span className="font-medium text-ink">{part.marca}</span></dd>
            </div>
          )}
          {part.numeroSerie && (
            <div className="flex items-center gap-1">
              <Hash className="size-3.5" aria-hidden />
              <dd className="font-mono text-xs text-ink">{part.numeroSerie}</dd>
            </div>
          )}
          {part.codigoQr && (
            <div className="flex items-center gap-1">
              <QrCode className="size-3.5" aria-hidden />
              <dd className="font-mono text-xs text-ink">{part.codigoQr}</dd>
            </div>
          )}
          <div>
            <dd className={part.verificada ? 'text-emerald-700' : 'text-amber-700'}>
              {part.verificada ? 'Verificada por el técnico en PROTEC' : 'Pendiente de verificación'}
            </dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-muted/80">Registrada el {formatDate(part.fecha)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {showCost && <span className="text-sm font-bold text-ink tabular-nums">{formatCurrency(part.costo ?? 0)}</span>}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(part)}
            disabled={removing}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Eliminar ${part.nombre}`}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

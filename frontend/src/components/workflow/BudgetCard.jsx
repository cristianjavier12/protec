import { useState } from 'react'
import { Check, Clock3, FileText, X } from 'lucide-react'
import Button from '../ui/Button'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

const STATE_STYLE = {
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Aceptado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rechazado: 'bg-red-50 text-red-700 ring-red-200',
}

/**
 * Presupuesto de reparación. Si `onRespond` existe y está pendiente,
 * se muestran los botones Aceptar / Rechazar.
 */
export default function BudgetCard({ budget, onRespond, busy = false }) {
  const [confirmReject, setConfirmReject] = useState(false)
  if (!budget) return null
  const pending = budget.estado === 'Pendiente'
  const actionable = pending && onRespond

  return (
    <div
      className={cn(
        'rounded-3xl border p-5 sm:p-7',
        actionable ? 'border-electric/30 bg-gradient-to-br from-electric/[0.06] to-aqua/[0.08] shadow-card' : 'border-line bg-white shadow-soft',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-navy text-aqua">
            <FileText className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-ink">{actionable ? 'Presupuesto disponible' : 'Presupuesto'}</h2>
            <p className="text-xs text-muted">Enviado el {formatDateTime(budget.fecha)}</p>
          </div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', STATE_STYLE[budget.estado])}>{budget.estado}</span>
      </div>

      <div className="mt-5 rounded-2xl bg-white/80 p-4 ring-1 ring-line">
        <p className="text-xs font-semibold text-muted">Diagnóstico técnico</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink">{budget.diagnostico}</p>
        {budget.tiempoEstimado && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <Clock3 className="size-3.5" aria-hidden /> Tiempo estimado: {budget.tiempoEstimado}
          </p>
        )}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between rounded-xl bg-white/70 px-4 py-2.5 ring-1 ring-line">
          <dt className="text-muted">Mano de obra</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatCurrency(budget.manoObra)}</dd>
        </div>
        <div className="flex justify-between rounded-xl bg-white/70 px-4 py-2.5 ring-1 ring-line">
          <dt className="text-muted">Piezas</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatCurrency(budget.costoPiezas)}</dd>
        </div>
        <div className="flex justify-between rounded-xl bg-navy px-4 py-3 text-white sm:col-span-2">
          <dt className="font-medium text-white/80">Costo total</dt>
          <dd className="text-lg font-extrabold tabular-nums">{formatCurrency(budget.costoTotal)}</dd>
        </div>
        <div className="flex justify-between rounded-xl bg-electric/10 px-4 py-2.5 sm:col-span-2">
          <dt className="font-medium text-electric">Anticipo requerido (50 %)</dt>
          <dd className="font-bold text-electric tabular-nums">{formatCurrency(budget.anticipoRequerido)}</dd>
        </div>
      </dl>

      {actionable && (
        <div className="mt-5">
          {confirmReject ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">¿Seguro que deseas rechazar el presupuesto?</p>
              <p className="mt-1 text-xs text-red-600/80">El técnico podrá enviarte una nueva propuesta.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setConfirmReject(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button size="sm" className="bg-red-600 shadow-none hover:bg-red-700" loading={busy} onClick={() => onRespond(false)}>
                  Sí, rechazar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button leadingIcon={Check} loading={busy} onClick={() => onRespond(true)} className="sm:flex-1">
                Aceptar presupuesto
              </Button>
              <Button variant="secondary" leadingIcon={X} disabled={busy} onClick={() => setConfirmReject(true)} className="sm:flex-1">
                Rechazar presupuesto
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

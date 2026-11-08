import { formatCurrency } from '../../utils/format'
import { cn } from '../../utils/cn'

function Row({ label, value, strong, tone }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn('tabular-nums', strong ? 'text-base font-extrabold text-ink' : 'font-semibold text-ink', tone)}>{value}</span>
    </div>
  )
}

const METHOD_LABELS = { Tarjeta: 'Tarjeta (Stripe)', Transferencia: 'Transferencia', Efectivo: 'Efectivo' }
export const paymentMethodLabel = (metodo) => METHOD_LABELS[metodo] ?? metodo

/**
 * Resumen de pagos: total, anticipo y saldo.
 * `highlight`: 'anticipo' | 'pago_final' resalta el monto a pagar.
 */
export default function PaymentSummary({ resumen, highlight, className }) {
  if (!resumen) return null
  const { costoTotal, anticipoRequerido, anticipoPagado, pagoFinalPagado, saldoPendiente } = resumen
  return (
    <div className={cn('divide-y divide-line rounded-2xl bg-surface px-4', className)}>
      <Row label="Costo total" value={formatCurrency(costoTotal)} />
      {anticipoPagado > 0 ? (
        <Row label="Anticipo pagado" value={`− ${formatCurrency(anticipoPagado)}`} tone="text-emerald-600" />
      ) : (
        <Row label="Anticipo requerido (50 %)" value={formatCurrency(anticipoRequerido)} tone={highlight === 'anticipo' ? 'text-electric' : ''} strong={highlight === 'anticipo'} />
      )}
      {pagoFinalPagado > 0 && <Row label="Pago final" value={`− ${formatCurrency(pagoFinalPagado)}`} tone="text-emerald-600" />}
      <Row
        label={highlight === 'anticipo' ? 'Saldo restante después del anticipo' : 'Saldo pendiente'}
        value={formatCurrency(highlight === 'anticipo' ? costoTotal - anticipoRequerido : saldoPendiente)}
        strong={highlight === 'pago_final'}
        tone={highlight === 'pago_final' ? 'text-electric' : ''}
      />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Bell, CircleDollarSign, FileText, MessageSquare, Truck, Wrench, Activity, Check } from 'lucide-react'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

const TYPE_META = {
  estado: { icon: Activity, className: 'bg-sky-50 text-sky-600' },
  mensaje: { icon: MessageSquare, className: 'bg-electric/10 text-electric' },
  presupuesto: { icon: FileText, className: 'bg-amber-50 text-amber-600' },
  pago: { icon: CircleDollarSign, className: 'bg-emerald-50 text-emerald-600' },
  logistica: { icon: Truck, className: 'bg-indigo-50 text-indigo-600' },
  reparacion: { icon: Wrench, className: 'bg-navy text-aqua' },
  sistema: { icon: Bell, className: 'bg-slate-100 text-slate-600' },
}

/** Elemento de notificación (dropdown y página /notificaciones). */
export default function NotificationItem({ notification: n, to, onRead, compact = false, onNavigate }) {
  const meta = TYPE_META[n.tipo] ?? TYPE_META.sistema
  const Icon = meta.icon
  const content = (
    <>
      <span className={cn('grid shrink-0 place-items-center rounded-xl', compact ? 'size-9' : 'size-10', meta.className)}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm text-ink', n.leida ? 'font-medium' : 'font-bold')}>{n.titulo}</p>
          {!n.leida && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-electric" aria-label="No leída" />}
        </div>
        <p className={cn('mt-0.5 text-sm text-muted', compact && 'line-clamp-2')}>{n.mensaje}</p>
        <p className="mt-1 text-xs text-muted/80">
          {formatDateTime(n.fecha)}
          {n.folio && <span className="ml-2 font-semibold text-electric">{n.folio}</span>}
        </p>
      </div>
    </>
  )

  const base = cn(
    'flex w-full items-start gap-3 rounded-2xl p-3 text-left transition',
    n.leida ? 'hover:bg-surface' : 'bg-electric/[0.04] hover:bg-electric/[0.08]',
  )

  return (
    <div className="group relative">
      {to ? (
        <Link to={to} className={base} onClick={() => { if (!n.leida) onRead?.(n.id); onNavigate?.() }}>
          {content}
        </Link>
      ) : (
        <div className={base}>{content}</div>
      )}
      {!compact && !n.leida && onRead && (
        <button
          type="button"
          onClick={() => onRead(n.id)}
          className="absolute top-3 right-3 hidden items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-electric shadow-soft transition hover:bg-electric/10 group-hover:inline-flex focus:inline-flex"
        >
          <Check className="size-3.5" aria-hidden /> Marcar como leída
        </button>
      )}
    </div>
  )
}

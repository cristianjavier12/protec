import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, UserRound } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { ProgressBar } from '../tracking/TrackingElements'
import { getDeviceMeta } from '../../utils/repairs'
import { formatDate } from '../../utils/format'

/** Tarjeta resumen de una reparación (dashboard del usuario). */
export default function RepairCard({ repair, to, actionLabel = 'Ver reparación' }) {
  const meta = getDeviceMeta(repair.dispositivo?.tipo)
  return (
    <article className="group flex flex-col gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-electric/30 hover:shadow-card">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
          <meta.icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold whitespace-nowrap text-electric">{repair.folio}</p>
          <p className="truncate font-bold text-ink">
            {repair.dispositivo?.marca} {repair.dispositivo?.modelo}
          </p>
        </div>
      </div>
      <StatusBadge estado={repair.estado} className="self-start" />
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-4" aria-hidden />
          {repair.tecnico?.nombre ?? 'Técnico por asignar'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4" aria-hidden />
          {formatDate(repair.fechaCreacion)}
        </span>
      </div>
      <ProgressBar value={repair.progreso} />
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-electric transition hover:gap-2.5"
      >
        {actionLabel} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  )
}

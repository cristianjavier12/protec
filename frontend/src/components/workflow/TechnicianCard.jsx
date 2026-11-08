import { BadgeCheck, Star, Wrench } from 'lucide-react'
import { SPECIALTY_LABELS } from '../../utils/status'

/**
 * Perfil público del técnico asignado.
 * Solo nombre, especialidad, calificación y servicios terminados (sin correo ni teléfono).
 */
export default function TechnicianCard({ technician, searching = false }) {
  if (!technician) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 p-5">
        <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-600 shadow-soft">
          <Wrench className="size-5" aria-hidden />
          {searching && <span className="absolute -top-1 -right-1 size-3 animate-ping rounded-full bg-amber-400" />}
        </span>
        <div>
          <p className="font-semibold text-ink">{searching ? 'Estamos buscando un técnico disponible.' : 'Técnico por asignar'}</p>
          <p className="mt-0.5 text-sm text-muted">Te avisaremos en cuanto un especialista tome tu solicitud.</p>
        </div>
      </div>
    )
  }

  const initials = technician.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const rating = Number(technician.calificacion ?? 0)

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-lg font-bold text-white shadow-glow">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-bold text-ink">
          {technician.nombre}
          <BadgeCheck className="size-4 shrink-0 text-electric" aria-label="Técnico de PROTEC" />
        </p>
        <p className="text-sm text-muted">Especialista en {SPECIALTY_LABELS[technician.especialidad]?.toLowerCase() ?? technician.especialidad}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
            {rating.toFixed(1)}
          </span>
          <span className="text-muted">
            {technician.serviciosTerminados} {technician.serviciosTerminados === 1 ? 'servicio terminado' : 'servicios terminados'}
          </span>
        </div>
      </div>
    </div>
  )
}

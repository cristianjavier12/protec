import { ArrowRight, Laptop, UserRound, Hash, Activity, Clock3, Bell } from 'lucide-react'
import { Section } from '../ui/Container'
import SectionHeader from '../ui/SectionHeader'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import { ProgressBar, StatusTimeline, StatusBadge } from '../tracking/TrackingElements'
import { findMockRepair, getStatusLabel, DEMO_FOLIO } from '../../data/trackingMock'
import { ROUTES } from '../../utils/routes'
import { formatDateTime } from '../../utils/format'

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface/60 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-electric shadow-soft ring-1 ring-line">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="mt-0.5 truncate font-semibold text-ink">{children}</div>
      </div>
    </div>
  )
}

/** Vista ilustrativa del seguimiento (datos de muestra para la página de inicio). */
export default function TrackingPreview() {
  const repair = findMockRepair(DEMO_FOLIO)

  return (
    <section id="seguimiento" className="bg-navy-gradient relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] max-w-full -translate-x-1/2 rounded-full bg-electric/25 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        <SectionHeader
          tone="dark"
          eyebrow="Seguimiento en tiempo real"
          title="Siempre sabrás qué está pasando"
          description="Consulta el estado de tu reparación, el técnico asignado y cada actualización desde cualquier dispositivo."
        />

        <Reveal className="mt-14 lg:mt-16">
          <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/30 backdrop-blur sm:p-3">
            <div className="overflow-hidden rounded-[1.4rem] bg-white">
              {/* barra de ventana */}
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-300" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="truncate text-xs font-medium text-muted">protec.app/seguimiento</p>
                <Bell className="size-4 text-muted" aria-hidden />
              </div>

              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted">Mi reparación</p>
                      <p className="text-xl font-bold text-ink sm:text-2xl">#{repair.folio}</p>
                    </div>
                    <StatusBadge label={getStatusLabel(repair.status)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoItem icon={Hash} label="Solicitud">
                      #{repair.folio}
                    </InfoItem>
                    <InfoItem icon={Laptop} label="Dispositivo">
                      {repair.device.label}
                    </InfoItem>
                    <InfoItem icon={Activity} label="Estado">
                      {getStatusLabel(repair.status)}
                    </InfoItem>
                    <InfoItem icon={UserRound} label="Técnico">
                      {repair.technician.name}
                    </InfoItem>
                  </div>

                  <ProgressBar value={repair.progress} label="Progreso de la reparación" />

                  <div className="rounded-2xl border border-electric/15 bg-gradient-to-br from-electric/[0.06] to-aqua/[0.06] p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-electric uppercase">
                      <Clock3 className="size-3.5" aria-hidden />
                      Última actualización
                    </p>
                    <p className="mt-2 font-medium text-ink">{repair.lastUpdate.message}</p>
                    <p className="mt-1 text-xs text-muted">{formatDateTime(repair.lastUpdate.date)}</p>
                  </div>

                  <Button to={ROUTES.TRACKING} icon={ArrowRight} className="self-start">
                    Consultar mi folio
                  </Button>
                </div>

                <div className="rounded-2xl border border-line p-5 sm:p-6">
                  <p className="mb-5 text-sm font-semibold text-ink">Progreso del servicio</p>
                  <StatusTimeline status={repair.status} history={repair.history} variant="compact" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Section } from '../ui/Container'
import SectionHeader from '../ui/SectionHeader'
import Reveal from '../ui/Reveal'
import { DEVICE_TYPES } from '../../data/devices'
import { requestRepairWithDevice } from '../../utils/routes'

/** Tarjeta de dispositivo. */
function DeviceCard({ device, delay }) {
  const Icon = device.icon
  return (
    <Reveal delay={delay} className="h-full md:last:col-span-2 lg:last:col-span-1">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-electric/30 hover:shadow-card sm:p-8">
        {/* brillo superior */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-gradient-to-br from-electric/15 to-aqua/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative flex items-start justify-between">
          <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-navy to-navy-700 text-aqua shadow-lg shadow-navy/20 transition-transform duration-300 group-hover:scale-105">
            <Icon className="size-7" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {device.plural}
          </span>
        </div>

        <h3 className="relative mt-7 text-2xl font-bold text-ink">{device.plural}</h3>
        <p className="relative mt-3 leading-relaxed text-muted">{device.description}</p>

        <ul className="relative mt-6 flex flex-wrap gap-2">
          {device.issues.slice(0, 4).map((issue) => (
            <li
              key={issue}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink/70"
            >
              <Check className="size-3 text-electric" aria-hidden />
              {issue}
            </li>
          ))}
        </ul>

        <div className="relative mt-auto pt-8">
          <Link
            to={requestRepairWithDevice(device.id)}
            state={{ device: device.id }}
            className="inline-flex h-12 w-full items-center justify-between rounded-xl bg-surface px-5 text-sm font-semibold text-ink transition-all duration-300 group-hover:bg-electric group-hover:text-white group-hover:shadow-glow"
          >
            {device.cta}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </article>
    </Reveal>
  )
}

export default function DevicesSection() {
  return (
    <Section id="dispositivos">
      <SectionHeader
        eyebrow="Dispositivos"
        title="¿Qué necesitas reparar?"
        description="Selecciona el tipo de dispositivo y comienza tu solicitud en menos de un minuto."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
        {DEVICE_TYPES.map((device, i) => (
          <DeviceCard key={device.id} device={device} delay={i * 90} />
        ))}
      </div>
    </Section>
  )
}

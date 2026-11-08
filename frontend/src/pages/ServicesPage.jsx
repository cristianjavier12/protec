import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Wrench } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import { Section } from '../components/ui/Container'
import SectionHeader from '../components/ui/SectionHeader'
import Reveal from '../components/ui/Reveal'
import IconBadge from '../components/ui/IconBadge'
import Button from '../components/ui/Button'
import CTASection from '../components/home/CTASection'
import { serviceCatalog } from '../data/services'
import { ROUTES } from '../utils/routes'
import { usePageTitle } from '../hooks/usePageTitle'

function RepairServiceCard({ service, delay }) {
  const Icon = service.icon
  return (
    <Reveal delay={delay} className="h-full">
      <article
        id={service.anchor}
        className="group relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
      >
        <div className="bg-navy-gradient relative overflow-hidden p-7 sm:p-8">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full bg-electric/30 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative flex items-center justify-between">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/[0.08] text-aqua ring-1 ring-white/10">
              <Icon className="size-7" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70">
              {service.category}
            </span>
          </div>
          <h3 className="relative mt-6 text-2xl font-bold text-white">{service.title}</h3>
        </div>

        <div className="flex flex-1 flex-col p-7 sm:p-8">
          <p className="leading-relaxed text-muted">{service.description}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {service.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-ink/85">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-electric" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <Button to={service.cta.to} fullWidth icon={ArrowRight}>
              {service.cta.label}
            </Button>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

function PlatformServiceCard({ service, delay }) {
  return (
    <Reveal delay={delay} className="h-full">
      <article
        id={service.anchor}
        className="group flex h-full scroll-mt-28 flex-col rounded-3xl border border-line bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-electric/25 hover:shadow-card"
      >
        <div className="flex items-center justify-between">
          <IconBadge
            icon={service.icon}
            className="group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow group-hover:ring-0"
          />
          <span className="text-xs font-semibold text-muted">{service.category}</span>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-ink">{service.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
        <ul className="mt-5 flex flex-col gap-2">
          {service.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink/80">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aqua" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <Link
          to={service.cta.to}
          className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-electric hover:gap-2.5"
          style={{ transition: 'gap .2s' }}
        >
          {service.cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </article>
    </Reveal>
  )
}

export default function ServicesPage() {
  usePageTitle('Servicios')
  const repairs = serviceCatalog.filter((s) => s.featured)
  const platform = serviceCatalog.filter((s) => !s.featured)

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        eyebrowIcon={Wrench}
        title={
          <>
            Reparación y atención <span className="text-gradient">de principio a fin</span>
          </>
        }
        description="Atendemos celulares, laptops y computadoras con un proceso digital que incluye diagnóstico, atención técnica, seguimiento y entrega."
      >
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button to={ROUTES.REQUEST_REPAIR} size="lg" icon={ArrowRight}>
            Solicitar reparación
          </Button>
          <Button to={ROUTES.DIAGNOSIS} size="lg" variant="secondary">
            Iniciar diagnóstico
          </Button>
        </div>
      </PageHero>

      <Section>
        <SectionHeader
          eyebrow="Reparación"
          title="Dispositivos que atendemos"
          description="Cada solicitud comienza con información clara del dispositivo y del problema."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {repairs.map((s, i) => (
            <div key={s.anchor} className="md:last:col-span-2 lg:last:col-span-1">
              <RepairServiceCard service={s} delay={i * 90} />
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-surface">
        <SectionHeader
          eyebrow="Plataforma"
          title="Más que una reparación"
          description="Herramientas que acompañan tu servicio en cada etapa."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platform.map((s, i) => (
            <PlatformServiceCard key={s.anchor} service={s} delay={i * 80} />
          ))}
        </div>
      </Section>

      <CTASection
        title="¿Listo para reparar tu dispositivo?"
        description="Registra tu solicitud y da seguimiento a cada etapa desde PROTEC."
      />
    </>
  )
}

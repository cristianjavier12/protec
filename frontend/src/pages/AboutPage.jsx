import { ShieldCheck, Eye, Cpu, Sparkles, Layers, MessagesSquare, Route, ScanSearch } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import { Section } from '../components/ui/Container'
import SectionHeader from '../components/ui/SectionHeader'
import Reveal from '../components/ui/Reveal'
import IconBadge from '../components/ui/IconBadge'
import CTASection from '../components/home/CTASection'
import { LogoMark } from '../components/ui/Logo'
import { usePageTitle } from '../hooks/usePageTitle'

const values = [
  {
    icon: ShieldCheck,
    title: 'Confianza',
    description:
      'Cada dispositivo se atiende con cuidado y responsabilidad. Sabes quién lo atiende y qué se hace con él.',
  },
  {
    icon: Eye,
    title: 'Transparencia',
    description: 'Costos aproximados, avances y evidencias visibles en todo momento, sin sorpresas.',
  },
  {
    icon: Cpu,
    title: 'Tecnología',
    description: 'Herramientas digitales que simplifican el diagnóstico, la comunicación y el seguimiento.',
  },
]

const pillars = [
  { icon: ScanSearch, label: 'Diagnóstico' },
  { icon: Layers, label: 'Atención' },
  { icon: Route, label: 'Seguimiento' },
  { icon: MessagesSquare, label: 'Comunicación' },
]

export default function AboutPage() {
  usePageTitle('Nosotros')
  return (
    <>
      <PageHero
        eyebrow="Nosotros"
        eyebrowIcon={Sparkles}
        title={
          <>
            Tecnología para hacer más fácil <span className="text-gradient">una reparación</span>
          </>
        }
        description="PROTEC nace para centralizar diagnóstico, atención, seguimiento y comunicación en una sola experiencia digital."
      />

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-electric uppercase">Nuestra idea</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Reparar un dispositivo no debería ser complicado
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-muted sm:text-lg">
              <p>
                Cuando un celular, una laptop o una computadora falla, lo más difícil suele ser no saber qué está
                pasando: cuánto costará, cuánto tardará o en qué etapa se encuentra.
              </p>
              <p>
                PROTEC reúne todo ese proceso en un solo lugar. Desde un diagnóstico inicial guiado hasta la entrega
                del equipo, cada paso queda registrado y visible para ti.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="bg-navy-gradient relative overflow-hidden rounded-[2rem] p-8 sm:p-10">
              <div className="bg-grid-dark pointer-events-none absolute inset-0" />
              <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-electric/30 blur-3xl" />
              <div className="relative flex flex-col items-center">
                <span className="grid size-24 place-items-center rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur">
                  <LogoMark className="size-14" />
                </span>
                <div className="mt-8 grid w-full grid-cols-2 gap-3">
                  {pillars.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-aqua/30 hover:bg-white/[0.07]"
                    >
                      <Icon className="size-5 shrink-0 text-aqua" aria-hidden />
                      <span className="truncate text-sm font-semibold text-white">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-center text-sm text-white/60">Una sola plataforma, una experiencia completa.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-surface">
        <SectionHeader
          eyebrow="Valores"
          title="Lo que nos guía"
          description="Tres principios que definen cada parte de la experiencia PROTEC."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 90}>
              <article className="group h-full rounded-3xl border border-line bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                <IconBadge icon={v.icon} size="lg" tone="solid" />
                <h3 className="mt-6 text-xl font-bold text-ink">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{v.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <CTASection />
    </>
  )
}

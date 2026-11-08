import { ArrowRight, PlayCircle, Smartphone, Laptop, Monitor } from 'lucide-react'
import Button from '../ui/Button'
import Eyebrow from '../ui/Eyebrow'
import { Container } from '../ui/Container'
import HeroIllustration from './HeroIllustration'
import { ROUTES } from '../../utils/routes'

const deviceChips = [
  { icon: Smartphone, label: 'Celulares' },
  { icon: Laptop, label: 'Laptops' },
  { icon: Monitor, label: 'Computadoras' },
]

const fade = (delay) => ({ animationDelay: `${delay}ms` })

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface via-white to-white pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      {/* Decoración */}
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-aqua/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-40 size-[24rem] rounded-full bg-electric/10 blur-3xl" />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="animate-fade-up" style={fade(0)}>
              <Eyebrow>Reparación inteligente de dispositivos</Eyebrow>
            </div>

            <h1
              className="animate-fade-up mt-6 text-[2.5rem] leading-[1.08] font-extrabold tracking-tight text-balance text-ink sm:text-6xl lg:text-[4rem]"
              style={fade(80)}
            >
              Tu dispositivo <span className="text-gradient">tiene solución.</span>
              <span className="mt-1 block text-ink/90">PROTEC te ayuda a encontrarla.</span>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted sm:text-lg"
              style={fade(160)}
            >
              Solicita una reparación, obtén un diagnóstico inicial y sigue cada etapa del servicio desde una sola
              plataforma.
            </p>

            <div
              className="animate-fade-up mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
              style={fade(240)}
            >
              <Button to={ROUTES.REQUEST_REPAIR} size="lg" icon={ArrowRight}>
                Solicitar reparación
              </Button>
              <Button to={`${ROUTES.HOME}#como-funciona`} size="lg" variant="secondary" leadingIcon={PlayCircle}>
                Ver cómo funciona
              </Button>
            </div>

            <ul
              className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start"
              style={fade(320)}
            >
              {deviceChips.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm font-medium text-muted">
                  <span className="grid size-7 place-items-center rounded-lg bg-white text-electric shadow-soft ring-1 ring-line">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up" style={fade(200)}>
            <HeroIllustration />
          </div>
        </div>
      </Container>
    </section>
  )
}

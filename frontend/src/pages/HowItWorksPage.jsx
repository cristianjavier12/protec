import { ArrowRight, Route } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import { Section } from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import Button from '../components/ui/Button'
import CTASection from '../components/home/CTASection'
import { fullProcess } from '../data/process'
import { ROUTES } from '../utils/routes'
import { cn } from '../utils/cn'
import { usePageTitle } from '../hooks/usePageTitle'

const PHASE_STYLES = {
  Solicitud: 'bg-electric/10 text-electric',
  Diagnóstico: 'bg-aqua/15 text-[#0a8fbd]',
  Acuerdo: 'bg-amber-50 text-amber-700',
  Reparación: 'bg-indigo-50 text-indigo-600',
  Entrega: 'bg-emerald-50 text-emerald-700',
}

function TimelineCard({ step, index }) {
  return (
    <div className="group rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-electric/25 hover:shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', PHASE_STYLES[step.phase])}>
          {step.phase}
        </span>
        <span className="text-sm font-bold text-line transition-colors group-hover:text-electric/40">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink sm:text-xl">{step.title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{step.description}</p>
    </div>
  )
}

export default function HowItWorksPage() {
  usePageTitle('Cómo funciona')

  return (
    <>
      <PageHero
        eyebrow="Cómo funciona"
        eyebrowIcon={Route}
        title={
          <>
            Cada etapa de tu reparación, <span className="text-gradient">clara y visible</span>
          </>
        }
        description="Desde que creas tu solicitud hasta que recibes tu dispositivo, PROTEC te acompaña en un proceso de 12 etapas."
      />

      <Section>
        <ol className="relative mx-auto max-w-5xl">
          {/* línea central (escritorio) / izquierda (móvil) */}
          <div
            aria-hidden
            className="absolute top-2 bottom-2 left-6 w-0.5 bg-gradient-to-b from-electric via-aqua to-emerald-400 opacity-40 md:left-1/2 md:-translate-x-1/2"
          />

          {fullProcess.map((step, i) => {
            const Icon = step.icon
            const isLeft = i % 2 === 0
            return (
              <li key={step.title} className="relative pb-10 last:pb-0 md:pb-14">
                <div className="grid grid-cols-[3rem_1fr] items-start gap-5 md:grid-cols-[1fr_4rem_1fr] md:gap-8">
                  {/* tarjeta izquierda (escritorio) */}
                  <div className={cn('hidden md:block', !isLeft && 'md:invisible')}>
                    {isLeft && (
                      <Reveal>
                        <TimelineCard step={step} index={i} />
                      </Reveal>
                    )}
                  </div>

                  {/* nodo */}
                  <div className="relative z-10 flex justify-center md:pt-6">
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow ring-8 ring-white md:size-14">
                      <Icon className="size-5 md:size-6" strokeWidth={1.9} aria-hidden />
                    </span>
                  </div>

                  {/* tarjeta derecha (escritorio) / única (móvil) */}
                  <div>
                    <Reveal className={cn(isLeft && 'md:hidden')}>
                      <TimelineCard step={step} index={i} />
                    </Reveal>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <Reveal className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-muted">¿Listo para empezar?</p>
          <Button to={ROUTES.REQUEST_REPAIR} size="lg" icon={ArrowRight}>
            Crear mi solicitud
          </Button>
        </Reveal>
      </Section>

      <CTASection />
    </>
  )
}

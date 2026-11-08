import { ArrowRight } from 'lucide-react'
import { Section } from '../ui/Container'
import SectionHeader from '../ui/SectionHeader'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import { homeSteps } from '../../data/process'
import { ROUTES } from '../../utils/routes'

/** Proceso de 6 pasos: horizontal en escritorio, vertical en móvil. */
export default function HowItWorksSection() {
  return (
    <Section id="como-funciona" className="overflow-hidden bg-surface">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative">
        <SectionHeader
          eyebrow="Cómo funciona"
          title="Del problema a la solución"
          description="Un proceso claro, guiado y visible de principio a fin."
        />

        <ol className="relative mt-14 grid gap-8 lg:mt-20 lg:grid-cols-6 lg:gap-5">
          {/* Línea conectora horizontal (escritorio) */}
          <div
            aria-hidden
            className="absolute top-8 right-[8.33%] left-[8.33%] hidden h-0.5 bg-gradient-to-r from-electric/60 via-aqua/60 to-electric/60 lg:block"
          />
          {/* Línea conectora vertical (móvil/tablet) */}
          <div
            aria-hidden
            className="absolute top-8 bottom-8 left-8 w-0.5 bg-gradient-to-b from-electric/60 via-aqua/60 to-electric/20 lg:hidden"
          />

          {homeSteps.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal
                as="li"
                key={step.number}
                delay={i * 80}
                className="group relative flex items-start gap-5 lg:flex-col lg:items-center lg:gap-6 lg:text-center"
              >
                <div className="relative z-10 shrink-0">
                  <span className="grid size-16 place-items-center rounded-2xl border border-line bg-white text-electric shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-transparent group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow">
                    <Icon className="size-6" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-navy text-[11px] font-bold text-white ring-4 ring-surface">
                    {step.number}
                  </span>
                </div>
                <div className="pt-2 lg:pt-0">
                  <h3 className="font-semibold text-ink lg:text-[15px]">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              </Reveal>
            )
          })}
        </ol>

        <Reveal className="mt-14 flex justify-center">
          <Button to={ROUTES.HOW_IT_WORKS} variant="secondary" icon={ArrowRight}>
            Ver el proceso completo
          </Button>
        </Reveal>
      </div>
    </Section>
  )
}

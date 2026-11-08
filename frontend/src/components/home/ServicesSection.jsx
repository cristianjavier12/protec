import { Section } from '../ui/Container'
import SectionHeader from '../ui/SectionHeader'
import Reveal from '../ui/Reveal'
import IconBadge from '../ui/IconBadge'
import { platformServices } from '../../data/features'

/** "Todo el proceso en un solo lugar". */
export default function ServicesSection() {
  return (
    <Section id="servicios">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.6fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            align="left"
            eyebrow="Plataforma"
            title="Todo el proceso en un solo lugar"
            description="Desde el primer diagnóstico hasta la entrega, PROTEC reúne cada etapa de la reparación en una experiencia digital."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {platformServices.map((service, i) => (
            <Reveal key={service.title} delay={(i % 2) * 90}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-line bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-electric/25 hover:shadow-card">
                <span className="absolute top-6 right-6 text-xs font-bold text-line transition-colors group-hover:text-electric/30">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <IconBadge
                  icon={service.icon}
                  className="group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow group-hover:ring-0"
                />
                <h3 className="mt-6 text-lg font-semibold text-ink">{service.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{service.description}</p>
                <div className="absolute inset-x-7 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-brand-gradient transition-transform duration-500 group-hover:scale-x-100" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

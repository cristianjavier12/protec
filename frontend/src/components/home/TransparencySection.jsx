import { Section } from '../ui/Container'
import SectionHeader from '../ui/SectionHeader'
import Reveal from '../ui/Reveal'
import IconBadge from '../ui/IconBadge'
import { transparencyItems } from '../../data/features'

export default function TransparencySection() {
  return (
    <Section id="transparencia">
      <SectionHeader
        eyebrow="Confianza"
        title="Tu dispositivo siempre bajo control"
        description="Información clara en cada etapa para que sepas exactamente qué ocurre con tu equipo."
      />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
        {transparencyItems.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <article className="group h-full rounded-3xl border border-line bg-gradient-to-b from-white to-surface/60 p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-electric/25 hover:shadow-card">
              <IconBadge
                icon={item.icon}
                size="lg"
                tone="white"
                className="mx-auto group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow group-hover:ring-0"
              />
              <h3 className="mt-6 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{item.description}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

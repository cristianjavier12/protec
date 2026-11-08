import { Container } from '../ui/Container'
import IconBadge from '../ui/IconBadge'
import Reveal from '../ui/Reveal'
import { highlights } from '../../data/features'

/** Franja de indicadores bajo el Hero. */
export default function FeatureStrip() {
  return (
    <section aria-label="Características principales" className="relative z-10 -mt-4 sm:-mt-6">
      <Container>
        <Reveal className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, i) => (
            <div
              key={item.title}
              className={[
                'group flex items-start gap-4 p-6 transition-colors duration-300 hover:bg-surface/70 sm:p-7',
                i > 0 && 'border-t border-line sm:border-t-0',
                i % 2 === 1 && 'sm:border-l',
                i >= 2 && 'sm:border-t lg:border-t-0',
                i === 2 && 'lg:border-l',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <IconBadge
                icon={item.icon}
                className="group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-glow group-hover:ring-0"
              />
              <div>
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  )
}

import { LifeBuoy, Bot, Route, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/ui/PageHero'
import { Container } from '../components/ui/Container'
import Accordion from '../components/ui/Accordion'
import Reveal from '../components/ui/Reveal'
import ContactInfo from '../components/layout/ContactInfo'
import { faqs } from '../data/faq'
import { ROUTES } from '../utils/routes'
import { hasContact } from '../config/business'
import { usePageTitle } from '../hooks/usePageTitle'

const helpLinks = [
  { icon: Bot, title: 'Diagnóstico', text: 'Identifica posibles causas con el asistente.', to: ROUTES.DIAGNOSIS },
  { icon: Route, title: 'Seguimiento', text: 'Consulta el estado de tu reparación.', to: ROUTES.TRACKING },
]

export default function HelpPage() {
  usePageTitle('Ayuda')
  return (
    <>
      <PageHero
        eyebrow="Centro de ayuda"
        eyebrowIcon={LifeBuoy}
        title={
          <>
            ¿En qué podemos <span className="text-gradient">ayudarte?</span>
          </>
        }
        description="Encuentra respuestas a las preguntas más frecuentes sobre PROTEC."
      />

      <section className="py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
            <Reveal>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-ink">Preguntas frecuentes</h2>
              <Accordion items={faqs} defaultOpen={[faqs[0].id]} />
            </Reveal>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
              {helpLinks.map(({ icon: Icon, title, text, to }) => (
                <Link
                  key={title}
                  to={to}
                  className="group flex items-start gap-4 rounded-3xl border border-line bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-electric/30 hover:shadow-card"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric transition group-hover:bg-electric group-hover:text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-sm text-muted">{text}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-electric" />
                </Link>
              ))}

              {hasContact && (
                <div className="bg-navy-gradient rounded-3xl p-6 text-white">
                  <LifeBuoy className="size-7 text-aqua" aria-hidden />
                  <p className="mt-4 font-semibold">¿No encontraste tu respuesta?</p>
                  <p className="mt-1 text-sm text-white/70">Contáctanos y te ayudaremos lo antes posible.</p>
                  <ContactInfo tone="dark" className="mt-5" />
                </div>
              )}
            </aside>
          </div>
        </Container>
      </section>
    </>
  )
}

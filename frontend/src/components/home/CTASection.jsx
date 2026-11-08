import { ArrowRight, Bot } from 'lucide-react'
import { Container } from '../ui/Container'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import { LogoMark } from '../ui/Logo'
import { ROUTES } from '../../utils/routes'

/** Llamado a la acción final. Reutilizable en otras páginas. */
export default function CTASection({
  title = '¿Tu dispositivo necesita reparación?',
  description = 'Cuéntanos qué sucede y comienza tu diagnóstico.',
  showSecondary = true,
}) {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Container>
        <Reveal>
          <div className="bg-navy-gradient relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 sm:py-20 lg:py-24">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
            <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-electric/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-aqua/20 blur-3xl" />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <span className="animate-float grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur">
                <LogoMark className="size-10" />
              </span>
              <h2 className="mt-8 text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
                {title}
              </h2>
              <p className="mt-4 text-base text-white/70 sm:text-lg">{description}</p>
              <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <Button to={ROUTES.REQUEST_REPAIR} size="lg" icon={ArrowRight}>
                  Solicitar reparación
                </Button>
                {showSecondary && (
                  <Button to={ROUTES.DIAGNOSIS} size="lg" variant="outlineLight" leadingIcon={Bot}>
                    Iniciar diagnóstico
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

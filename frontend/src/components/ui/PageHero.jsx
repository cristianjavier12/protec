import { Container } from './Container'
import Eyebrow from './Eyebrow'
import { cn } from '../../utils/cn'

/** Encabezado para páginas internas (Servicios, Cómo funciona, etc.). */
export default function PageHero({ eyebrow, eyebrowIcon, title, description, children, className }) {
  return (
    <section className={cn('relative overflow-hidden bg-surface pt-32 pb-16 sm:pt-36 sm:pb-20', className)}>
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] max-w-full -translate-x-1/2 rounded-full bg-electric/10 blur-3xl" />
      <Container className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
          <h1 className="text-4xl font-extrabold tracking-tight text-balance text-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted sm:text-lg">{description}</p>
          )}
          {children}
        </div>
      </Container>
    </section>
  )
}

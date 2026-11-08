import { cn } from '../../utils/cn'
import Eyebrow from './Eyebrow'
import Reveal from './Reveal'

/** Encabezado estándar de sección: etiqueta + título + descripción. */
export default function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
  children,
}) {
  const isCenter = align === 'center'
  return (
    <Reveal
      className={cn(
        'flex max-w-2xl flex-col gap-4',
        isCenter ? 'mx-auto items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <Eyebrow icon={eyebrowIcon} tone={tone}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2
        className={cn(
          'text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]',
          tone === 'dark' ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'text-base leading-relaxed text-pretty sm:text-lg',
            tone === 'dark' ? 'text-white/70' : 'text-muted',
          )}
        >
          {description}
        </p>
      )}
      {children}
    </Reveal>
  )
}

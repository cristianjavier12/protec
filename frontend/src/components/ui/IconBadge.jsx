import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'size-9 rounded-xl [&>svg]:size-4',
  md: 'size-12 rounded-2xl [&>svg]:size-5',
  lg: 'size-14 rounded-2xl [&>svg]:size-6',
}

const TONES = {
  soft: 'bg-electric/[0.08] text-electric ring-1 ring-electric/10',
  solid: 'bg-brand-gradient text-white shadow-glow',
  dark: 'bg-white/[0.08] text-aqua ring-1 ring-white/10',
  white: 'bg-white text-electric shadow-soft ring-1 ring-line',
}

/** Contenedor cuadrado para iconos Lucide. */
export default function IconBadge({ icon: Icon, size = 'md', tone = 'soft', className }) {
  return (
    <span className={cn('grid shrink-0 place-items-center transition-all duration-300', SIZES[size], TONES[tone], className)}>
      <Icon aria-hidden strokeWidth={1.9} />
    </span>
  )
}

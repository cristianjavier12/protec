import { cn } from '../../utils/cn'

/** Etiqueta superior tipo "pill" para títulos de sección. */
export default function Eyebrow({ icon: Icon, children, tone = 'light', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide',
        tone === 'light' && 'border border-electric/15 bg-electric/[0.07] text-brand',
        tone === 'dark' && 'border border-white/15 bg-white/[0.06] text-aqua',
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-3.5" aria-hidden />
      ) : (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-aqua opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-electric" />
        </span>
      )}
      {children}
    </span>
  )
}

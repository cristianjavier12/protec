import { useId } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { ROUTES } from '../../utils/routes'

/** Isotipo de PROTEC: escudo + trazos de circuito + nodo. */
export function LogoMark({ className }) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className || 'size-9'} aria-hidden>
      <defs>
        <linearGradient id={`lg-${gid}`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#247CFF" />
          <stop offset="1" stopColor="#18C8FF" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 34.5 8v11.2c0 9-6.1 15.6-14.5 18.3C11.6 34.8 5.5 28.2 5.5 19.2V8L20 2.5Z"
        fill={`url(#lg-${gid})`}
      />
      <path
        d="M20 2.5 34.5 8v11.2c0 9-6.1 15.6-14.5 18.3"
        stroke="#fff"
        strokeOpacity=".25"
        strokeWidth="1"
      />
      <path
        d="M14 15h6l3 3h4M14 21h4l3 3h6M14 27h6"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="18" r="1.8" fill="#fff" />
      <circle cx="28" cy="24" r="1.8" fill="#fff" />
    </svg>
  )
}

/** Logo completo con enlace al inicio (o a `to`, p. ej. el panel del rol). */
export default function Logo({ tone = 'dark', className, onClick, to = ROUTES.HOME }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="PROTEC, ir al inicio"
    >
      <LogoMark className="size-9 transition-transform duration-300 group-hover:scale-105" />
      <span
        className={cn(
          'text-xl font-extrabold tracking-tight',
          tone === 'dark' ? 'text-ink' : 'text-white',
        )}
      >
        PRO<span className="text-gradient">TEC</span>
      </span>
    </Link>
  )
}

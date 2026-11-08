import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const VARIANTS = {
  primary:
    'bg-electric text-white shadow-glow hover:bg-electric-600 hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-white text-ink border border-line shadow-soft hover:border-electric/40 hover:text-electric hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'text-ink hover:bg-surface hover:text-electric',
  light: 'bg-white text-navy shadow-soft hover:bg-surface hover:-translate-y-0.5 active:translate-y-0',
  outlineLight:
    'border border-white/25 text-white hover:bg-white/10 hover:border-white/40 hover:-translate-y-0.5 active:translate-y-0',
}

const SIZES = {
  sm: 'h-10 px-4 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
}

/**
 * Botón polimórfico:
 *  - `to`   -> <Link> de React Router
 *  - `href` -> <a>
 *  - otro   -> <button>
 */
const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    leadingIcon: LeadingIcon,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = cn(
    'group inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 ease-out select-none',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        LeadingIcon && <LeadingIcon className="size-4" aria-hidden />
      )}
      <span>{children}</span>
      {Icon && !loading && (
        <Icon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      )}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }

  const Component = as ?? 'button'
  return (
    <Component ref={ref} type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </Component>
  )
})

export default Button

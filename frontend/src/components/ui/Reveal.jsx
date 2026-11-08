import { useInView } from '../../hooks/useInView'
import { cn } from '../../utils/cn'

/** Envuelve contenido con una animación de entrada discreta al hacer scroll. */
export default function Reveal({ as: Component = 'div', delay = 0, className, style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Component
      ref={ref}
      className={cn('reveal', inView && 'is-visible', className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Component>
  )
}

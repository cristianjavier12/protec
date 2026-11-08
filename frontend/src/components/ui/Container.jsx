import { cn } from '../../utils/cn'

export function Container({ className, children, ...rest }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8', className)} {...rest}>
      {children}
    </div>
  )
}

/** Sección con espaciado vertical consistente. */
export function Section({ id, className, containerClassName, children, ...rest }) {
  return (
    <section id={id} className={cn('relative py-20 sm:py-24 lg:py-28', className)} {...rest}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}

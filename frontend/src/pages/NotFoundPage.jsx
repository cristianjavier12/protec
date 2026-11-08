import { Home, Wrench } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import { ROUTES } from '../utils/routes'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Página no encontrada')
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-surface pt-28 pb-20">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <Container className="relative text-center">
        <p className="text-gradient text-8xl font-extrabold tracking-tight sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">No encontramos esta página</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Es posible que el enlace haya cambiado. Vuelve al inicio o solicita una reparación.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to={ROUTES.HOME} leadingIcon={Home}>
            Ir al inicio
          </Button>
          <Button to={ROUTES.REQUEST_REPAIR} variant="secondary" leadingIcon={Wrench}>
            Solicitar reparación
          </Button>
        </div>
      </Container>
    </section>
  )
}

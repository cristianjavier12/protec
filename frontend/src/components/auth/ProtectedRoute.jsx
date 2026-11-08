import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PageLoader from '../layout/PageLoader'
import Button from '../ui/Button'
import { Container } from '../ui/Container'
import { ROUTES, homeForRole } from '../../utils/routes'

function AccessDenied({ rol }) {
  return (
    <section className="bg-surface pt-28 pb-20">
      <Container className="max-w-lg">
        <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-bold text-ink">Acceso denegado</h1>
          <p className="mt-2 text-sm text-muted">Tu cuenta no tiene permisos para acceder a esta sección.</p>
          <Button to={homeForRole(rol)} leadingIcon={ArrowLeft} className="mt-7">
            Ir a mi panel
          </Button>
        </div>
      </Container>
    </section>
  )
}

/**
 * Envuelve rutas que requieren autenticación (y opcionalmente un rol).
 * Si no hay sesión, redirige a /login con state.from para regresar después.
 * La autorización real siempre se valida también en el backend.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user?.rol)) {
    return <AccessDenied rol={user?.rol} />
  }

  return children
}

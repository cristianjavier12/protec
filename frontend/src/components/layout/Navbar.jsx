import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, UserRound, LogIn, LogOut, ChevronDown, Search, Loader2 } from 'lucide-react'
import Logo from '../ui/Logo'
import Button from '../ui/Button'
import { Container } from '../ui/Container'
import NotificationBell from './NotificationBell'
import { mainNav } from '../../data/navigation'
import { ROLE_NAV, ROUTES, homeForRole } from '../../utils/routes'
import { useScrolled } from '../../hooks/useScrolled'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { searchService } from '../../services/index'
import { cn } from '../../utils/cn'

const ROLE_LABEL = { usuario: 'Cliente', tecnico: 'Técnico', admin: 'Administrador' }

/** Determina si un enlace (que puede incluir query string) está activo. */
function isItemActive(item, nav, location) {
  const [path] = item.to.split('?')
  const params = new URLSearchParams(location.search)
  if (item.tab) return location.pathname === path && (params.get('tab') || 'dashboard') === item.tab
  if (item.match) return location.pathname === path && location.search.includes(item.match)
  if (location.pathname !== path) return !item.end && path !== '/' && location.pathname.startsWith(`${path}/`)
  // Enlace "base": activo si ningún hermano con query string coincide.
  return !nav.some((other) => other !== item && other.match && other.to.startsWith(path) && location.search.includes(other.match))
}

function FolioSearch({ className, onDone }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { notify } = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const folio = value.trim()
    if (!folio || loading) return
    setLoading(true)
    try {
      const res = await searchService.searchFolio(folio)
      setValue('')
      onDone?.()
      navigate(res.path)
    } catch (err) {
      notify({
        type: 'warning',
        title: err?.status === 403 ? 'Sin acceso a ese folio' : 'Folio no encontrado',
        description: err?.status === 403 ? 'Solo puedes consultar solicitudes autorizadas para tu cuenta.' : 'Verifica el folio, por ejemplo PRO-2026-00001.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} role="search" className={cn('flex items-center gap-2 rounded-xl border border-line bg-white/70 px-3 transition focus-within:border-electric', className)}>
      {loading ? <Loader2 className="size-4 animate-spin text-electric" aria-hidden /> : <Search className="size-4 text-muted" aria-hidden />}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar folio"
        aria-label="Buscar solicitud por folio"
        className="h-10 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
      />
    </form>
  )
}

function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initials = `${(user.nombre || '')[0] || ''}${(user.apellidos || '')[0] || ''}`.toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink transition hover:bg-surface"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="grid size-8 place-items-center rounded-full bg-electric text-xs font-bold text-white">{initials}</span>
        <span className="hidden max-w-[110px] truncate xl:inline">{user.nombre}</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-2xl border border-line bg-white p-2 shadow-card">
          <div className="mb-1 border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">
              {user.nombre} {user.apellidos}
            </p>
            <p className="truncate text-xs text-muted">{user.correo}</p>
            <span className="mt-1.5 inline-block rounded-full bg-electric/10 px-2 py-0.5 text-[11px] font-semibold text-electric">{ROLE_LABEL[user.rol]}</span>
          </div>
          {(ROLE_NAV[user.rol] ?? []).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface hover:text-electric"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const scrolled = useScrolled(10)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  useLockBodyScroll(open)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const mq = window.matchMedia('(min-width: 1024px)')
    const onMq = (e) => e.matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open])

  const handleLogout = () => {
    logout()
    navigate(ROUTES.HOME)
  }

  // Con sesión: solo las opciones del rol. Sin sesión: navegación pública.
  const nav = isAuthenticated ? ROLE_NAV[user?.rol] ?? [] : mainNav

  const linkClass = (active) =>
    cn('relative rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors xl:px-3', active ? 'text-electric' : 'text-ink/75 hover:text-ink')

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        open
          ? 'border-b border-line bg-white shadow-[0_12px_32px_-12px_rgb(16_33_58/0.25)]'
          : scrolled
            ? 'glass border-b border-line/70 shadow-[0_6px_24px_-12px_rgb(16_33_58/0.18)]'
            : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container>
        <nav className="flex h-[72px] items-center justify-between gap-3" aria-label="Principal">
          <Logo to={isAuthenticated ? homeForRole(user?.rol) : ROUTES.HOME} className="shrink-0" />

          {/* Escritorio */}
          <ul className="hidden items-center lg:flex">
            {nav.map((item) => {
              const active = isAuthenticated ? isItemActive(item, nav, location) : undefined
              return (
                <li key={item.to}>
                  {isAuthenticated ? (
                    <Link to={item.to} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
                      {item.label}
                      <span
                        className={cn(
                          'absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-brand-gradient transition-all duration-300 xl:inset-x-3',
                          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
                        )}
                      />
                    </Link>
                  ) : (
                    <NavLink to={item.to} end={item.end} className={({ isActive }) => linkClass(isActive)}>
                      {({ isActive }) => (
                        <>
                          {item.label}
                          <span
                            className={cn(
                              'absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-brand-gradient transition-all duration-300 xl:inset-x-3',
                              isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
                            )}
                          />
                        </>
                      )}
                    </NavLink>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="hidden items-center gap-1.5 lg:flex">
            {isAuthenticated ? (
              <>
                <FolioSearch className="hidden w-40 xl:flex" />
                <NotificationBell />
                <UserDropdown user={user} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <NavLink
                  to={ROUTES.LOGIN}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                      isActive ? 'text-electric' : 'text-ink hover:bg-surface hover:text-electric',
                    )
                  }
                  aria-label="Iniciar sesión"
                >
                  <UserRound className="size-[18px] xl:hidden" aria-hidden />
                  <span className="hidden xl:inline">Iniciar sesión</span>
                </NavLink>
                <Button to={ROUTES.REQUEST_REPAIR} size="sm">
                  Solicitar reparación
                </Button>
              </>
            )}
          </div>

          {/* Móvil */}
          <div className="flex items-center gap-1 lg:hidden">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl border border-line bg-white/80 text-ink transition hover:border-electric/40 hover:text-electric"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </Container>

      {/* Panel móvil */}
      <div
        id="mobile-menu"
        className={cn(
          'bg-white overflow-hidden transition-[max-height,opacity] duration-300 ease-out lg:hidden',
          open ? 'max-h-[calc(100dvh-72px)] border-t border-line opacity-100 shadow-2xl' : 'pointer-events-none max-h-0 opacity-0',
        )}
      >
        <Container className="max-h-[calc(100dvh-72px)] overflow-y-auto bg-white pt-3 pb-6">
          {isAuthenticated && (
            <div className="pt-2">
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-surface p-3">
                <span className="grid size-10 place-items-center rounded-full bg-electric text-sm font-bold text-white">
                  {`${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {user.nombre} {user.apellidos}
                  </p>
                  <p className="text-xs text-muted">{ROLE_LABEL[user.rol]}</p>
                </div>
              </div>
              <FolioSearch className="mb-2 bg-white" onDone={() => setOpen(false)} />
            </div>
          )}
          <ul className={cn('flex flex-col gap-1', !isAuthenticated && 'pt-2')}>
            {nav.map((item) => {
              const active = isAuthenticated ? isItemActive(item, nav, location) : location.pathname === item.to
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-semibold transition-colors',
                      active ? 'bg-electric/[0.08] text-electric' : 'text-ink hover:bg-surface',
                    )}
                  >
                    {item.label}
                    <ArrowRight className="size-4 opacity-40" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {isAuthenticated ? (
              <Button variant="secondary" size="lg" leadingIcon={LogOut} fullWidth onClick={handleLogout} className="sm:col-span-2">
                Cerrar sesión
              </Button>
            ) : (
              <>
                <Button to={ROUTES.LOGIN} variant="secondary" size="lg" leadingIcon={LogIn} fullWidth>
                  Iniciar sesión
                </Button>
                <Button to={ROUTES.REQUEST_REPAIR} size="lg" icon={ArrowRight} fullWidth>
                  Solicitar reparación
                </Button>
              </>
            )}
          </div>
          {!isAuthenticated && (
            <p className="mt-5 text-center text-xs text-muted">
              ¿Ya tienes una solicitud?{' '}
              <Link to={ROUTES.TRACKING} className="font-semibold text-electric hover:underline">
                Consulta su seguimiento
              </Link>
            </p>
          )}
        </Container>
      </div>
    </header>
  )
}

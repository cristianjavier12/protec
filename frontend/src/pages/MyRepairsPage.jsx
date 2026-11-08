import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Images,
  LayoutDashboard,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Eyebrow from '../components/ui/Eyebrow'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/tracking/TrackingElements'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { repairService } from '../services/index'
import { formatDate } from '../utils/format'
import { ROUTES, repairDetailPath } from '../utils/routes'
import { getDeviceMeta, statusTone } from '../utils/repairs'
import { cn } from '../utils/cn'

const TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'finished', label: 'Finalizadas' },
]

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

function RepairCard({ repair }) {
  const meta = getDeviceMeta(repair.dispositivo?.tipo)
  return (
    <Link
      to={repairDetailPath(repair.folio)}
      className="group flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-electric/30 hover:shadow-card sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
          <meta.icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-extrabold tracking-tight text-ink">{repair.folio}</p>
            <StatusBadge label={repair.estado} tone={statusTone(repair.estado)} />
          </div>
          <p className="mt-0.5 truncate text-sm font-medium text-ink/80">
            {meta.label} · {repair.dispositivo?.marca} {repair.dispositivo?.modelo}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-muted">{repair.descripcion}</p>

      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${repair.progreso}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden /> {formatDate(repair.fechaCreacion)}
            </span>
            {repair.evidenciasTotal > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Images className="size-3.5" aria-hidden /> {repair.evidenciasTotal}
              </span>
            )}
            {repair.categoria && <span className="rounded-full bg-surface px-2 py-0.5">{repair.categoria}</span>}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-electric">
            Ver detalle
            <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-line bg-white p-6">
      <div className="flex gap-4">
        <div className="size-12 rounded-2xl bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-surface" />
          <div className="h-4 w-56 rounded bg-surface" />
        </div>
      </div>
      <div className="mt-5 h-4 w-full rounded bg-surface" />
      <div className="mt-2 h-4 w-2/3 rounded bg-surface" />
      <div className="mt-5 h-1.5 w-full rounded bg-surface" />
    </div>
  )
}

/**
 * Mis reparaciones (/mis-reparaciones).
 * Lista las solicitudes del usuario autenticado (el backend filtra por el JWT).
 */
export default function MyRepairsPage() {
  usePageTitle('Mis reparaciones')
  const { user } = useAuth()
  const [repairs, setRepairs] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await repairService.list()
      setRepairs(res.repairs ?? [])
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const finished = repairs.filter((r) => r.terminada).length
    return { total: repairs.length, active: repairs.length - finished, finished }
  }, [repairs])

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase().replace(/\s+/g, '')
    return repairs.filter((r) => {
      if (tab === 'active' && r.terminada) return false
      if (tab === 'finished' && !r.terminada) return false
      if (q && !r.folio.toUpperCase().includes(q)) return false
      return true
    })
  }, [repairs, tab, search])

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-28 pb-20 sm:pt-32">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow icon={LayoutDashboard}>Panel</Eyebrow>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Mis reparaciones</h1>
            <p className="mt-2 text-muted">
              {user?.nombre ? `Hola, ${user.nombre}. ` : ''}Consulta el estado de todas tus solicitudes.
            </p>
          </div>
          <Button to={ROUTES.REQUEST_REPAIR} leadingIcon={Plus}>
            Nueva solicitud
          </Button>
        </div>

        {status !== 'error' && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard icon={ClipboardList} label="Solicitudes" value={status === 'loading' ? '–' : stats.total} tone="bg-electric/10 text-electric" />
            <StatCard icon={Wrench} label="Activas" value={status === 'loading' ? '–' : stats.active} tone="bg-amber-50 text-amber-600" />
            <StatCard icon={CheckCircle2} label="Finalizadas" value={status === 'loading' ? '–' : stats.finished} tone="bg-emerald-50 text-emerald-600" />
          </div>
        )}

        {/* Filtros */}
        {status === 'ready' && repairs.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-2xl border border-line bg-white p-1" role="tablist" aria-label="Filtrar solicitudes">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-semibold transition',
                    tab === t.key ? 'bg-electric text-white shadow-glow' : 'text-muted hover:text-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted/70" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por folio"
                aria-label="Buscar por folio"
                className="h-11 w-full rounded-xl border border-line bg-white pr-10 pl-11 text-sm text-ink uppercase outline-none transition placeholder:text-muted/70 placeholder:normal-case hover:border-electric/30 focus:border-electric focus:ring-4 focus:ring-electric/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6" aria-live="polite">
          {status === 'loading' && (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="mx-auto mt-4 max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                <AlertTriangle className="size-7" aria-hidden />
              </span>
              <p className="mt-5 text-lg font-bold text-ink">No pudimos cargar tus reparaciones.</p>
              <p className="mt-2 text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
              <Button className="mt-6" leadingIcon={RefreshCw} onClick={load}>
                Reintentar
              </Button>
            </div>
          )}

          {status === 'ready' && repairs.length === 0 && (
            <div className="mx-auto mt-4 max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-electric/10 text-electric">
                <PackageOpen className="size-8" aria-hidden />
              </span>
              <p className="mt-5 text-lg font-bold text-ink">Aún no tienes solicitudes</p>
              <p className="mt-2 text-sm text-muted">
                Registra tu primer dispositivo y recibe un folio para dar seguimiento a la reparación.
              </p>
              <Button className="mt-6" to={ROUTES.REQUEST_REPAIR} icon={ArrowRight}>
                Solicitar reparación
              </Button>
            </div>
          )}

          {status === 'ready' && repairs.length > 0 && filtered.length === 0 && (
            <div className="rounded-3xl border border-dashed border-line bg-white/70 p-8 text-center">
              <p className="font-semibold text-ink">No hay solicitudes que coincidan.</p>
              <button
                type="button"
                onClick={() => {
                  setTab('all')
                  setSearch('')
                }}
                className="mt-2 text-sm font-semibold text-electric hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {status === 'ready' && filtered.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((r) => (
                <RepairCard key={r.id} repair={r} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

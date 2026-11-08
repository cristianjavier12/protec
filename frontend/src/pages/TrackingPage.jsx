import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  SearchX,
  Activity,
  CalendarClock,
  Clock3,
  Hash,
  Route,
  ArrowRight,
  Wrench,
  Lock,
  FileSearch,
} from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import { ProgressBar, StatusTimeline, StatusBadge } from '../components/tracking/TrackingElements'
import { getRepairByFolio } from '../services/trackingService'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime, normalizeFolio } from '../utils/format'
import { ROUTES, repairDetailPath } from '../utils/routes'
import { getDeviceMeta, statusTone } from '../utils/repairs'
import { usePageTitle } from '../hooks/usePageTitle'

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

function RepairResult({ repair, isAuthenticated }) {
  const meta = getDeviceMeta(repair.deviceType)
  const last = repair.history[repair.history.length - 1]
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Solicitud</p>
              <p className="text-2xl font-extrabold tracking-tight text-ink">#{repair.folio}</p>
            </div>
            <StatusBadge label={repair.status} tone={statusTone(repair.status)} />
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Detail icon={meta.icon} label="Dispositivo" value={meta.label} />
            <Detail icon={Activity} label="Estado" value={repair.status} />
            <Detail icon={CalendarClock} label="Fecha de solicitud" value={formatDate(repair.createdAt)} />
            <Detail icon={Clock3} label="Última actualización" value={formatDateTime(repair.updatedAt)} />
          </div>

          <ProgressBar value={repair.progress} className="mt-8" />
        </div>

        {last && (
          <div className="rounded-3xl border border-electric/15 bg-gradient-to-br from-electric/[0.06] to-aqua/[0.08] p-6 sm:p-7">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-electric uppercase">
              <Clock3 className="size-3.5" aria-hidden />
              Etapa actual
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">{last.note ?? last.status}</p>
            <p className="mt-1 text-sm text-muted">{formatDateTime(last.date)}</p>
          </div>
        )}

        {repair.isOwner ? (
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
              <FileSearch className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-ink">Esta solicitud es tuya</p>
              <p className="mt-0.5 text-sm text-muted">Consulta la descripción, fotografías y diagnóstico.</p>
            </div>
            <Button to={repairDetailPath(repair.folio)} size="sm" icon={ArrowRight}>
              Ver detalles completos
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-3xl border border-line bg-white p-6">
            <Lock className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
            <p className="text-sm text-muted">
              Por privacidad, la consulta pública no muestra datos personales, fotografías ni la descripción del problema.
              {!isAuthenticated && ' Inicia sesión con la cuenta propietaria para ver el detalle completo.'}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <p className="text-lg font-bold text-ink">Línea de tiempo</p>
          <span className="text-xs text-muted">Creada el {formatDate(repair.createdAt)}</span>
        </div>
        <StatusTimeline status={repair.status} history={repair.history} />
      </div>
    </div>
  )
}

export default function TrackingPage() {
  usePageTitle('Seguimiento')
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFolio = searchParams.get('folio') ?? ''
  const [query, setQuery] = useState(initialFolio)
  const [state, setState] = useState({ status: 'idle', repair: null, folio: '' })
  const requestRef = useRef(0)

  const search = async (value) => {
    const folio = normalizeFolio(value)
    if (!folio) return
    const requestId = ++requestRef.current
    setState({ status: 'loading', repair: null, folio })
    try {
      const repair = await getRepairByFolio(folio)
      if (requestId !== requestRef.current) return
      setState({ status: repair ? 'found' : 'not-found', repair, folio })
    } catch {
      if (requestId !== requestRef.current) return
      setState({ status: 'error', repair: null, folio })
    }
  }

  // Consulta automática si llega ?folio= en la URL.
  useEffect(() => {
    if (initialFolio) search(initialFolio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const folio = normalizeFolio(query)
    if (!folio) return
    setSearchParams({ folio }, { replace: true })
    search(folio)
  }

  return (
    <>
      <PageHero
        eyebrow="Seguimiento"
        eyebrowIcon={Route}
        title={
          <>
            Consulta el estado de <span className="text-gradient">tu reparación</span>
          </>
        }
        description="Ingresa el número de solicitud que recibiste al registrar tu dispositivo."
      >
        <form onSubmit={handleSubmit} className="mt-4 w-full max-w-xl" role="search">
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-card sm:flex-row">
            <label htmlFor="folio" className="sr-only">
              Ingresa tu número de solicitud
            </label>
            <div className="relative flex-1">
              <Hash className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted/70" />
              <input
                id="folio"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ingresa tu número de solicitud"
                autoComplete="off"
                className="h-13 w-full rounded-xl bg-transparent pr-4 pl-11 text-base text-ink uppercase outline-none placeholder:text-muted/70 placeholder:normal-case"
              />
            </div>
            <Button type="submit" size="lg" leadingIcon={Search} loading={state.status === 'loading'}>
              Consultar
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted">El folio tiene el formato PRO-AAAA-NNNNN y lo encuentras en tu correo o en Mis reparaciones.</p>
        </form>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <Container>
          <div aria-live="polite" className="mx-auto max-w-6xl">
            {state.status === 'idle' && (
              <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
                {[
                  { icon: Hash, t: 'Ubica tu folio', d: 'Lo recibes al crear tu solicitud.' },
                  { icon: Search, t: 'Consulta', d: 'Escribe el folio y presiona Consultar.' },
                  { icon: Activity, t: 'Revisa el avance', d: 'Estado, técnico y línea de tiempo.' },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="rounded-2xl border border-line bg-white p-5 text-center">
                    <Icon className="mx-auto size-6 text-electric" aria-hidden />
                    <p className="mt-3 font-semibold text-ink">{t}</p>
                    <p className="mt-1 text-sm text-muted">{d}</p>
                  </div>
                ))}
              </div>
            )}

            {state.status === 'loading' && (
              <div className="grid animate-pulse gap-6 lg:grid-cols-2">
                <div className="h-80 rounded-3xl bg-surface" />
                <div className="h-80 rounded-3xl bg-surface" />
              </div>
            )}

            {state.status === 'found' && state.repair && (
              <RepairResult repair={state.repair} isAuthenticated={isAuthenticated} />
            )}

            {(state.status === 'not-found' || state.status === 'error') && (
              <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                  <SearchX className="size-7" aria-hidden />
                </span>
                <p className="mt-5 text-lg font-bold text-ink">
                  {state.status === 'error'
                    ? 'No pudimos realizar la consulta.'
                    : 'No encontramos una solicitud con ese número.'}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {state.status === 'error'
                    ? 'Revisa tu conexión e inténtalo de nuevo.'
                    : <>Verifica el folio <strong className="text-ink">{state.folio}</strong>. Tiene el formato PRO-AAAA-NNNNN.</>}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button to={ROUTES.REQUEST_REPAIR} leadingIcon={Wrench} icon={ArrowRight}>
                    Solicitar reparación
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  )
}

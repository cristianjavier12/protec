import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Banknote, Check, CheckCircle2, ClipboardList, Eye, MessageSquare, RefreshCw, Search, Star, Stethoscope, ToggleLeft, ToggleRight, Wrench, XCircle } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import DashboardStatCard from '../components/workflow/DashboardStatCard'
import StatusBadge from '../components/workflow/StatusBadge'
import { Modal } from '../components/workflow/ConfirmDialog'
import { EmptyState, ErrorState, Field, SkeletonList, inputClass } from '../components/workflow/Feedback'
import { ProgressBar } from '../components/tracking/TrackingElements'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { technicianService } from '../services/index'
import { formatDate } from '../utils/format'
import { PRIORITY_META, getDeviceMeta } from '../utils/repairs'
import { SPECIALTY_LABELS } from '../utils/status'
import { techRepairDetailPath } from '../utils/routes'
import { cn } from '../utils/cn'

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'in_review', label: 'En revisión' },
  { key: 'in_repair', label: 'En reparación' },
  { key: 'finished', label: 'Terminadas' },
]

/** Panel del técnico (/tecnico). Solo accesible con rol "tecnico" (validado también en el backend). */
export default function TechnicianDashboardPage() {
  usePageTitle('Panel del técnico')
  const { user } = useAuth()
  const { notify } = useToast()
  const { version } = useNotifications()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [toggling, setToggling] = useState(false)
  const [busyFolio, setBusyFolio] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [paymentRef, setPaymentRef] = useState('')
  const [confirmingPay, setConfirmingPay] = useState(false)
  const jobsRef = useRef(null)

  // Búsqueda con pequeña espera para no consultar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState((s) => (s === 'ready' ? 'refreshing' : 'loading'))
      try {
        setData(await technicianService.getDashboard({ filter: filter === 'all' ? undefined : filter, search: query || undefined }))
        setState('ready')
      } catch {
        if (!silent) setState('error')
      }
    },
    [filter, query],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (version) load(true)
  }, [version, load])

  useEffect(() => {
    if (params.get('vista') === 'trabajos' && state === 'ready') jobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [params, state])

  const toggleAvailability = async () => {
    const next = !data?.perfil?.disponible
    setToggling(true)
    try {
      const res = await technicianService.toggleAvailability(next)
      setData((d) => ({ ...d, perfil: { ...d.perfil, disponible: res.disponible } }))
      notify({ type: 'success', title: res.message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo actualizar', description: err?.message })
    } finally {
      setToggling(false)
    }
  }

  const confirmFolio = async (folio) => {
    setBusyFolio(folio)
    try {
      const res = await technicianService.respondFolio(folio, { accept: true })
      notify({ type: 'success', title: 'Folio confirmado', description: res.message })
      await load(true)
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo confirmar', description: err?.message })
      await load(true)
    } finally {
      setBusyFolio(null)
    }
  }

  const handleRejectFolio = async (e) => {
    e.preventDefault()
    if (!rejectTarget) return
    setRejecting(true)
    try {
      const res = await technicianService.respondFolio(rejectTarget.folio, {
        accept: false,
        motivo: rejectReason.trim() || undefined,
      })
      notify({ type: 'success', title: 'Folio rechazado', description: res.message })
      setRejectTarget(null)
      setRejectReason('')
      await load(true)
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo rechazar', description: err?.message })
      await load(true)
    } finally {
      setRejecting(false)
    }
  }

  const handleConfirmPayment = async (e) => {
    e.preventDefault()
    if (!paymentTarget) return
    setConfirmingPay(true)
    try {
      const res = await technicianService.confirmPayment(paymentTarget.folio, {
        tipo: paymentTarget.pagoPendiente,
        metodo: paymentMethod,
        referencia: paymentRef.trim() || undefined,
      })
      notify({ type: 'success', title: 'Pago confirmado', description: res.message })
      setPaymentTarget(null)
      setPaymentRef('')
      await load(true)
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo confirmar el pago', description: err?.message })
    } finally {
      setConfirmingPay(false)
    }
  }

  const perfil = data?.perfil
  const stats = data?.stats
  const loading = state === 'loading'

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-24 pb-20 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-electric">Panel del técnico</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Hola, {user?.nombre}</h1>
            {perfil && (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span>Especialidad: <strong className="text-ink">{SPECIALTY_LABELS[perfil.especialidad]}</strong></span>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden /> {perfil.calificacion.toFixed(1)}
                </span>
                <span>
                  {perfil.serviciosTerminados} {perfil.serviciosTerminados === 1 ? 'servicio terminado' : 'servicios terminados'}
                </span>
              </p>
            )}
          </div>
          {perfil && (
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={toggling}
              aria-pressed={perfil.disponible}
              className={cn(
                'inline-flex items-center gap-2 self-start rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 md:self-auto',
                perfil.disponible ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-line bg-white text-muted hover:text-ink',
              )}
            >
              {perfil.disponible ? <ToggleRight className="size-5" aria-hidden /> : <ToggleLeft className="size-5" aria-hidden />}
              {perfil.disponible ? 'Disponible para nuevos trabajos' : 'Ocupado'}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <DashboardStatCard icon={ClipboardList} label="Solicitudes asignadas" value={stats?.asignadas ?? 0} loading={loading} />
          <DashboardStatCard icon={Stethoscope} label="Pendientes de diagnóstico" value={stats?.pendientesDiagnostico ?? 0} tone="amber" loading={loading} />
          <DashboardStatCard icon={Wrench} label="En reparación" value={stats?.enReparacion ?? 0} tone="indigo" loading={loading} />
          <DashboardStatCard icon={CheckCircle2} label="Terminadas" value={stats?.terminadas ?? 0} tone="green" loading={loading} />
        </div>

        <div ref={jobsRef} className="mt-8 scroll-mt-28 rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              Trabajos asignados
              {state === 'refreshing' && <RefreshCw className="size-4 animate-spin text-electric" aria-label="Actualizando" />}
            </h2>
            <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-electric focus-within:bg-white lg:w-80">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por folio o dispositivo"
                aria-label="Buscar por folio o dispositivo"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </label>
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                  filter === f.key ? 'bg-electric text-white shadow-glow' : 'bg-surface text-muted hover:text-electric',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {loading ? (
              <SkeletonList rows={3} className="h-36" />
            ) : state === 'error' ? (
              <ErrorState onRetry={() => load()} />
            ) : !data?.repairs?.length ? (
              <EmptyState
                icon={ClipboardList}
                title={query || filter !== 'all' ? 'No hay trabajos con ese criterio.' : 'No tienes trabajos asignados.'}
                description={query || filter !== 'all' ? 'Prueba con otro filtro o búsqueda.' : 'Cuando se te asigne una solicitud aparecerá aquí y recibirás una notificación.'}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.repairs.map((r) => {
                  const meta = getDeviceMeta(r.dispositivo.tipo)
                  const pr = PRIORITY_META[r.prioridad]
                  return (
                    <li key={r.folio} className="rounded-2xl border border-line p-4 transition hover:border-electric/30 hover:shadow-soft sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
                            <meta.icon className="size-6" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-electric">{r.folio}</span>
                              <StatusBadge estado={r.estado} />
                              {r.sinAsignar && (
                                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                  Disponible en tu especialidad
                                </span>
                              )}
                              {pr && <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', pr.className)}>Prioridad {pr.label.toLowerCase()}</span>}
                            </div>
                            <p className="mt-1 font-semibold text-ink">
                              {r.dispositivo.marca} {r.dispositivo.modelo} <span className="font-normal text-muted">· {meta.label}</span>
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-sm text-muted">{r.descripcion}</p>
                            <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
                              <span>Cliente: <strong className="font-medium text-ink">{r.cliente}</strong></span>
                              <span>{r.sinAsignar ? `Abierto: ${formatDate(r.fechaCreacion)}` : `Asignada: ${formatDate(r.fechaAsignacion ?? r.fechaCreacion)}`}</span>
                              {r.categoria && <span>Problema: {r.categoria}</span>}
                            </p>
                            <ProgressBar value={r.progreso} showLabel={false} className="mt-3 max-w-sm" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch xl:flex-row">
                          {r.pendienteConfirmacion ? (
                            <>
                              <button
                                type="button"
                                disabled={busyFolio === r.folio}
                                onClick={() => confirmFolio(r.folio)}
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                <Check className="size-4" aria-hidden />
                                {busyFolio === r.folio ? 'Confirmando...' : 'Confirmar folio'}
                              </button>
                              <button
                                type="button"
                                disabled={busyFolio === r.folio}
                                onClick={() => {
                                  setRejectTarget(r)
                                  setRejectReason('')
                                }}
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle className="size-4" aria-hidden /> Rechazar folio
                              </button>
                              <Link
                                to={techRepairDetailPath(r.folio)}
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-electric/40 hover:text-electric"
                              >
                                <Eye className="size-4" aria-hidden /> Ver detalles
                              </Link>
                            </>
                          ) : (
                            <>
                              {r.pagoPendiente && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentTarget(r)
                                    setPaymentMethod('Efectivo')
                                    setPaymentRef('')
                                  }}
                                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  <Banknote className="size-4" aria-hidden />
                                  {r.pagoPendiente === 'anticipo' ? 'Confirmar anticipo' : 'Confirmar pago final'}
                                </button>
                              )}
                              <Link to={techRepairDetailPath(r.folio)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-electric px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-600">
                                <Eye className="size-4" aria-hidden /> Ver detalles
                              </Link>
                              <Link
                                to={techRepairDetailPath(r.folio, 'estado')}
                                className={cn(
                                  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-electric/40 hover:text-electric',
                                  !r.transiciones?.length && 'opacity-60',
                                )}
                                title={r.transiciones?.length ? `Siguiente: ${r.transiciones.join(' / ')}` : 'Sin cambios manuales en este estado'}
                              >
                                <RefreshCw className="size-4" aria-hidden /> Actualizar estado
                              </Link>
                              <Link to={techRepairDetailPath(r.folio, 'chat')} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-electric/40 hover:text-electric">
                                <MessageSquare className="size-4" aria-hidden /> Abrir chat
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <Modal
          open={Boolean(paymentTarget)}
          onClose={confirmingPay ? undefined : () => setPaymentTarget(null)}
          title={paymentTarget?.pagoPendiente === 'anticipo' ? 'Confirmar pago de anticipo' : 'Confirmar pago final'}
          description={paymentTarget ? `${paymentTarget.folio} · ${paymentTarget.dispositivo.marca} ${paymentTarget.dispositivo.modelo}` : ''}
        >
          <form onSubmit={handleConfirmPayment} className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Confirma que el cliente realizó {paymentTarget?.pagoPendiente === 'anticipo' ? 'el pago del anticipo (50 %)' : 'el pago final'} para avanzar la solicitud al siguiente estado.
            </p>
            <Field label="Método de pago recibido">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia bancaria</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </Field>
            <Field label="Referencia o nota (opcional)">
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value.slice(0, 100))}
                placeholder="Ej.: Recibido en taller / Folio de transferencia..."
                className={inputClass}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setPaymentTarget(null)} disabled={confirmingPay}>
                Cancelar
              </Button>
              <Button type="submit" loading={confirmingPay} leadingIcon={Check} className="bg-emerald-600 text-white shadow-none hover:bg-emerald-700">
                Confirmar pago
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          open={Boolean(rejectTarget)}
          onClose={rejecting ? undefined : () => setRejectTarget(null)}
          title="Rechazar folio"
          description={rejectTarget ? `${rejectTarget.folio} · ${rejectTarget.dispositivo.marca} ${rejectTarget.dispositivo.modelo}` : ''}
        >
          <form onSubmit={handleRejectFolio} className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              ¿Deseas rechazar este folio? El cliente recibirá una notificación con el cambio de estado.
            </p>
            <Field label="Motivo del rechazo (opcional)">
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value.slice(0, 300))}
                placeholder="Ej.: Actualmente no contamos con la refacción para este modelo..."
                className={inputClass}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setRejectTarget(null)} disabled={rejecting}>
                Cancelar
              </Button>
              <Button type="submit" loading={rejecting} leadingIcon={XCircle} className="bg-red-600 text-white shadow-none hover:bg-red-700">
                Confirmar rechazo
              </Button>
            </div>
          </form>
        </Modal>
      </Container>
    </section>
  )
}

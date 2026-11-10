import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  Hash,
  Home,
  ImagePlus,
  Images,
  MessageSquare,
  Package,
  PackageCheck,
  PartyPopper,
  Receipt,
  RotateCcw,
  Route,
  SearchX,
  Star,
  Store,
  Tag,
  Truck,
  UserRound,
  Wrench,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import { ProgressBar } from '../components/tracking/TrackingElements'
import StatusBadge from '../components/workflow/StatusBadge'
import RepairTimeline from '../components/workflow/RepairTimeline'
import TechnicianCard from '../components/workflow/TechnicianCard'
import BudgetCard from '../components/workflow/BudgetCard'
import PaymentSummary, { paymentMethodLabel } from '../components/workflow/PaymentSummary'
import EvidenceGallery from '../components/workflow/EvidenceGallery'
import PartCard from '../components/workflow/PartCard'
import LogisticsTimeline from '../components/workflow/LogisticsTimeline'
import RatingForm from '../components/workflow/RatingForm'
import ScheduleForm from '../components/workflow/ScheduleForm'
import ChatWindow from '../components/workflow/ChatWindow'
import { SectionCard } from '../components/workflow/Feedback'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRepairLive } from '../hooks/useRepairLive'
import { repairService, uploadService } from '../services/index'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'
import { ROUTES, diagnosisWithFolio, repairPaymentPath, trackingWithFolio } from '../utils/routes'
import { CONTACT_LABELS, PRIORITY_META, getDeviceMeta } from '../utils/repairs'
import { cn } from '../utils/cn'

const MAX_EVIDENCES = 5
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 font-semibold break-words text-ink">{value || '—'}</p>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <div className="h-52 rounded-3xl bg-white" />
        <div className="h-40 rounded-3xl bg-white" />
        <div className="h-48 rounded-3xl bg-white" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="h-28 rounded-3xl bg-white" />
        <div className="h-96 rounded-3xl bg-white" />
      </div>
    </div>
  )
}

/** Tarjeta destacada con el siguiente paso que debe realizar el usuario. */
function NextStep({ icon: Icon, title, children, tone = 'electric' }) {
  const tones = {
    electric: 'border-electric/25 from-electric/[0.07] to-aqua/[0.09]',
    green: 'border-emerald-200 from-emerald-50 to-aqua/[0.08]',
    amber: 'border-amber-200 from-amber-50 to-white',
  }
  return (
    <div className={cn('rounded-3xl border bg-gradient-to-br p-5 shadow-card sm:p-7', tones[tone])}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function DeliveryChooser({ onChoose }) {
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pickup = async () => {
    setBusy(true)
    setError('')
    try {
      await onChoose({ metodo: 'recoger' })
    } catch (err) {
      setError(err?.message || 'No pudimos guardar tu elección.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: 'recoger', icon: Store, title: 'Recoger personalmente', text: 'Pasa por tu dispositivo al centro de servicio.' },
          { key: 'domicilio', icon: Home, title: 'Entrega a domicilio', text: 'Programa fecha y horario de entrega.' },
        ].map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setMode(o.key)}
            className={cn(
              'flex items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition',
              mode === o.key ? 'border-electric shadow-soft' : 'border-line hover:border-electric/40',
            )}
          >
            <o.icon className={cn('mt-0.5 size-5 shrink-0', mode === o.key ? 'text-electric' : 'text-muted')} aria-hidden />
            <span>
              <span className="block font-semibold text-ink">{o.title}</span>
              <span className="text-sm text-muted">{o.text}</span>
            </span>
          </button>
        ))}
      </div>
      {mode === 'recoger' && (
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button leadingIcon={Store} loading={busy} onClick={pickup} className="self-start">
            Confirmar: recogeré personalmente
          </Button>
        </div>
      )}
      {mode === 'domicilio' && <ScheduleForm submitLabel="Programar entrega" onSubmit={(data) => onChoose({ metodo: 'domicilio', ...data })} />}
    </div>
  )
}

/**
 * Detalle de una solicitud (/reparacion/:folio).
 * Solo el propietario (o personal autorizado) puede consultarla; el backend lo valida con el JWT.
 * Se actualiza en tiempo real cuando el técnico cambia algo (Socket.IO).
 */
export default function RepairDetailPage() {
  const { folio } = useParams()
  usePageTitle(`Solicitud ${folio}`)
  const { notify } = useToast()
  const { user } = useAuth()
  const location = useLocation()

  const [repair, setRepair] = useState(null)
  const [state, setState] = useState('loading') // loading | found | not-found | forbidden | error
  const [uploading, setUploading] = useState(false)
  const [budgetBusy, setBudgetBusy] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState('loading')
      try {
        const res = await repairService.getByFolio(folio)
        setRepair(res.repair)
        setState('found')
      } catch (err) {
        if (!silent) setState(err?.status === 404 ? 'not-found' : err?.status === 403 ? 'forbidden' : 'error')
      }
    },
    [folio],
  )

  useEffect(() => {
    load()
  }, [load])

  useRepairLive(folio, () => load(true))

  // Permite abrir directamente el chat desde una notificación (#chat).
  useEffect(() => {
    if (state === 'found' && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [state, location.hash])

  /**
   * Ejecuta una acción del flujo y actualiza la vista.
   * Los formularios muestran sus propios errores; el resto se avisa con un toast.
   */
  const run = async (fn, success, { inlineErrors = true } = {}) => {
    try {
      const res = await fn()
      if (res?.repair) setRepair(res.repair)
      else await load(true)
      if (success) notify({ type: 'success', title: success })
      return res
    } catch (err) {
      if (!inlineErrors) notify({ type: 'warning', title: 'No se pudo completar la acción', description: err?.message })
      throw err
    }
  }

  const respondBudget = async (accept) => {
    setBudgetBusy(true)
    try {
      await run(() => repairService.respondBudget(folio, accept), accept ? 'Presupuesto aceptado' : 'Presupuesto rechazado', { inlineErrors: false })
    } catch {
      /* ya se notificó */
    } finally {
      setBudgetBusy(false)
    }
  }

  const initialEvidences = (repair?.evidencias ?? []).filter((e) => (e.tipoEvidencia ?? 'inicial') === 'inicial')

  const handleAddPhotos = async (fileList) => {
    const remaining = MAX_EVIDENCES - initialEvidences.length
    const files = Array.from(fileList ?? []).slice(0, remaining)
    if (fileRef.current) fileRef.current.value = ''
    if (!files.length) return
    const invalid = files.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES)
    if (invalid) {
      notify({ type: 'warning', title: 'Imagen no válida', description: `${invalid.name}: usa JPG, PNG o WEBP de máximo 5 MB.` })
      return
    }
    setUploading(true)
    try {
      const tokens = []
      for (const file of files) {
        const res = await uploadService.uploadEvidence(file)
        tokens.push(res.evidence.token)
      }
      await repairService.addEvidences(folio, tokens)
      await load(true)
      notify({ type: 'success', title: 'Fotografías agregadas', description: `${tokens.length} imagen(es) añadidas.` })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudieron subir', description: err?.message || 'Intenta de nuevo.' })
    } finally {
      setUploading(false)
    }
  }

  const device = repair?.dispositivo
  const meta = getDeviceMeta(device?.tipo)
  const acciones = repair?.acciones ?? {}
  const diagnosisResult = repair?.diagnostico?.detalle?.result
  const canDiagnose = repair?.estado === 'Solicitud registrada'
  const awaitingResolution =
    repair?.estado === 'Diagnóstico inicial' && diagnosisResult?.selfFixSteps?.length > 0 && !repair?.diagnostico?.detalle?.resolution
  const priority = PRIORITY_META[repair?.prioridad]
  const canAddPhotos = repair && !repair.terminada && initialEvidences.length < MAX_EVIDENCES && user?.rol === 'usuario'
  const finished = repair?.estado === 'Finalizado'
  const lastEntry = repair?.historial?.[repair.historial.length - 1]
  const showPayments = repair?.presupuesto?.estado === 'Aceptado'

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-24 pb-20 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Ruta de navegación">
          <Link
            to={user?.rol === 'admin' ? `${ROUTES.ADMIN_DASHBOARD}?tab=solicitudes` : ROUTES.MY_REPAIRS}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-muted transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> {user?.rol === 'admin' ? 'Solicitudes' : 'Mis reparaciones'}
          </Link>
          <span className="text-muted/50">/</span>
          <span className="font-semibold text-ink">{folio}</span>
        </nav>

        {state === 'loading' && <DetailSkeleton />}

        {state !== 'loading' && state !== 'found' && (
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
              <SearchX className="size-7" aria-hidden />
            </span>
            <p className="mt-5 text-lg font-bold text-ink">
              {state === 'error' ? 'No pudimos cargar la solicitud.' : state === 'forbidden' ? 'Acceso denegado.' : 'No encontramos esta solicitud.'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {state === 'error' ? (
                'Revisa tu conexión e inténtalo de nuevo.'
              ) : (
                <>
                  El folio <strong className="text-ink">{folio}</strong> no existe o no pertenece a tu cuenta.
                </>
              )}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="secondary" to={ROUTES.MY_REPAIRS} leadingIcon={ArrowLeft}>
                Mis reparaciones
              </Button>
              {state === 'error' && (
                <Button leadingIcon={RotateCcw} onClick={() => load()}>
                  Reintentar
                </Button>
              )}
            </div>
          </div>
        )}

        {state === 'found' && repair && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            {/* ─── Columna principal ─── */}
            <div className="flex min-w-0 flex-col gap-6">
              {/* Encabezado */}
              <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
                      <meta.icon className="size-7" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm text-muted">Solicitud</p>
                      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{repair.folio}</h1>
                    </div>
                  </div>
                  <StatusBadge estado={repair.estado} />
                </div>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Detail icon={meta.icon} label="Dispositivo" value={`${meta.label} ${device?.marca ?? ''}`} />
                  <Detail icon={Tag} label="Modelo" value={device?.modelo} />
                  {device?.numeroSerie && <Detail icon={Hash} label="Número de serie" value={device.numeroSerie} />}
                  <Detail icon={CalendarClock} label="Fecha de solicitud" value={formatDateTime(repair.fechaCreacion)} />
                  <Detail icon={UserRound} label="Técnico" value={repair.tecnicoPerfil?.nombre ?? 'Pendiente de asignar'} />
                  <Detail icon={MessageSquare} label="Contacto preferido" value={CONTACT_LABELS[repair.metodoContacto]} />
                  {repair.tiempoEstimado && <Detail icon={Clock3} label="Tiempo estimado" value={repair.tiempoEstimado} />}
                  {repair.costoEstimado !== null && <Detail icon={CircleDollarSign} label="Costo estimado" value={formatCurrency(repair.costoEstimado)} />}
                </div>

                <ProgressBar value={repair.progreso} className="mt-8" />
              </div>

              {/* ─── Siguiente paso ─── */}
              {repair.estado === 'Pendiente de técnico' && repair.tecnicoPerfil && (
                <NextStep icon={Wrench} title="En espera de confirmación del técnico" tone="amber">
                  <p className="text-sm text-muted">
                    Tu folio fue enviado automáticamente al especialista <strong className="text-ink">{repair.tecnicoPerfil.nombre}</strong>. Recibirás una notificación en cuanto confirme tu solicitud.
                  </p>
                </NextStep>
              )}

              {repair.estado === 'Folio rechazado' && (
                <div className="rounded-3xl border border-red-200 bg-red-50/70 p-5 shadow-soft sm:p-7">
                  <h2 className="text-lg font-bold text-red-800">Folio rechazado por el técnico</h2>
                  <p className="mt-1 text-sm text-red-700">
                    {lastEntry?.estado === 'Folio rechazado' && lastEntry?.descripcion
                      ? lastEntry.descripcion
                      : 'El técnico especialista indicó que no es posible atender esta solicitud en este momento.'}
                  </p>
                </div>
              )}

              {acciones.respondBudget && <BudgetCard budget={repair.presupuesto} onRespond={respondBudget} busy={budgetBusy} />}

              {acciones.payDeposit && (
                <NextStep icon={Receipt} title="Realizar anticipo">
                  <p className="text-sm text-muted">Aceptaste el presupuesto. Para iniciar la reparación registra el anticipo del 50 %.</p>
                  <PaymentSummary resumen={repair.resumenPagos} highlight="anticipo" className="mt-4 bg-white" />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button to={repairPaymentPath(repair.folio)} icon={ArrowRight}>
                      Realizar anticipo · {formatCurrency(repair.resumenPagos.anticipoRequerido)}
                    </Button>
                  </div>
                </NextStep>
              )}

              {acciones.schedulePickup && (
                <NextStep icon={Truck} title="Programar recolección">
                  <p className="mb-4 text-sm text-muted">Indica dónde y cuándo podemos recoger tu dispositivo.</p>
                  <ScheduleForm submitLabel="Programar recolección" onSubmit={(data) => run(() => repairService.schedulePickup(folio, data), 'Recolección programada')} />
                </NextStep>
              )}

              {repair.estado === 'Listo para recibir dispositivo' && (
                <NextStep icon={Store} title="Lleva tu dispositivo al centro de servicio" tone="amber">
                  <p className="text-sm text-muted">Tu anticipo quedó registrado. Entrega el equipo en el centro de servicio; el técnico marcará cuando lo reciba.</p>
                </NextStep>
              )}

              {acciones.payFinal && (
                <NextStep icon={PackageCheck} title="Tu dispositivo está listo" tone="green">
                  {repair.resumenReparacion && (
                    <p className="rounded-2xl bg-white p-4 text-sm text-ink ring-1 ring-line">
                      <span className="block text-xs font-semibold text-muted">Trabajo realizado</span>
                      {repair.resumenReparacion}
                    </p>
                  )}
                  <PaymentSummary resumen={repair.resumenPagos} highlight="pago_final" className="mt-4 bg-white" />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button to={repairPaymentPath(repair.folio)} icon={ArrowRight}>
                      Pagar saldo · {formatCurrency(repair.resumenPagos.saldoPendiente)}
                    </Button>
                  </div>
                </NextStep>
              )}

              {acciones.chooseDelivery && (
                <NextStep icon={Truck} title="¿Cómo quieres recibir tu dispositivo?" tone="green">
                  <DeliveryChooser onChoose={(data) => run(() => repairService.scheduleDelivery(folio, data), 'Entrega configurada')} />
                </NextStep>
              )}

              {repair.estado === 'Listo para entrega' && repair.metodoEntrega === 'recoger' && (
                <NextStep icon={Store} title="Listo para recoger" tone="green">
                  <p className="text-sm text-muted">Tu dispositivo te espera en el centro de servicio. El técnico registrará la entrega cuando lo recojas.</p>
                </NextStep>
              )}

              {/* Resumen final */}
              {finished && (
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-card sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white">
                      <PartyPopper className="size-6" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold text-ink">Reparación completada</h2>
                      <p className="text-sm text-muted">Finalizada el {formatDateTime(repair.fechaFinalizacion)}</p>
                    </div>
                  </div>
                  <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                    {[
                      ['Folio', repair.folio],
                      ['Dispositivo', `${device?.marca} ${device?.modelo}`],
                      ['Problema reportado', repair.descripcion],
                      ['Diagnóstico', repair.diagnosticoFinal ?? repair.diagnosticoTecnico?.resultado ?? '—'],
                      ['Técnico', repair.tecnicoPerfil?.nombre ?? '—'],
                      ['Trabajo realizado', repair.resumenReparacion ?? '—'],
                      ['Piezas utilizadas', repair.piezas.length ? repair.piezas.map((p) => p.nombre).join(', ') : 'Sin piezas registradas'],
                      ['Costo total', formatCurrency(repair.resumenPagos.costoTotal)],
                      ['Fecha de inicio', formatDate(repair.fechaCreacion)],
                      ['Fecha de finalización', formatDate(repair.fechaFinalizacion)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                        <dt className="text-xs font-semibold text-muted">{k}</dt>
                        <dd className="mt-1 break-words text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <a href="#historial" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-electric hover:underline">
                    Ver historial completo <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              )}

              {(acciones.rate || (finished && repair.calificacion)) && (
                <SectionCard title="¿Cómo fue tu experiencia?" icon={Star}>
                  <RatingForm value={repair.calificacion} onSubmit={(data) => run(() => repairService.rateService(folio, data), '¡Gracias por calificar!')} />
                </SectionCard>
              )}

              {/* Problema */}
              <SectionCard
                title="Problema reportado"
                icon={FileText}
                action={repair.categoria && <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">{repair.categoria}</span>}
              >
                <p className="leading-relaxed whitespace-pre-line text-muted">{repair.descripcion}</p>
              </SectionCard>

              {/* Diagnóstico */}
              <SectionCard
                title="Diagnóstico"
                icon={ClipboardCheck}
                action={priority && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priority.className}`}>Prioridad {priority.label.toLowerCase()}</span>}
              >
                {repair.diagnosticoTecnico && (
                  <div className="mb-4 rounded-2xl border border-electric/15 bg-electric/[0.04] p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-electric">
                      <Wrench className="size-3.5" aria-hidden /> Diagnóstico técnico · {formatDateTime(repair.diagnosticoTecnico.fecha)}
                    </p>
                    <p className="mt-1 text-sm text-ink">{repair.diagnosticoTecnico.resultado}</p>
                  </div>
                )}
                {diagnosisResult ? (
                  <div className="flex flex-col gap-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <Bot className="size-3.5" aria-hidden /> Diagnóstico preliminar del asistente
                    </p>
                    <div className="rounded-2xl bg-surface p-4">
                      <p className="text-xs font-semibold text-muted">Posible problema</p>
                      <p className="mt-1 text-ink">{diagnosisResult.problem}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-4">
                      <p className="text-xs font-semibold text-muted">Recomendación</p>
                      <p className="mt-1 text-ink">{diagnosisResult.recommendation}</p>
                    </div>
                    <p className="text-sm text-muted">
                      Nivel de atención: <strong className="text-ink">{diagnosisResult.attention}</strong>
                    </p>
                    {awaitingResolution && (
                      <Button to={diagnosisWithFolio(repair.folio)} variant="secondary" leadingIcon={Bot} className="self-start">
                        Confirmar si se resolvió
                      </Button>
                    )}
                  </div>
                ) : repair.diagnosticoInicial ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{repair.diagnosticoInicial}</p>
                ) : canDiagnose ? (
                  <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-electric/30 bg-electric/[0.03] p-5 sm:flex-row sm:items-center">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
                      <Bot className="size-5" aria-hidden />
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-ink">Aún no tiene diagnóstico</p>
                      <p className="mt-0.5 text-sm text-muted">Responde unas preguntas breves para obtener un diagnóstico preliminar.</p>
                    </div>
                    <Button to={diagnosisWithFolio(repair.folio)} size="sm" icon={ArrowRight}>
                      Iniciar
                    </Button>
                  </div>
                ) : (
                  !repair.diagnosticoTecnico && <p className="text-sm text-muted">Sin diagnóstico registrado.</p>
                )}
              </SectionCard>

              {/* Presupuesto (ya respondido) */}
              {repair.presupuesto && !acciones.respondBudget && <BudgetCard budget={repair.presupuesto} />}

              {/* Chat */}
              <div id="chat" className="scroll-mt-28">
                <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
                  <MessageSquare className="size-[18px] text-electric" aria-hidden /> Chat con tu técnico
                </h2>
                <ChatWindow
                  folio={repair.folio}
                  currentUser={user}
                  enabled={acciones.chat}
                  readOnly={acciones.chatReadOnly}
                  counterpart={repair.tecnico ? { id: repair.tecnico.id, nombre: repair.tecnicoPerfil?.nombre ?? repair.tecnico.nombre, rol: 'tecnico' } : null}
                />
              </div>

              {/* Evidencias */}
              <SectionCard
                title={`Fotografías y evidencias (${repair.evidencias.length})`}
                icon={Images}
                action={
                  canAddPhotos && (
                    <>
                      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={(e) => handleAddPhotos(e.target.files)} />
                      <Button size="sm" variant="secondary" leadingIcon={ImagePlus} loading={uploading} onClick={() => fileRef.current?.click()}>
                        Agregar ({initialEvidences.length}/{MAX_EVIDENCES})
                      </Button>
                    </>
                  )
                }
              >
                <EvidenceGallery evidences={repair.evidencias} emptyText="No hay fotografías en esta solicitud." />
              </SectionCard>

              {/* Piezas */}
              <SectionCard title="Piezas utilizadas" icon={Package}>
                {repair.piezas.length ? (
                  <div className="flex flex-col gap-3">
                    {repair.piezas.map((p) => (
                      <PartCard key={p.id} part={p} />
                    ))}
                    <p className="text-xs text-muted">
                      La verificación indica que el técnico registró y revisó la pieza dentro de PROTEC. No corresponde a una certificación del fabricante.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">El técnico registrará aquí las piezas que utilice durante la reparación.</p>
                )}
              </SectionCard>
            </div>

            {/* ─── Columna lateral ─── */}
            <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
              <TechnicianCard technician={repair.tecnicoPerfil} searching={acciones.searchingTechnician} />

              {lastEntry && (
                <div className="rounded-3xl border border-electric/15 bg-gradient-to-br from-electric/[0.06] to-aqua/[0.08] p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-electric uppercase">
                    <Clock3 className="size-3.5" aria-hidden /> Última actualización
                  </p>
                  <p className="mt-3 font-semibold text-ink">{lastEntry.estado}</p>
                  {lastEntry.descripcion && <p className="mt-1 text-sm text-muted">{lastEntry.descripcion}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateTime(lastEntry.fecha)}</p>
                </div>
              )}

              {showPayments && (
                <SectionCard title="Pagos" icon={Receipt} >
                  <PaymentSummary resumen={repair.resumenPagos} />
                  {repair.pagos.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-2">
                      {repair.pagos.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                          <span>
                            <span className="block font-semibold text-ink">{p.tipo === 'anticipo' ? 'Anticipo' : 'Pago final'}</span>
                            <span className="text-xs text-muted">
                              {paymentMethodLabel(p.metodo)} · {formatDate(p.fecha)}
                            </span>
                          </span>
                          <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(p.monto)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              )}

              {repair.logistica.length > 0 && (
                <SectionCard title="Recolección y entrega" icon={Truck}>
                  <div className="flex flex-col gap-3">
                    {repair.logistica.map((l) => (
                      <LogisticsTimeline key={l.id} entry={l} />
                    ))}
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Historial completo" icon={Route} id="historial" className="scroll-mt-28">
                <RepairTimeline history={repair.historial} />
              </SectionCard>

              <div className="flex flex-col gap-3">
                {canDiagnose && user?.rol === 'usuario' && (
                  <Button to={diagnosisWithFolio(repair.folio)} leadingIcon={Bot} fullWidth>
                    Iniciar diagnóstico
                  </Button>
                )}
                <Button to={trackingWithFolio(repair.folio)} variant="secondary" leadingIcon={Route} fullWidth>
                  Ver seguimiento público
                </Button>
                {user?.rol === 'usuario' && (
                  <Button to={ROUTES.REQUEST_REPAIR} variant="ghost" leadingIcon={Wrench} fullWidth>
                    Nueva solicitud
                  </Button>
                )}
              </div>

              <p className="px-2 text-xs leading-relaxed text-muted">
                Actualizada el {formatDate(repair.fechaActualizacion)}. Solo tú, tu técnico asignado y el administrador pueden ver la descripción, fotografías
                y mensajes de esta solicitud.
              </p>
            </aside>
          </div>
        )}
      </Container>
    </section>
  )
}

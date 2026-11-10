import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  Camera,
  Check,
  ClipboardCheck,
  FileText,
  Hash,
  Hourglass,
  ImagePlus,
  MessageSquare,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Save,
  SearchX,
  Send,
  Tag,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import { ProgressBar } from '../components/tracking/TrackingElements'
import StatusBadge from '../components/workflow/StatusBadge'
import { Modal } from '../components/workflow/ConfirmDialog'
import RepairTimeline from '../components/workflow/RepairTimeline'
import BudgetCard from '../components/workflow/BudgetCard'
import PaymentSummary from '../components/workflow/PaymentSummary'
import EvidenceGallery from '../components/workflow/EvidenceGallery'
import PartCard from '../components/workflow/PartCard'
import LogisticsTimeline from '../components/workflow/LogisticsTimeline'
import ChatWindow from '../components/workflow/ChatWindow'
import { Field, FormError, SectionCard, fieldError, inputClass } from '../components/workflow/Feedback'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRepairLive } from '../hooks/useRepairLive'
import { technicianService, uploadService } from '../services/index'
import { formatCurrency, formatDateTime } from '../utils/format'
import { getDeviceMeta } from '../utils/repairs'
import { EVIDENCE_TYPE_LABELS, PART_TYPE_LABELS } from '../utils/status'
import { ROUTES } from '../utils/routes'
import { cn } from '../utils/cn'

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: FileText },
  { key: 'diagnostico', label: 'Diagnóstico y presupuesto', icon: ClipboardCheck },
  { key: 'estado', label: 'Actualizar estado', icon: RefreshCw },
  { key: 'evidencias', label: 'Evidencias', icon: Camera },
  { key: 'piezas', label: 'Piezas', icon: Package },
  { key: 'logistica', label: 'Logística', icon: Truck },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
]
const TIME_OPTIONS = ['1 día', '2 días', '3 días', '5 días', '7 días', '10 días']
const MAX_UPLOAD = 5
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold break-words text-ink">{value || '—'}</p>
      </div>
    </div>
  )
}

/* ---------- Formularios ---------- */

function DiagnosisForm({ onSubmit }) {
  const [form, setForm] = useState({ diagnostico: '', costoEstimado: '', tiempoEstimado: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (form.diagnostico.trim().length < 10) return setErrors({ diagnostico: 'Describe el diagnóstico (mínimo 10 caracteres).' })
    setBusy(true)
    setError('')
    try {
      await onSubmit({ ...form, costoEstimado: form.costoEstimado === '' ? undefined : Number(form.costoEstimado) })
      setForm({ diagnostico: '', costoEstimado: '', tiempoEstimado: '' })
      setErrors({})
    } catch (err) {
      setErrors({ diagnostico: fieldError(err, 'diagnostico'), costoEstimado: fieldError(err, 'costoEstimado') })
      setError(err?.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Diagnóstico técnico" error={errors.diagnostico}>
        <textarea
          rows={4}
          value={form.diagnostico}
          onChange={(e) => setForm((f) => ({ ...f, diagnostico: e.target.value.slice(0, 2000) }))}
          placeholder="Escribe el diagnóstico técnico..."
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Costo estimado (MXN)" error={errors.costoEstimado}>
          <input type="number" min="0" step="0.01" value={form.costoEstimado} onChange={(e) => setForm((f) => ({ ...f, costoEstimado: e.target.value }))} placeholder="0.00" className={inputClass} />
        </Field>
        <Field label="Tiempo estimado">
          <select value={form.tiempoEstimado} onChange={(e) => setForm((f) => ({ ...f, tiempoEstimado: e.target.value }))} className={inputClass}>
            <option value="">Selecciona</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <FormError message={error} />
      <Button type="submit" leadingIcon={Save} loading={busy} className="self-start">
        Guardar diagnóstico
      </Button>
    </form>
  )
}

function BudgetForm({ defaultDiagnosis, onSubmit }) {
  const [form, setForm] = useState({ diagnostico: defaultDiagnosis ?? '', manoObra: '', costoPiezas: '', tiempoEstimado: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const total = Math.round(((Number(form.manoObra) || 0) + (Number(form.costoPiezas) || 0)) * 100) / 100
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (form.diagnostico.trim().length < 10) next.diagnostico = 'Describe el diagnóstico (mínimo 10 caracteres).'
    if (total <= 0) next.manoObra = 'El costo total debe ser mayor a cero.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setError('')
    try {
      await onSubmit({ ...form, manoObra: Number(form.manoObra) || 0, costoPiezas: Number(form.costoPiezas) || 0 })
    } catch (err) {
      setErrors({ diagnostico: fieldError(err, 'diagnostico'), manoObra: fieldError(err, 'manoObra'), costoPiezas: fieldError(err, 'costoPiezas') })
      setError(err?.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Diagnóstico del presupuesto" error={errors.diagnostico}>
        <textarea rows={3} value={form.diagnostico} onChange={set('diagnostico')} placeholder="Qué se reparará y por qué" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mano de obra (MXN)" error={errors.manoObra}>
          <input type="number" min="0" step="0.01" value={form.manoObra} onChange={set('manoObra')} placeholder="0.00" className={inputClass} />
        </Field>
        <Field label="Costo de piezas (MXN)" error={errors.costoPiezas}>
          <input type="number" min="0" step="0.01" value={form.costoPiezas} onChange={set('costoPiezas')} placeholder="0.00" className={inputClass} />
        </Field>
        <Field label="Tiempo estimado">
          <select value={form.tiempoEstimado} onChange={set('tiempoEstimado')} className={inputClass}>
            <option value="">Selecciona</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-2 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-3">
        <p className="flex justify-between sm:block">
          <span className="text-muted">Costo total</span> <strong className="block text-lg text-ink tabular-nums">{formatCurrency(total)}</strong>
        </p>
        <p className="flex justify-between sm:block">
          <span className="text-muted">Anticipo (50 %)</span> <strong className="block text-lg text-electric tabular-nums">{formatCurrency(total / 2)}</strong>
        </p>
        <p className="flex justify-between sm:block">
          <span className="text-muted">Pendiente al terminar</span> <strong className="block text-lg text-ink tabular-nums">{formatCurrency(total / 2)}</strong>
        </p>
      </div>
      <FormError message={error} />
      <Button type="submit" leadingIcon={Send} loading={busy} className="self-start">
        Enviar presupuesto al cliente
      </Button>
    </form>
  )
}

function StatusForm({ transitions, onSubmit }) {
  const [estado, setEstado] = useState(transitions[0] ?? '')
  const [comentario, setComentario] = useState('')
  const [resumen, setResumen] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErr, setFieldErr] = useState('')
  useEffect(() => setEstado(transitions[0] ?? ''), [transitions])
  const needsSummary = estado === 'Reparación terminada'
  const submit = async (e) => {
    e.preventDefault()
    if (needsSummary && resumen.trim().length < 10) return setFieldErr('Describe el trabajo realizado (mínimo 10 caracteres).')
    setBusy(true)
    setError('')
    setFieldErr('')
    try {
      await onSubmit({ estado, comentario: comentario.trim() || undefined, resumenReparacion: needsSummary ? resumen.trim() : undefined })
      setComentario('')
      setResumen('')
    } catch (err) {
      setFieldErr(fieldError(err, 'resumenReparacion') ?? '')
      setError(err?.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Nuevo estado</p>
        <div className="flex flex-wrap gap-2">
          {transitions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setEstado(s)}
              aria-pressed={estado === s}
              className={cn(
                'rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition',
                estado === s ? 'border-electric bg-electric/5 text-electric' : 'border-line text-muted hover:border-electric/40',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <Field label="Observación para el cliente" hint="Aparecerá en el historial. Ej.: “Se reemplazará el puerto de carga dañado.”">
        <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 500))} placeholder="Opcional" className={inputClass} />
      </Field>
      {needsSummary && (
        <Field label="Resumen del trabajo realizado" error={fieldErr}>
          <textarea
            rows={3}
            value={resumen}
            onChange={(e) => setResumen(e.target.value.slice(0, 2000))}
            placeholder="Ej.: Se reemplazó el conector de carga y se realizaron pruebas de funcionamiento."
            className={cn(inputClass, 'border-electric/30')}
          />
        </Field>
      )}
      <FormError message={error} />
      <Button type="submit" leadingIcon={RefreshCw} loading={busy} disabled={!estado} className="self-start">
        Actualizar estado
      </Button>
    </form>
  )
}

function EvidenceUploader({ onUpload }) {
  const [tipo, setTipo] = useState('reparacion')
  const [descripcion, setDescripcion] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleFiles = async (list) => {
    const files = Array.from(list ?? []).slice(0, MAX_UPLOAD)
    if (fileRef.current) fileRef.current.value = ''
    if (!files.length) return
    const invalid = files.find((f) => !ACCEPTED.includes(f.type) || f.size > 5 * 1024 * 1024)
    if (invalid) return setError(`${invalid.name}: usa JPG, PNG o WEBP de máximo 5 MB.`)
    setBusy(true)
    setError('')
    try {
      const tokens = []
      for (const [i, file] of files.entries()) {
        const res = await uploadService.uploadEvidence(file, { onProgress: (p) => setProgress(Math.round(((i + p / 100) / files.length) * 100)) })
        tokens.push(res.evidence.token)
      }
      await onUpload({ evidencias: tokens, tipoEvidencia: tipo, descripcion: descripcion.trim() || undefined })
      setDescripcion('')
    } catch (err) {
      setError(err?.message || 'No se pudieron subir las imágenes.')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de evidencia">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
            {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descripción" hint="Opcional. Ej.: Equipo abierto, componente dañado">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value.slice(0, 255))} className={inputClass} placeholder="Descripción breve" />
        </Field>
      </div>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-electric/30 bg-electric/[0.03] px-6 py-8 text-center transition hover:border-electric/60 hover:bg-electric/[0.06] disabled:opacity-70"
      >
        <ImagePlus className="size-7 text-electric" aria-hidden />
        <span className="font-semibold text-ink">{busy ? `Subiendo... ${progress}%` : 'Seleccionar fotografías'}</span>
        <span className="text-xs text-muted">JPG, PNG o WEBP · máximo 5 MB por imagen · hasta {MAX_UPLOAD} a la vez</span>
      </button>
      {busy && <ProgressBar value={progress} showLabel={false} />}
      <FormError message={error} />
    </div>
  )
}

function PartForm({ onSubmit }) {
  const empty = { nombre: '', marca: '', numeroSerie: '', codigoQr: '', costo: '', tipo: 'original', verificada: true }
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [nameErr, setNameErr] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (form.nombre.trim().length < 2) return setNameErr('Escribe el nombre de la pieza.')
    setBusy(true)
    setError('')
    setNameErr('')
    try {
      await onSubmit({ ...form, costo: form.costo === '' ? 0 : Number(form.costo) })
      setForm(empty)
    } catch (err) {
      setNameErr(fieldError(err, 'nombre') ?? '')
      setError(err?.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la pieza" error={nameErr}>
          <input value={form.nombre} onChange={set('nombre')} placeholder="Ej. Batería" className={inputClass} maxLength={120} />
        </Field>
        <Field label="Marca">
          <input value={form.marca} onChange={set('marca')} placeholder="Ej. Samsung" className={inputClass} maxLength={80} />
        </Field>
        <Field label="Número de serie">
          <input value={form.numeroSerie} onChange={set('numeroSerie')} placeholder="Ej. BAT-239494" className={inputClass} maxLength={80} />
        </Field>
        <Field label="Código QR / identificador" hint="Opcional">
          <input value={form.codigoQr} onChange={set('codigoQr')} placeholder="Ej. PROTEC-PZ-0001" className={inputClass} maxLength={120} />
        </Field>
        <Field label="Costo (MXN)">
          <input type="number" min="0" step="0.01" value={form.costo} onChange={set('costo')} placeholder="0.00" className={inputClass} />
        </Field>
        <Field label="Tipo">
          <select value={form.tipo} onChange={set('tipo')} className={inputClass}>
            {Object.entries(PART_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm">
        <input type="checkbox" checked={form.verificada} onChange={set('verificada')} className="mt-0.5 size-4 accent-electric" />
        <span>
          <span className="font-semibold text-ink">Pieza revisada por mí</span>
          <span className="block text-xs text-muted">Marca esta opción si verificaste físicamente la pieza. Es una verificación interna de PROTEC, no del fabricante.</span>
        </span>
      </label>
      <FormError message={error} />
      <Button type="submit" leadingIcon={Plus} loading={busy} className="self-start">
        Registrar pieza
      </Button>
    </form>
  )
}

/* ---------- Página ---------- */

/** Detalle de una reparación para el técnico asignado (/tecnico/reparacion/:folio). */
export default function TechnicianRepairDetailPage() {
  const { folio } = useParams()
  usePageTitle(`Trabajo ${folio}`)
  const { user } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'resumen'
  const [repair, setRepair] = useState(null)
  const [state, setState] = useState('loading')
  const [busyLog, setBusyLog] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [confirmingFolio, setConfirmingFolio] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingFolio, setRejectingFolio] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState('loading')
      try {
        const res = await technicianService.getRepairDetail(folio)
        setRepair(res.repair)
        setState('found')
      } catch (err) {
        if (!silent) setState(err?.status === 403 ? 'forbidden' : err?.status === 404 ? 'not-found' : 'error')
      }
    },
    [folio],
  )

  useEffect(() => {
    load()
  }, [load])

  useRepairLive(folio, () => load(true))

  const act = async (fn, success) => {
    const res = await fn()
    if (res?.repair) setRepair(res.repair)
    notify({ type: 'success', title: success })
    return res
  }

  const advanceLogistics = async (item) => {
    setBusyLog(item.id)
    try {
      await act(() => technicianService.updateLogisticsStatus(folio, item.id, item.next), `Logística: ${item.next}`)
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo actualizar', description: err?.message })
    } finally {
      setBusyLog(null)
    }
  }

  const removePart = async (part) => {
    setRemoving(part.id)
    try {
      await act(() => technicianService.removePart(folio, part.id), 'Pieza eliminada')
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo eliminar', description: err?.message })
    } finally {
      setRemoving(null)
    }
  }

  const handleConfirmFolio = async () => {
    setConfirmingFolio(true)
    try {
      const res = await technicianService.respondFolio(folio, { accept: true })
      if (res?.repair) setRepair(res.repair)
      notify({ type: 'success', title: 'Folio confirmado', description: res.message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo confirmar', description: err?.message })
    } finally {
      setConfirmingFolio(false)
    }
  }

  const handleRejectFolio = async (e) => {
    e.preventDefault()
    setRejectingFolio(true)
    try {
      const res = await technicianService.respondFolio(folio, {
        accept: false,
        motivo: rejectReason.trim() || undefined,
      })
      notify({ type: 'success', title: 'Folio rechazado', description: res.message })
      setRejectOpen(false)
      navigate(ROUTES.TECH_DASHBOARD, { replace: true })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo rechazar', description: err?.message })
    } finally {
      setRejectingFolio(false)
    }
  }

  const setTab = (key) => setParams(key === 'resumen' ? {} : { tab: key }, { replace: true })

  if (state === 'loading') {
    return (
      <section className="min-h-[80vh] bg-surface pt-24 pb-20 sm:pt-28">
        <Container>
          <div className="flex animate-pulse flex-col gap-6">
            <div className="h-48 rounded-3xl bg-white" />
            <div className="h-12 rounded-2xl bg-white" />
            <div className="h-96 rounded-3xl bg-white" />
          </div>
        </Container>
      </section>
    )
  }

  if (state !== 'found' || !repair) {
    return (
      <section className="min-h-[80vh] bg-surface pt-24 pb-20 sm:pt-28">
        <Container className="max-w-lg">
          <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
              <SearchX className="size-7" aria-hidden />
            </span>
            <p className="mt-5 text-lg font-bold text-ink">
              {state === 'forbidden' ? 'Acceso denegado' : state === 'not-found' ? 'No encontramos esta solicitud.' : 'No pudimos cargar la solicitud.'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {state === 'forbidden' ? 'Esta solicitud no está asignada a tu cuenta.' : state === 'error' ? 'Revisa tu conexión e inténtalo de nuevo.' : `El folio ${folio} no existe.`}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Button variant="secondary" to={ROUTES.TECH_DASHBOARD} leadingIcon={ArrowLeft}>
                Volver al panel
              </Button>
              {state === 'error' && <Button onClick={() => load()}>Reintentar</Button>}
            </div>
          </div>
        </Container>
      </section>
    )
  }

  const a = repair.accionesTecnico ?? {}
  const device = repair.dispositivo
  const meta = getDeviceMeta(device?.tipo)
  const chatbot = repair.diagnostico?.detalle?.result
  const initialPhotos = repair.evidencias.filter((e) => e.tipoEvidencia === 'inicial')
  const techPhotos = repair.evidencias.filter((e) => e.tipoEvidencia !== 'inicial')

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-24 pb-20 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative">
        <Link to={ROUTES.TECH_DASHBOARD} className="mb-6 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Trabajos asignados
        </Link>

        {/* Encabezado */}
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-navy text-aqua">
                <meta.icon className="size-7" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-muted">Trabajo asignado</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{repair.folio}</h1>
              </div>
            </div>
            <StatusBadge estado={repair.estado} />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={UserRound} label="Cliente" value={`${repair.cliente?.nombre ?? ''} ${repair.cliente?.apellidos ?? ''}`} />
            <Info icon={Phone} label="Teléfono" value={repair.cliente?.telefono} />
            <Info icon={meta.icon} label="Dispositivo" value={`${meta.label} · ${device?.marca} ${device?.modelo}`} />
            <Info icon={Hash} label="Número de serie" value={device?.numeroSerie ?? 'No registrado'} />
            <Info icon={Tag} label="Categoría" value={repair.categoria} />
            <Info icon={CalendarClock} label="Fecha de solicitud" value={formatDateTime(repair.fechaCreacion)} />
            <Info icon={Truck} label="Recolección" value={repair.solicitaRecoleccion ? 'Solicitada por el cliente' : 'No solicitada'} />
            <Info icon={Hourglass} label="Tiempo estimado" value={repair.tiempoEstimado ?? 'Por definir'} />
          </div>
          <ProgressBar value={repair.progreso} className="mt-6" />
          {a.canConfirmFolio ? (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink">Nuevo folio asignado a tu especialidad</p>
                <p className="mt-0.5 text-sm text-muted">
                  Confirma el folio para tomar el caso y habilitar el diagnóstico y presupuesto, o recházalo si no puedes atenderlo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  leadingIcon={Check}
                  loading={confirmingFolio}
                  onClick={handleConfirmFolio}
                  className="bg-emerald-600 text-white shadow-none hover:bg-emerald-700"
                >
                  Confirmar folio
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={XCircle}
                  disabled={confirmingFolio}
                  onClick={() => {
                    setRejectReason('')
                    setRejectOpen(true)
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Rechazar folio
                </Button>
              </div>
            </div>
          ) : (
            <>
              {a.waitingFor && (
                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  <Hourglass className="size-4 shrink-0" aria-hidden /> {a.waitingFor}
                </p>
              )}
              {a.canRejectFolio && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectReason('')
                      setRejectOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
                  >
                    <XCircle className="size-4" aria-hidden /> Rechazar este folio
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pestañas */}
        <div className="sticky top-[72px] z-20 -mx-4 mt-6 bg-surface/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-0">
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft ring-1 ring-line" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition',
                  tab === t.key ? 'bg-electric text-white shadow-glow' : 'text-muted hover:bg-surface hover:text-ink',
                )}
              >
                <t.icon className="size-4" aria-hidden /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {tab === 'resumen' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-w-0 flex-col gap-6">
                <SectionCard title="Descripción original" icon={FileText}>
                  <p className="leading-relaxed whitespace-pre-line text-muted">{repair.descripcion}</p>
                </SectionCard>
                <SectionCard title="Diagnóstico del chatbot" icon={Bot}>
                  {chatbot ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-surface p-4 sm:col-span-2">
                        <p className="text-xs font-semibold text-muted">Posible problema</p>
                        <p className="mt-1 text-sm text-ink">{chatbot.problem}</p>
                      </div>
                      <div className="rounded-2xl bg-surface p-4">
                        <p className="text-xs font-semibold text-muted">Recomendación</p>
                        <p className="mt-1 text-sm text-ink">{chatbot.recommendation}</p>
                      </div>
                      <div className="rounded-2xl bg-surface p-4">
                        <p className="text-xs font-semibold text-muted">Nivel de atención / prioridad</p>
                        <p className="mt-1 text-sm text-ink">
                          {chatbot.attention} · {chatbot.priority}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-line text-muted">{repair.diagnosticoInicial ?? 'Sin diagnóstico preliminar.'}</p>
                  )}
                </SectionCard>
                <SectionCard title={`Fotografías del cliente (${initialPhotos.length})`} icon={Camera}>
                  <EvidenceGallery evidences={initialPhotos} emptyText="El cliente no adjuntó fotografías." />
                </SectionCard>
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                {repair.presupuesto?.estado === 'Aceptado' && (
                  <SectionCard title="Pagos" icon={FileText}>
                    <PaymentSummary resumen={repair.resumenPagos} />
                  </SectionCard>
                )}
                <SectionCard title="Historial de estados" icon={Route}>
                  <RepairTimeline history={repair.historial} />
                </SectionCard>
              </div>
            </div>
          )}

          {tab === 'diagnostico' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Diagnóstico técnico" icon={ClipboardCheck}>
                {repair.diagnosticoTecnico && (
                  <div className="mb-5 rounded-2xl border border-electric/15 bg-electric/[0.04] p-4">
                    <p className="text-xs font-semibold text-electric">Último diagnóstico · {formatDateTime(repair.diagnosticoTecnico.fecha)}</p>
                    <p className="mt-1 text-sm text-ink">{repair.diagnosticoTecnico.resultado}</p>
                  </div>
                )}
                {a.canDiagnose ? (
                  <DiagnosisForm onSubmit={(data) => act(() => technicianService.saveDiagnosis(folio, data), 'Diagnóstico guardado')} />
                ) : (
                  <p className="text-sm text-muted">El diagnóstico ya no se puede modificar en el estado actual.</p>
                )}
              </SectionCard>
              <div className="flex flex-col gap-6">
                {repair.presupuesto && <BudgetCard budget={repair.presupuesto} />}
                {a.canBudget ? (
                  <SectionCard title={repair.presupuesto ? 'Enviar nuevo presupuesto' : 'Generar presupuesto'} icon={Send}>
                    <BudgetForm
                      defaultDiagnosis={repair.diagnosticoTecnico?.resultado}
                      onSubmit={(data) => act(() => technicianService.createBudget(folio, data), 'Presupuesto enviado al cliente')}
                    />
                  </SectionCard>
                ) : (
                  !repair.presupuesto && (
                    <SectionCard title="Presupuesto" icon={Send}>
                      <p className="text-sm text-muted">No es posible generar presupuesto en el estado actual.</p>
                    </SectionCard>
                  )
                )}
              </div>
            </div>
          )}

          {tab === 'estado' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <SectionCard title="Actualizar estado" icon={RefreshCw}>
                <p className="mb-5 text-sm text-muted">
                  Estado actual: <strong className="text-ink">{repair.estado}</strong>. Solo se muestran las etapas siguientes válidas para evitar saltos incoherentes.
                </p>
                {a.transitions?.length ? (
                  <StatusForm transitions={a.transitions} onSubmit={(data) => act(() => technicianService.updateStatus(folio, data), `Estado actualizado: ${data.estado}`)} />
                ) : (
                  <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
                    {a.waitingFor ?? 'No hay cambios manuales disponibles en este estado. El avance depende de otra etapa del flujo (presupuesto, pago o logística).'}
                  </p>
                )}
              </SectionCard>
              <SectionCard title="Historial" icon={Route}>
                <RepairTimeline history={repair.historial} newestFirst initial={5} />
              </SectionCard>
            </div>
          )}

          {tab === 'evidencias' && (
            <div className="flex flex-col gap-6">
              {a.canWork && (
                <SectionCard title="Subir evidencia" icon={Camera}>
                  <EvidenceUploader onUpload={(data) => act(() => technicianService.addEvidences(folio, data), 'Evidencia registrada')} />
                </SectionCard>
              )}
              <SectionCard title={`Evidencias de la reparación (${techPhotos.length})`} icon={Camera}>
                <EvidenceGallery evidences={repair.evidencias} emptyText="Aún no hay evidencias." />
              </SectionCard>
            </div>
          )}

          {tab === 'piezas' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {a.canWork && repair.estado !== 'Listo para entrega' ? (
                <SectionCard title="Registrar pieza utilizada" icon={Plus}>
                  <PartForm onSubmit={(data) => act(() => technicianService.addPart(folio, data), 'Pieza registrada')} />
                </SectionCard>
              ) : (
                <SectionCard title="Registrar pieza utilizada" icon={Plus}>
                  <p className="text-sm text-muted">No es posible registrar piezas en el estado actual.</p>
                </SectionCard>
              )}
              <SectionCard title={`Piezas registradas (${repair.piezas.length})`} icon={Package}>
                {repair.piezas.length ? (
                  <div className="flex flex-col gap-3">
                    {repair.piezas.map((p) => (
                      <PartCard key={p.id} part={p} onRemove={a.canWork && repair.estado !== 'Listo para entrega' ? removePart : undefined} removing={removing === p.id} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Sin piezas registradas.</p>
                )}
              </SectionCard>
            </div>
          )}

          {tab === 'logistica' && (
            <SectionCard title="Recolección y entrega" icon={Truck}>
              {repair.logistica.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {repair.logistica.map((l) => {
                    const next = a.logistics?.find((x) => x.id === l.id)
                    return (
                      <LogisticsTimeline
                        key={l.id}
                        entry={l}
                        horizontal
                        action={
                          next && (
                            <Button size="sm" leadingIcon={Truck} loading={busyLog === l.id} onClick={() => advanceLogistics(next)}>
                              Marcar: {next.next}
                            </Button>
                          )
                        }
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {repair.solicitaRecoleccion
                    ? 'El cliente programará la recolección después de pagar el anticipo.'
                    : 'Sin registros logísticos. El cliente entregará el equipo en el centro de servicio.'}
                </p>
              )}
            </SectionCard>
          )}

          {tab === 'chat' && (
            <ChatWindow
              folio={repair.folio}
              currentUser={user}
              enabled={repair.acciones?.chat}
              readOnly={repair.acciones?.chatReadOnly}
              counterpart={repair.cliente ? { id: repair.cliente.id, nombre: `${repair.cliente.nombre} ${repair.cliente.apellidos}`, rol: 'usuario' } : null}
            />
          )}
        </div>

        <Modal
          open={rejectOpen}
          onClose={rejectingFolio ? undefined : () => setRejectOpen(false)}
          title="Rechazar folio"
          description={`${repair.folio} · ${device?.marca ?? ''} ${device?.modelo ?? ''}`}
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
              <Button type="button" variant="secondary" onClick={() => setRejectOpen(false)} disabled={rejectingFolio}>
                Cancelar
              </Button>
              <Button type="submit" loading={rejectingFolio} leadingIcon={XCircle} className="bg-red-600 text-white shadow-none hover:bg-red-700">
                Confirmar rechazo
              </Button>
            </div>
          </form>
        </Modal>
      </Container>
    </section>
  )
}

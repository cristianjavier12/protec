import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ClipboardList,
  Cpu,
  FileText,
  Hash,
  ImagePlus,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  ShieldCheck,
  Tag,
  Truck,
  Upload,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Eyebrow from '../components/ui/Eyebrow'
import Button from '../components/ui/Button'
import { CheckboxField, SelectField, TextField } from '../components/ui/FormFields'
import WizardSteps from '../components/repair/WizardSteps'
import DeviceTypeSelector from '../components/repair/DeviceTypeSelector'
import { getDeviceById, resolveDeviceId } from '../data/devices'
import { clearRepairDraft, loadRepairDraft, saveRepairDraft } from '../services/repairDraft'
import { repairService, uploadService } from '../services/index'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES, repairCreatedPath } from '../utils/routes'
import { CONTACT_LABELS, formatBytes } from '../utils/repairs'
import { cn } from '../utils/cn'

const WIZARD_STEPS = [
  { id: 'device', label: 'Dispositivo', icon: Cpu },
  { id: 'problem', label: 'Problema', icon: FileText },
  { id: 'evidence', label: 'Evidencias', icon: ImagePlus },
  { id: 'contact', label: 'Contacto', icon: UserRound },
  { id: 'confirm', label: 'Confirmación', icon: BadgeCheck },
]

const CATEGORIES = ['Pantalla', 'Batería', 'Carga', 'Encendido', 'Rendimiento', 'Software', 'Almacenamiento', 'Sonido', 'Conectividad', 'Otro']

const CONTACT_OPTIONS = [
  { value: 'chat', label: 'Chat en la plataforma', description: 'Recibe mensajes y avisos dentro de PROTEC.', icon: MessageSquare },
  { value: 'llamada', label: 'Llamada telefónica', description: 'Un técnico te llamará al número de tu cuenta.', icon: PhoneCall },
]

/** El cliente decide si pasa por el diagnóstico del asistente o abre el folio directo para un técnico. */
const ATTENTION_OPTIONS = [
  {
    value: 'chatbot',
    label: 'Diagnóstico con el asistente',
    description: 'Responde unas preguntas. Si es un problema sencillo te damos la solución; si no, se asigna un técnico.',
    icon: Bot,
  },
  {
    value: 'tecnico',
    label: 'Enviar directo a un técnico',
    description: 'Omite el asistente: tu folio se abre para que un técnico especializado revise el caso.',
    icon: Wrench,
  },
]

const DESCRIPTION = { min: 20, max: 1500 }
const EVIDENCE = { maxFiles: 5, maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] }

/** Campo del backend -> [campo del formulario, paso donde se corrige]. */
const SERVER_FIELDS = {
  tipo: ['deviceType', 0],
  marca: ['brand', 0],
  modelo: ['model', 0],
  numeroSerie: ['serialNumber', 0],
  categoria: ['category', 1],
  descripcion: ['description', 1],
  evidencias: ['evidence', 2],
  metodoContacto: ['contactMethod', 3],
}

let fileSeq = 0

function SummaryRow({ icon: Icon, label, value, onEdit }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-electric">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className={value ? 'truncate font-semibold text-ink' : 'text-sm text-muted/70'}>{value || 'Sin definir'}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-electric"
          aria-label={`Editar ${label.toLowerCase()}`}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function StepHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  )
}

function StepNav({ onBack, onNext, nextLabel = 'Continuar', loading = false, disabled = false }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </button>
      ) : (
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
        </Link>
      )}
      <Button onClick={onNext} size="lg" icon={ArrowRight} loading={loading} disabled={disabled}>
        {nextLabel}
      </Button>
    </div>
  )
}

/**
 * Solicitar reparación (/solicitar-reparacion) — wizard de 5 pasos.
 * El folio se genera en el servidor; las fotografías se suben antes de enviar
 * y la solicitud solo guarda sus URLs (tokens firmados por el backend).
 */
export default function RequestRepairPage() {
  usePageTitle('Solicitar reparación')
  const { notify } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialDevice = resolveDeviceId(searchParams.get('device')) || loadRepairDraft().deviceType || ''

  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [form, setForm] = useState(() => {
    const draft = loadRepairDraft()
    const sameDevice = draft.deviceType === initialDevice
    return {
      deviceType: initialDevice,
      brand: sameDevice ? draft.brand ?? '' : '',
      model: sameDevice ? draft.model ?? '' : '',
      serialNumber: sameDevice ? draft.serialNumber ?? '' : '',
      category: draft.category ?? '',
      description: draft.description ?? '',
      contactMethod: draft.contactMethod ?? 'chat',
      pickup: Boolean(draft.pickup),
      attention: draft.attention === 'tecnico' ? 'tecnico' : 'chatbot',
    }
  })
  const [errors, setErrors] = useState({})
  const [files, setFiles] = useState([]) // { id, file, preview, status: uploading|done|error, progress, token, error }
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)
  const filesRef = useRef(files)
  filesRef.current = files

  // Libera las vistas previas al salir.
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  // Si cambia ?device= (ej. desde otra tarjeta), se preselecciona ese tipo.
  useEffect(() => {
    const fromUrl = resolveDeviceId(searchParams.get('device'))
    if (fromUrl && fromUrl !== form.deviceType) {
      setForm((f) => ({ ...f, deviceType: fromUrl, brand: '', model: '' }))
      setStep(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Guarda el borrador (sin fotografías) para no perder lo capturado.
  useEffect(() => {
    saveRepairDraft(form)
  }, [form])

  const device = useMemo(() => getDeviceById(form.deviceType), [form.deviceType])
  const uploadingCount = files.filter((f) => f.status === 'uploading').length
  const readyFiles = files.filter((f) => f.status === 'done')

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }
  const update = (field) => (e) => setField(field, e.target.type === 'checkbox' ? e.target.checked : e.target.value)

  const selectDevice = (id) => {
    setForm((f) => ({ ...f, deviceType: id, brand: getDeviceById(id)?.brands.includes(f.brand) ? f.brand : '' }))
    setErrors((e) => ({ ...e, deviceType: undefined }))
    setSearchParams({ device: id }, { replace: true })
  }

  /* ---------- Validación por paso ---------- */
  const validators = {
    0: () => {
      const e = {}
      if (!form.deviceType) e.deviceType = 'Selecciona el tipo de dispositivo.'
      if (!form.brand) e.brand = 'Selecciona la marca.'
      if (!form.model.trim()) e.model = 'Indica el modelo del dispositivo.'
      if (form.serialNumber.trim().length > 60) e.serialNumber = 'Máximo 60 caracteres.'
      return e
    },
    1: () => {
      const e = {}
      const len = form.description.trim().length
      if (!len) e.description = 'Describe el problema de tu dispositivo.'
      else if (len < DESCRIPTION.min)
        e.description = `Agrega más detalles: faltan ${DESCRIPTION.min - len} caracteres (mínimo ${DESCRIPTION.min}).`
      else if (len > DESCRIPTION.max) e.description = `Máximo ${DESCRIPTION.max} caracteres.`
      return e
    },
    2: () => (uploadingCount ? { evidence: 'Espera a que terminen de subirse las fotografías.' } : {}),
    3: () => (!form.contactMethod ? { contactMethod: 'Selecciona cómo prefieres que te contactemos.' } : {}),
  }

  const goTo = (target) => {
    setErrors({})
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goNext = () => {
    const e = validators[step]?.() ?? {}
    setErrors(e)
    if (Object.keys(e).length) return
    const next = Math.min(step + 1, WIZARD_STEPS.length - 1)
    setMaxStep((m) => Math.max(m, next))
    goTo(next)
  }

  /* ---------- Evidencias ---------- */
  const uploadOne = useCallback(async (entry) => {
    const patch = (changes) => setFiles((list) => list.map((f) => (f.id === entry.id ? { ...f, ...changes } : f)))
    try {
      const res = await uploadService.uploadEvidence(entry.file, { onProgress: (progress) => patch({ progress }) })
      patch({ status: 'done', progress: 100, token: res.evidence.token })
    } catch (err) {
      patch({ status: 'error', error: err?.message || 'No se pudo subir.' })
    }
  }, [])

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList ?? [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!incoming.length) return
    const available = EVIDENCE.maxFiles - files.length
    if (available <= 0) {
      notify({ type: 'warning', title: 'Límite alcanzado', description: `Puedes adjuntar hasta ${EVIDENCE.maxFiles} imágenes.` })
      return
    }
    const accepted = []
    for (const file of incoming.slice(0, available)) {
      if (!EVIDENCE.types.includes(file.type)) {
        notify({ type: 'warning', title: 'Formato no permitido', description: `${file.name}: usa JPG, JPEG, PNG o WEBP.` })
      } else if (file.size > EVIDENCE.maxBytes) {
        notify({ type: 'warning', title: 'Imagen muy pesada', description: `${file.name}: máximo 5 MB.` })
      } else {
        accepted.push({ id: `f${++fileSeq}`, file, preview: URL.createObjectURL(file), status: 'uploading', progress: 0 })
      }
    }
    if (incoming.length > available) {
      notify({ type: 'info', title: 'Algunas imágenes no se agregaron', description: `El máximo es ${EVIDENCE.maxFiles}.` })
    }
    if (!accepted.length) return
    setErrors((e) => ({ ...e, evidence: undefined }))
    setFiles((list) => [...list, ...accepted])
    accepted.forEach(uploadOne)
  }

  const retryFile = (entry) => {
    setFiles((list) => list.map((f) => (f.id === entry.id ? { ...f, status: 'uploading', progress: 0, error: undefined } : f)))
    uploadOne(entry)
  }

  const removeFile = (entry) => {
    URL.revokeObjectURL(entry.preview)
    setFiles((list) => list.filter((f) => f.id !== entry.id))
    // Elimina del almacenamiento la imagen que aún no forma parte de una solicitud.
    if (entry.token) uploadService.deleteEvidence(entry.token).catch(() => {})
  }

  /* ---------- Envío ---------- */
  const handleSubmit = async () => {
    for (const s of [0, 1, 2, 3]) {
      const e = validators[s]()
      if (Object.keys(e).length) {
        setErrors(e)
        setStep(s)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await repairService.create({
        tipo: form.deviceType,
        marca: form.brand,
        modelo: form.model.trim(),
        numeroSerie: form.serialNumber.trim() || null,
        categoria: form.category || null,
        descripcion: form.description.trim(),
        metodoContacto: form.contactMethod,
        solicitaRecoleccion: form.pickup,
        evidencias: readyFiles.map((f) => f.token),
        atencion: form.attention,
      })
      clearRepairDraft()
      filesRef.current = []
      navigate(repairCreatedPath(res.repair.folio), { replace: true })
    } catch (err) {
      const serverErrors = err?.data?.errors
      if (serverErrors) {
        const mapped = {}
        let firstStep = 4
        for (const [key, msg] of Object.entries(serverErrors)) {
          const [field, s] = SERVER_FIELDS[key] ?? [key, 4]
          mapped[field] = msg
          firstStep = Math.min(firstStep, s)
        }
        setErrors(mapped)
        setStep(firstStep)
      }
      notify({
        type: 'warning',
        title: 'No pudimos registrar la solicitud',
        description: serverErrors ? 'Revisa los datos marcados.' : err?.message || 'Inténtalo de nuevo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const descLength = form.description.trim().length
  const contactLabel = CONTACT_LABELS[form.contactMethod]

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-28 pb-20 sm:pt-32">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow icon={ClipboardList}>Nueva solicitud</Eyebrow>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">Solicitar reparación</h1>
          <p className="mt-3 text-muted sm:text-lg">Completa los pasos para registrar tu dispositivo y describir el problema.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-[1fr_340px] lg:gap-8">
          <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8">
            <WizardSteps
              steps={WIZARD_STEPS}
              current={step}
              completed={Array.from({ length: maxStep }, (_, i) => i).filter((i) => i !== step)}
              unlockedUntil={maxStep}
              onStepClick={(i) => i <= maxStep && goTo(i)}
            />

            <div className="my-8 h-px bg-line" />

            {/* ═══ Paso 1 · Dispositivo ═══ */}
            {step === 0 && (
              <div className="flex flex-col gap-7">
                <StepHeader title="¿Qué dispositivo deseas reparar?" description="Selecciona el tipo e indica la marca y el modelo." />
                <DeviceTypeSelector value={form.deviceType} onChange={selectDevice} error={errors.deviceType} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Marca"
                    required
                    placeholder={device ? 'Selecciona una marca' : 'Primero elige un dispositivo'}
                    options={device?.brands ?? []}
                    value={form.brand}
                    onChange={update('brand')}
                    disabled={!device}
                    error={errors.brand}
                  />
                  <TextField
                    label="Modelo"
                    required
                    icon={Tag}
                    placeholder={device?.modelPlaceholder ?? 'Ej. IdeaPad 3'}
                    value={form.model}
                    onChange={update('model')}
                    error={errors.model}
                    hint="Lo encuentras en la caja, etiqueta o configuración."
                    maxLength={80}
                  />
                  <TextField
                    label="Número de serie (opcional)"
                    icon={Hash}
                    placeholder="Ej. PF3K9X21"
                    value={form.serialNumber}
                    onChange={update('serialNumber')}
                    error={errors.serialNumber}
                    maxLength={60}
                    className="sm:col-span-2"
                  />
                </div>
                <StepNav onNext={goNext} />
              </div>
            )}

            {/* ═══ Paso 2 · Problema ═══ */}
            {step === 1 && (
              <div className="flex flex-col gap-7">
                <StepHeader title="Cuéntanos qué sucede" description="Mientras más detalles nos des, más preciso será el diagnóstico." />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="description" className="text-sm font-semibold text-ink">
                    Descripción del problema <span className="ml-0.5 text-electric">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={update('description')}
                    placeholder="Describe lo que ocurre con tu dispositivo. Por ejemplo: enciende pero la pantalla permanece negra..."
                    rows={6}
                    maxLength={DESCRIPTION.max}
                    aria-invalid={Boolean(errors.description)}
                    className={cn(
                      'w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] text-ink transition-all outline-none placeholder:text-muted/70 focus:border-electric focus:ring-4 focus:ring-electric/10',
                      errors.description ? 'border-red-300' : 'border-line hover:border-electric/30',
                    )}
                  />
                  <div className="flex items-start justify-between gap-3">
                    {errors.description ? (
                      <p className="text-xs font-medium text-red-600">{errors.description}</p>
                    ) : (
                      <p className="text-xs text-muted">
                        {descLength < DESCRIPTION.min
                          ? `Mínimo ${DESCRIPTION.min} caracteres. Indica cuándo empezó y qué observas.`
                          : '¡Bien! Tu descripción tiene suficiente detalle.'}
                      </p>
                    )}
                    <span className={cn('shrink-0 text-xs', descLength >= DESCRIPTION.min ? 'text-emerald-600' : 'text-muted')}>
                      {descLength}/{DESCRIPTION.max}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Categoría <span className="font-normal text-muted">(opcional)</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría del problema">
                    {CATEGORIES.map((c) => {
                      const active = form.category === c
                      return (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField('category', active ? '' : c)}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm font-medium transition',
                            active
                              ? 'border-electric bg-electric text-white shadow-glow'
                              : 'border-line bg-white text-ink/80 hover:border-electric/40 hover:text-electric',
                          )}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  {errors.category && <p className="mt-2 text-xs font-medium text-red-600">{errors.category}</p>}
                </div>

                <StepNav onBack={() => goTo(0)} onNext={goNext} />
              </div>
            )}

            {/* ═══ Paso 3 · Evidencias ═══ */}
            {step === 2 && (
              <div className="flex flex-col gap-7">
                <StepHeader
                  title="Muéstranos el estado del dispositivo"
                  description={`Agrega hasta ${EVIDENCE.maxFiles} fotografías (opcional). Ayudan al técnico a evaluar el daño.`}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    addFiles(e.dataTransfer.files)
                  }}
                  aria-disabled={files.length >= EVIDENCE.maxFiles}
                  className={cn(
                    'cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition outline-none focus-visible:ring-4 focus-visible:ring-electric/15',
                    dragging ? 'border-electric bg-electric/[0.06]' : 'border-line bg-surface/50 hover:border-electric/40 hover:bg-electric/[0.03]',
                    files.length >= EVIDENCE.maxFiles && 'pointer-events-none opacity-50',
                  )}
                >
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-electric shadow-soft">
                    <Upload className="size-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-ink">
                    Arrastra tus fotos aquí o <span className="text-electric">haz clic para seleccionarlas</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">JPG, JPEG, PNG o WEBP · máximo 5 MB cada una</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {files.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                        <img src={f.preview} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{f.file.name}</p>
                          <p className="text-xs text-muted">
                            {formatBytes(f.file.size)}
                            {f.status === 'uploading' && ` · Subiendo ${f.progress}%`}
                            {f.status === 'done' && ' · Lista'}
                          </p>
                          {f.status === 'uploading' && (
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-brand-gradient transition-[width] duration-200"
                                style={{ width: `${Math.max(f.progress, 4)}%` }}
                              />
                            </div>
                          )}
                          {f.status === 'error' && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-600">
                              <AlertCircle className="size-3.5" aria-hidden /> {f.error}
                              <button type="button" onClick={() => retryFile(f)} className="font-semibold text-electric hover:underline">
                                Reintentar
                              </button>
                            </p>
                          )}
                        </div>
                        {f.status === 'uploading' ? (
                          <Loader2 className="size-5 shrink-0 animate-spin text-electric" aria-label="Subiendo" />
                        ) : f.status === 'done' ? (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-label="Subida" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFile(f)}
                          disabled={f.status === 'uploading'}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label={`Eliminar ${f.file.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {files.length} de {EVIDENCE.maxFiles} imágenes
                  </span>
                  {errors.evidence && <span className="font-medium text-red-600">{errors.evidence}</span>}
                </div>

                <StepNav
                  onBack={() => goTo(1)}
                  onNext={goNext}
                  nextLabel={files.length ? 'Continuar' : 'Continuar sin fotos'}
                  disabled={uploadingCount > 0}
                />
              </div>
            )}

            {/* ═══ Paso 4 · Contacto ═══ */}
            {step === 3 && (
              <div className="flex flex-col gap-7">
                <StepHeader title="¿Cómo te contactamos?" description="Usaremos los datos de tu cuenta para darte seguimiento." />

                <div className="grid gap-3 rounded-2xl border border-line bg-surface/60 p-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5 text-sm">
                    <UserRound className="size-4 shrink-0 text-electric" aria-hidden />
                    <span className="truncate font-medium text-ink">
                      {user?.nombre} {user?.apellidos}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="size-4 shrink-0 text-electric" aria-hidden />
                    <span className="truncate text-ink">{user?.correo}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="size-4 shrink-0 text-electric" aria-hidden />
                    <span className="truncate text-ink">{user?.telefono}</span>
                  </div>
                  <p className="text-xs text-muted sm:col-span-3">
                    ¿Datos desactualizados?{' '}
                    <Link to={ROUTES.MY_ACCOUNT} className="font-semibold text-electric hover:underline">
                      Edítalos en Mi cuenta
                    </Link>
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Método de contacto preferido <span className="text-electric">*</span>
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Método de contacto">
                    {CONTACT_OPTIONS.map((opt) => {
                      const active = form.contactMethod === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField('contactMethod', opt.value)}
                          className={cn(
                            'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                            active ? 'border-electric bg-electric/[0.05] ring-4 ring-electric/10' : 'border-line bg-white hover:border-electric/40',
                          )}
                        >
                          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', active ? 'bg-electric text-white' : 'bg-surface text-electric')}>
                            <opt.icon className="size-5" aria-hidden />
                          </span>
                          <span>
                            <span className="block font-semibold text-ink">{opt.label}</span>
                            <span className="mt-0.5 block text-xs text-muted">{opt.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.contactMethod && <p className="mt-2 text-xs font-medium text-red-600">{errors.contactMethod}</p>}
                </div>

                <CheckboxField
                  checked={form.pickup}
                  onChange={update('pickup')}
                  label="Me interesa la recolección del equipo a domicilio (se confirmará con el técnico)."
                />

                <StepNav onBack={() => goTo(2)} onNext={goNext} />
              </div>
            )}

            {/* ═══ Paso 5 · Confirmación ═══ */}
            {step === 4 && (
              <div className="flex flex-col gap-7">
                <StepHeader title="Confirma tu solicitud" description="Revisa la información antes de enviarla. Puedes editar cualquier paso." />

                <div className="divide-y divide-line rounded-2xl border border-line bg-surface/40 px-4">
                  <SummaryRow icon={device?.icon ?? Cpu} label="Dispositivo" value={device?.name} onEdit={() => goTo(0)} />
                  <SummaryRow icon={Tag} label="Marca y modelo" value={`${form.brand} ${form.model}`.trim()} onEdit={() => goTo(0)} />
                  {form.serialNumber && <SummaryRow icon={Hash} label="Número de serie" value={form.serialNumber} onEdit={() => goTo(0)} />}
                  <SummaryRow icon={FileText} label="Categoría" value={form.category || 'Sin categoría'} onEdit={() => goTo(1)} />
                  <SummaryRow
                    icon={ImagePlus}
                    label="Fotografías"
                    value={readyFiles.length ? `${readyFiles.length} imagen(es)` : 'Sin fotografías'}
                    onEdit={() => goTo(2)}
                  />
                  <SummaryRow
                    icon={MessageSquare}
                    label="Contacto"
                    value={`${contactLabel}${form.pickup ? ' · Recolección a domicilio' : ''}`}
                    onEdit={() => goTo(3)}
                  />
                </div>

                <div className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted">Descripción del problema</p>
                    <button type="button" onClick={() => goTo(1)} className="text-xs font-semibold text-electric hover:underline">
                      Editar
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">{form.description.trim()}</p>
                </div>

                {readyFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {readyFiles.map((f) => (
                      <img key={f.id} src={f.preview} alt="" className="size-16 rounded-xl border border-line object-cover" />
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-ink">
                    ¿Cómo quieres continuar? <span className="text-electric">*</span>
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de atención">
                    {ATTENTION_OPTIONS.map((opt) => {
                      const active = form.attention === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField('attention', opt.value)}
                          className={cn(
                            'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                            active ? 'border-electric bg-electric/[0.05] ring-4 ring-electric/10' : 'border-line bg-white hover:border-electric/40',
                          )}
                        >
                          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', active ? 'bg-electric text-white' : 'bg-surface text-electric')}>
                            <opt.icon className="size-5" aria-hidden />
                          </span>
                          <span>
                            <span className="block font-semibold text-ink">{opt.label}</span>
                            <span className="mt-0.5 block text-xs text-muted">{opt.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                  <p className="text-sm text-muted">
                    Al enviar recibirás un <strong className="text-ink">folio único</strong> para dar seguimiento.{' '}
                    {form.attention === 'tecnico'
                      ? 'Tu solicitud se enviará directamente a un técnico especializado.'
                      : 'Después podrás iniciar el diagnóstico guiado con el asistente.'}
                  </p>
                </div>

                <StepNav onBack={() => goTo(3)} onNext={handleSubmit} nextLabel="Enviar solicitud" loading={submitting} />
              </div>
            )}
          </div>

          {/* Resumen lateral */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Resumen de tu solicitud</p>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {step + 1}/{WIZARD_STEPS.length}
                </span>
              </div>
              <div className="mt-2 divide-y divide-line">
                <SummaryRow icon={device?.icon ?? Cpu} label="Dispositivo" value={device?.name} />
                <SummaryRow icon={Tag} label="Marca" value={form.brand} />
                <SummaryRow icon={ClipboardList} label="Modelo" value={form.model.trim()} />
                {form.category && <SummaryRow icon={FileText} label="Categoría" value={form.category} />}
                {files.length > 0 && <SummaryRow icon={ImagePlus} label="Fotografías" value={`${readyFiles.length} de ${files.length} listas`} />}
                {maxStep >= 3 && <SummaryRow icon={form.pickup ? Truck : MessageSquare} label="Contacto" value={contactLabel} />}
              </div>
            </div>

            <div className="bg-navy-gradient relative overflow-hidden rounded-3xl p-6 text-white">
              <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-electric/30 blur-2xl" />
              <Bot className="relative size-8 text-aqua" aria-hidden />
              <p className="relative mt-4 font-semibold">¿No sabes cuál es la falla?</p>
              <p className="relative mt-1 text-sm text-white/70">
                Al enviar tu solicitud, el asistente te hará preguntas para un diagnóstico preliminar.
              </p>
              <Link to={ROUTES.DIAGNOSIS} className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-aqua hover:text-white">
                Probar diagnóstico rápido <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
              Tu información solo se utiliza para gestionar tu solicitud de reparación.
            </p>
          </aside>
        </div>
      </Container>
    </section>
  )
}

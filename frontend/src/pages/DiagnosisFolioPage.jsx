import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  Lightbulb,
  Wrench,
  Info,
  CheckCircle2,
  AlertTriangle,
  Bot,
  ArrowRight,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Clock3,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import ChatWindow from '../components/chat/ChatWindow'
import { BotAvatar } from '../components/chat/ChatMessage'
import DiagnosisResultCard from '../components/chat/DiagnosisResultCard'
import { useRuleDiagnosis } from '../hooks/useRuleDiagnosis'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { diagnosisService } from '../services/index'
import { ROUTES, repairDetailPath } from '../utils/routes'

const tips = [
  { icon: Lightbulb, title: 'Sé específico', text: 'Responde con lo que observas, aunque no estés seguro.' },
  { icon: Info, title: 'Observa señales', text: 'Luces, sonidos o mensajes de error ayudan al diagnóstico.' },
  { icon: Wrench, title: 'Atención técnica', text: 'Si se requiere reparación física, tu caso se escala a un técnico.' },
]

const DEVICE_LABEL = { celular: 'celular', laptop: 'laptop', computadora: 'computadora' }

/**
 * Diagnóstico vinculado a una solicitud (/diagnostico/:folio).
 * El motor de reglas del backend guarda el resultado en `diagnosticos`,
 * actualiza el estado de la solicitud y registra el historial.
 */
export default function DiagnosisFolioPage() {
  usePageTitle('Diagnóstico')
  const { folio } = useParams()
  const { notify } = useToast()

  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('')
  const [resolving, setResolving] = useState(null)

  const loadSession = useCallback(async () => {
    try {
      const data = await diagnosisService.getSession(folio)
      setSession(data)
      setStatus('ready')
      return data
    } catch (err) {
      setErrorMsg(err?.status === 404 ? 'No encontramos esta solicitud.' : err?.message || 'No pudimos cargar el diagnóstico.')
      setStatus('error')
      return null
    }
  }, [folio])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const run = useCallback((answers) => diagnosisService.answer(folio, { answers }), [folio])

  const device = session?.repair?.dispositivo
  const intro = device
    ? [
        `Hola, soy el asistente de PROTEC. Revisaremos tu ${DEVICE_LABEL[device.tipo] ?? 'dispositivo'} ${device.marca} ${device.modelo} (solicitud ${folio}).`,
        'Tomaré en cuenta la descripción que escribiste y te haré algunas preguntas breves.',
      ]
    : []
  const dx = useRuleDiagnosis({ run, introMessages: intro })

  // Inicia la conversación cuando la solicitud admite diagnóstico.
  useEffect(() => {
    if (session?.canStart && dx.messages.length === 0 && !dx.isTyping) dx.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.canStart])

  // Al obtener el resultado, el backend ya lo guardó: recargamos la sesión.
  useEffect(() => {
    if (dx.result) {
      notify({ type: 'success', title: 'Diagnóstico guardado', description: `Se registró en la solicitud ${folio}.` })
      loadSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dx.result])

  const handleResolve = async (resolved) => {
    setResolving(resolved ? 'yes' : 'no')
    try {
      const data = await diagnosisService.resolve(folio, { resolved })
      setSession(data)
      notify({
        type: 'success',
        title: resolved ? '¡Qué bien!' : 'Caso escalado',
        description: resolved
          ? 'Marcamos tu solicitud como resuelta mediante el diagnóstico.'
          : 'Un técnico revisará tu caso. Te avisaremos cuando sea asignado.',
      })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo guardar', description: err?.message || 'Intenta de nuevo.' })
    } finally {
      setResolving(null)
    }
  }

  /* ---------- Estados de carga / error ---------- */
  if (status === 'loading') {
    return (
      <Shell folio={folio}>
        <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-[520px] rounded-3xl border border-line bg-white" />
          <div className="hidden h-80 rounded-3xl border border-line bg-white lg:block" />
        </div>
      </Shell>
    )
  }

  if (status === 'error') {
    return (
      <Shell folio={folio}>
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="size-7" aria-hidden />
          </span>
          <p className="mt-5 text-lg font-bold text-ink">{errorMsg}</p>
          <p className="mt-2 text-sm text-muted">Verifica el folio o consulta tus solicitudes.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="secondary" to={ROUTES.MY_REPAIRS}>
              Mis reparaciones
            </Button>
            <Button leadingIcon={RotateCcw} onClick={() => { setStatus('loading'); loadSession() }}>
              Reintentar
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  const savedResult = session?.diagnostico?.detalle?.result ?? null
  const resolution = session?.diagnostico?.detalle?.resolution ?? null
  const estado = session?.repair?.estado
  const showChat = session?.canStart || (dx.messages.length > 0 && !savedResult)

  return (
    <Shell folio={folio}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <BotAvatar size="lg" className="shadow-glow" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Diagnóstico inicial</h1>
              <p className="text-sm text-muted sm:text-base">
                {device ? `${device.marca} ${device.modelo} · ` : ''}Solicitud {folio}
              </p>
            </div>
          </div>

          {showChat &&
            (dx.error ? (
              <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
                <p className="font-semibold text-ink">No pudimos conectar con el asistente.</p>
                <Button className="mt-5" leadingIcon={RotateCcw} onClick={dx.start}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <ChatWindow
                messages={dx.messages}
                isTyping={dx.isTyping}
                onSend={dx.send}
                inputDisabled={Boolean(dx.result)}
                title="Asistente PROTEC"
                subtitle="En línea · responde en segundos"
                placeholder={dx.result ? 'Diagnóstico completado' : 'Escribe tu respuesta...'}
                bodyClassName="h-[50vh] min-h-[340px] max-h-[560px]"
              />
            ))}

          {savedResult && (
            <DiagnosisResultCard result={savedResult}>
              {session.awaitingResolution ? (
                <div>
                  <p className="font-semibold text-ink">¿Los pasos sugeridos resolvieron el problema?</p>
                  <p className="mt-1 text-sm text-muted">
                    Inténtalos con calma. Si el problema continúa, escalaremos tu caso a un técnico.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      leadingIcon={ThumbsUp}
                      loading={resolving === 'yes'}
                      disabled={Boolean(resolving)}
                      onClick={() => handleResolve(true)}
                    >
                      Sí, se resolvió
                    </Button>
                    <Button
                      variant="secondary"
                      leadingIcon={ThumbsDown}
                      loading={resolving === 'no'}
                      disabled={Boolean(resolving)}
                      onClick={() => handleResolve(false)}
                    >
                      No, necesito un técnico
                    </Button>
                  </div>
                </div>
              ) : (
                <NextSteps estado={estado} resolution={resolution} requiereTecnico={session?.repair?.requiereTecnico} />
              )}
              <div className="mt-5">
                <Link
                  to={repairDetailPath(folio)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-electric hover:underline"
                >
                  Ver detalle de la solicitud <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </DiagnosisResultCard>
          )}

          {!showChat && !savedResult && (
            <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-electric/10 text-electric">
                <Clock3 className="size-7" aria-hidden />
              </span>
              <p className="mt-5 text-lg font-bold text-ink">Esta solicitud ya no requiere diagnóstico automático</p>
              <p className="mt-2 text-sm text-muted">
                Estado actual: <strong className="text-ink">{estado}</strong>. Un técnico da seguimiento a tu caso.
              </p>
              <Button className="mt-6" to={repairDetailPath(folio)} icon={ArrowRight}>
                Ver solicitud
              </Button>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:pt-[76px]">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <p className="font-semibold text-ink">Consejos para un mejor diagnóstico</p>
            <ul className="mt-5 flex flex-col gap-5">
              {tips.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-navy-gradient rounded-3xl p-6 text-white">
            <p className="font-semibold">Tu solicitud está registrada</p>
            <p className="mt-1 text-sm text-white/70">Consulta su estado, fotografías e historial en cualquier momento.</p>
            <Button to={repairDetailPath(folio)} variant="light" size="sm" className="mt-5">
              Ver mi solicitud
            </Button>
          </div>

          <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-muted">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
            El diagnóstico es orientativo y no sustituye la revisión de un técnico.
          </p>
        </aside>
      </div>
    </Shell>
  )
}

function Shell({ folio, children }) {
  return (
    <section className="relative overflow-hidden bg-surface pt-24 pb-16 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to={repairDetailPath(folio)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a la solicitud
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-electric/20 bg-electric/5 px-3 py-1 text-xs font-semibold text-electric">
            <Bot className="size-3.5" aria-hidden /> Diagnóstico · {folio}
          </span>
        </div>
        {children}
      </Container>
    </section>
  )
}

function NextSteps({ estado, resolution, requiereTecnico }) {
  if (resolution?.resolved || estado === 'Resuelto mediante diagnóstico') {
    return (
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="font-semibold text-ink">Problema resuelto</p>
          <p className="mt-1 text-sm text-muted">
            Marcaste que la solución funcionó. Si la falla regresa, puedes crear una nueva solicitud.
          </p>
        </div>
      </div>
    )
  }
  if (requiereTecnico) {
    const assigned = estado && estado !== 'Pendiente de técnico'
    return (
      <div className="flex items-start gap-3">
        <Wrench className="mt-0.5 size-5 shrink-0 text-electric" aria-hidden />
        <div>
          <p className="font-semibold text-ink">{assigned ? 'Ya tienes un técnico asignado' : 'Tu caso fue enviado a un técnico'}</p>
          <p className="mt-1 text-sm text-muted">
            Estado actual: <strong className="text-ink">{estado}</strong>.{' '}
            {assigned
              ? 'Puedes escribirle por chat desde el detalle de tu solicitud.'
              : 'Estamos buscando un técnico disponible. Te avisaremos en cuanto sea asignado.'}
          </p>
        </div>
      </div>
    )
  }
  return (
    <p className="text-sm text-muted">
      Estado actual: <strong className="text-ink">{estado}</strong>.
    </p>
  )
}

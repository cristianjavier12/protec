import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, ShieldCheck, Lightbulb, Wrench, Info, Bot, ArrowRight } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import ChatWindow from '../components/chat/ChatWindow'
import { BotAvatar } from '../components/chat/ChatMessage'
import DiagnosisResultCard from '../components/chat/DiagnosisResultCard'
import { useRuleDiagnosis } from '../hooks/useRuleDiagnosis'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { diagnosisService } from '../services/index'
import { ROUTES, requestRepairWithDevice } from '../utils/routes'

const tips = [
  { icon: Lightbulb, title: 'Sé específico', text: 'Indica cuándo empezó la falla y qué estabas haciendo.' },
  { icon: Info, title: 'Observa señales', text: 'Luces, sonidos o mensajes de error ayudan al diagnóstico.' },
  { icon: Wrench, title: 'Atención técnica', text: 'Si se requiere reparación física, tu caso se escala a un técnico.' },
]

const INTRO = ['Hola, soy el asistente de PROTEC. Te haré algunas preguntas para identificar posibles causas del problema.']

/** Mapea el tipo del motor (celular/laptop/computadora) al id usado en ?device= */
const DEVICE_PARAM = { celular: 'phone', laptop: 'laptop', computadora: 'desktop' }

/**
 * Diagnóstico público (/diagnostico).
 * Usa el motor de reglas del backend en modo "preview": no guarda datos.
 * Para un diagnóstico vinculado a una solicitud se usa /diagnostico/:folio.
 */
export default function DiagnosisPage() {
  usePageTitle('Diagnóstico')
  const { notify } = useToast()
  const { isAuthenticated } = useAuth()

  const run = useCallback((answers) => diagnosisService.preview({ answers }), [])
  const dx = useRuleDiagnosis({ run, introMessages: INTRO })

  useEffect(() => {
    dx.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAttach = () =>
    notify({
      type: 'info',
      title: 'Adjuntar fotografías',
      description: 'Podrás subir fotografías al crear tu solicitud de reparación.',
    })

  const deviceParam = DEVICE_PARAM[dx.outcome?.context?.deviceType]

  return (
    <section className="relative overflow-hidden bg-surface pt-24 pb-16 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-electric/20 bg-electric/5 px-3 py-1 text-xs font-semibold text-electric">
            <Bot className="size-3.5" aria-hidden /> Diagnóstico rápido · no se guardan datos
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <BotAvatar size="lg" className="shadow-glow" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Diagnóstico inicial</h1>
                <p className="text-sm text-muted sm:text-base">
                  Responde algunas preguntas para identificar posibles causas.
                </p>
              </div>
            </div>

            {dx.error ? (
              <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
                <p className="font-semibold text-ink">No pudimos conectar con el asistente.</p>
                <p className="mt-1 text-sm text-muted">Verifica tu conexión e inténtalo de nuevo.</p>
                <Button className="mt-5" leadingIcon={RotateCcw} onClick={dx.start}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <ChatWindow
                messages={dx.messages}
                isTyping={dx.isTyping}
                onSend={dx.send}
                onAttach={handleAttach}
                inputDisabled={Boolean(dx.result)}
                title="Asistente PROTEC"
                subtitle="En línea · responde en segundos"
                placeholder={dx.result ? 'Diagnóstico completado' : 'Escribe tu respuesta...'}
                bodyClassName="h-[50vh] min-h-[340px] max-h-[560px]"
                headerActions={
                  <button
                    type="button"
                    onClick={dx.start}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-electric"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">Reiniciar</span>
                  </button>
                }
              />
            )}

            {dx.result && (
              <DiagnosisResultCard result={dx.result}>
                <p className="text-sm text-muted">
                  {isAuthenticated
                    ? 'Registra una solicitud para que un técnico revise tu caso y obtengas un folio de seguimiento.'
                    : 'Crea una cuenta y registra una solicitud para que un técnico revise tu caso.'}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button to={requestRepairWithDevice(deviceParam)} icon={ArrowRight}>
                    Solicitar reparación
                  </Button>
                  <Button variant="secondary" leadingIcon={RotateCcw} onClick={dx.start}>
                    Nuevo diagnóstico
                  </Button>
                </div>
              </DiagnosisResultCard>
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
              <p className="font-semibold">¿Prefieres hablar con un técnico?</p>
              <p className="mt-1 text-sm text-white/70">Registra tu solicitud y un especialista revisará tu caso.</p>
              <Button to={ROUTES.REQUEST_REPAIR} variant="light" size="sm" className="mt-5">
                Solicitar reparación
              </Button>
            </div>

            <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-muted">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
              El diagnóstico es orientativo y no sustituye la revisión de un técnico.
            </p>
          </aside>
        </div>
      </Container>
    </section>
  )
}

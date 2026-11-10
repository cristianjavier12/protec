import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Copy, Bot, ClipboardList, ArrowRight, ExternalLink, Wrench } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { repairService } from '../services/index'
import { ROUTES, repairDetailPath, diagnosisWithFolio, trackingWithFolio } from '../utils/routes'

/**
 * Página de éxito al crear una solicitud de reparación.
 * Muestra el folio generado y las acciones disponibles.
 */
export default function RepairCreatedPage() {
  usePageTitle('Solicitud creada')
  const { folio } = useParams()
  const { notify } = useToast()
  const [copied, setCopied] = useState(false)
  const [repair, setRepair] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    repairService.getByFolio(folio).then((res) => setRepair(res.repair)).catch(() => {})
  }, [folio])

  // Atención directa: el folio ya no está en "Solicitud registrada" porque se envió a un técnico.
  const direct = Boolean(repair && repair.estado !== 'Solicitud registrada' && !repair.diagnostico)

  const copyFolio = async () => {
    try {
      await navigator.clipboard.writeText(folio)
      setCopied(true)
      notify({ type: 'success', title: 'Folio copiado', description: `${folio} copiado al portapapeles.` })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      notify({ type: 'info', title: 'Folio', description: folio })
    }
  }

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-28 pb-20 sm:pt-32">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          {/* Animación de éxito */}
          <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-200/50 sm:size-24">
            <CheckCircle2 className="size-10 sm:size-12" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            ¡Solicitud registrada!
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted sm:text-lg">
            Tu solicitud fue creada exitosamente. Guarda tu número de folio para dar seguimiento.
          </p>

          {/* Folio */}
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-line bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-muted">Tu número de solicitud</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-3xl font-extrabold tracking-wider text-ink sm:text-4xl">{folio}</span>
              <button
                type="button"
                onClick={copyFolio}
                className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-electric hover:text-electric"
                aria-label="Copiar folio"
              >
                <Copy className={`size-4 ${copied ? 'text-emerald-600' : ''}`} />
              </button>
            </div>
            <p className="mt-3 text-xs text-muted">
              También lo encontrarás en la sección "Mis reparaciones".
            </p>
          </div>

          {/* Acciones: depende de si eligió el asistente o la atención directa de un técnico */}
          {direct && (
            <div className="mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl border border-electric/20 bg-white p-4 text-left shadow-soft">
              <Wrench className="mt-0.5 size-5 shrink-0 text-electric" aria-hidden />
              <p className="text-sm text-muted">
                {repair?.tecnico
                  ? <>El técnico especialista <strong className="text-ink">{repair.tecnico.nombre}</strong> confirmó tu folio y revisará tu caso. Ya puedes escribirle por chat.</>
                  : 'Tu folio ya está disponible para los técnicos especialistas del área. Te avisaremos en cuanto un especialista confirme y se quede con tu folio.'}
              </p>
            </div>
          )}
          <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            {direct ? (
              <Button to={repairDetailPath(folio)} size="lg" leadingIcon={ClipboardList} fullWidth className="sm:col-span-2">
                Ver mi solicitud
              </Button>
            ) : (
              <>
                <Button to={diagnosisWithFolio(folio)} size="lg" leadingIcon={Bot} fullWidth>
                  Iniciar diagnóstico
                </Button>
                <Button to={repairDetailPath(folio)} variant="secondary" size="lg" leadingIcon={ClipboardList} fullWidth>
                  Ver mi solicitud
                </Button>
              </>
            )}
          </div>

          <div className="mx-auto mt-4 flex max-w-lg flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={ROUTES.MY_REPAIRS}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-electric hover:underline"
            >
              Ir a Mis reparaciones <ArrowRight className="size-4" />
            </Link>
            <span className="hidden text-muted sm:inline">·</span>
            <Link
              to={trackingWithFolio(folio)}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-ink"
            >
              Seguimiento público <ExternalLink className="size-3.5" />
            </Link>
          </div>

          {/* Info */}
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-electric/15 bg-gradient-to-br from-electric/[0.06] to-aqua/[0.08] p-5 text-left">
            <p className="text-sm font-semibold text-ink">¿Qué sigue?</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-electric text-[10px] font-bold text-white">1</span>
                {direct ? 'El técnico revisa tu caso y te envía un diagnóstico y presupuesto.' : 'Inicia el diagnóstico para identificar posibles causas.'}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-electric text-[10px] font-bold text-white">2</span>
                Un técnico revisará tu caso y te contactará.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-electric text-[10px] font-bold text-white">3</span>
                Da seguimiento en tiempo real desde tu panel.
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}

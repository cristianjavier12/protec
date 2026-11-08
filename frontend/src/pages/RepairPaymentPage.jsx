import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle2, CreditCard, Info, Loader2, Lock, Store } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import PaymentSummary from '../components/workflow/PaymentSummary'
import { ErrorState, FormError, Skeleton } from '../components/workflow/Feedback'
import { usePageTitle } from '../hooks/usePageTitle'
import { repairService } from '../services/index'
import { formatCurrency } from '../utils/format'
import { repairDetailPath } from '../utils/routes'

/**
 * Pago de anticipo o saldo (/reparacion/:folio/pago).
 *  - Tarjeta: Stripe Checkout. La tarjeta se captura en la página segura de Stripe;
 *    PROTEC nunca recibe ni guarda sus datos. Al volver, se confirma el pago.
 *  - Efectivo o transferencia: en el centro de servicio; el administrador lo registra.
 */
export default function RepairPaymentPage() {
  const { folio } = useParams()
  usePageTitle(`Pago · ${folio}`)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sessionId = params.get('session_id')
  const cancelled = params.get('cancelado') === '1'

  const [info, setInfo] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error | forbidden
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(sessionId ? 'checking' : null) // checking | paid | pending | failed
  const attempts = useRef(0)

  const load = useCallback(async () => {
    try {
      setInfo(await repairService.getPayments(folio))
      setState('ready')
    } catch (err) {
      setState(err?.status === 403 || err?.status === 404 ? 'forbidden' : 'error')
    }
  }, [folio])

  useEffect(() => {
    load()
  }, [load])

  // Regreso desde Stripe: se verifica la sesión (el webhook también lo confirma en segundo plano).
  useEffect(() => {
    if (!sessionId) return undefined
    let timer
    const verify = async () => {
      try {
        const res = await repairService.verifyCheckout(folio, sessionId)
        if (res.pagado) {
          setConfirmation('paid')
          setInfo((i) => (i ? { ...i, ultimoPago: res.pago } : i))
          return
        }
        if (++attempts.current < 6) timer = setTimeout(verify, 2500)
        else setConfirmation('pending')
      } catch {
        setConfirmation('failed')
      }
    }
    verify()
    return () => clearTimeout(timer)
  }, [folio, sessionId])

  const tipo = info?.pagoDisponible
  const amount = tipo === 'anticipo' ? info?.resumenPagos?.anticipoRequerido : info?.resumenPagos?.saldoPendiente

  const payWithCard = async () => {
    setError('')
    setRedirecting(true)
    try {
      const { url } = await repairService.createCheckout(folio, tipo)
      window.location.assign(url)
    } catch (err) {
      setError(err?.message || 'No pudimos iniciar el pago. Inténtalo de nuevo.')
      setRedirecting(false)
    }
  }

  return (
    <section className="min-h-[80vh] bg-surface pt-24 pb-20 sm:pt-28">
      <Container className="max-w-4xl">
        <Link to={repairDetailPath(folio)} className="mb-6 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Volver a la solicitud {folio}
        </Link>

        {confirmation && (
          <div className="mx-auto mb-8 max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-10">
            {confirmation === 'checking' && (
              <>
                <Loader2 className="mx-auto size-10 animate-spin text-electric" aria-hidden />
                <h1 className="mt-5 text-xl font-bold text-ink">Confirmando tu pago...</h1>
                <p className="mt-2 text-sm text-muted">Esto toma solo unos segundos.</p>
              </>
            )}
            {confirmation === 'paid' && (
              <>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-9" aria-hidden />
                </span>
                <h1 className="mt-5 text-2xl font-extrabold text-ink">¡Pago recibido!</h1>
                <p className="mt-2 text-muted">
                  Tu pago {info?.ultimoPago ? <>de <strong className="text-ink">{formatCurrency(info.ultimoPago.monto)}</strong> </> : ''}se procesó correctamente con Stripe.
                </p>
                <Button className="mt-7" onClick={() => navigate(repairDetailPath(folio))}>
                  Continuar con mi solicitud
                </Button>
              </>
            )}
            {confirmation === 'pending' && (
              <>
                <Info className="mx-auto size-10 text-electric" aria-hidden />
                <h1 className="mt-5 text-xl font-bold text-ink">Tu pago se está procesando</h1>
                <p className="mt-2 text-sm text-muted">Te avisaremos con una notificación en cuanto Stripe lo confirme. No es necesario pagar de nuevo.</p>
                <Button variant="secondary" className="mt-6" onClick={() => navigate(repairDetailPath(folio))}>
                  Ir a mi solicitud
                </Button>
              </>
            )}
            {confirmation === 'failed' && (
              <>
                <Info className="mx-auto size-10 text-amber-500" aria-hidden />
                <h1 className="mt-5 text-xl font-bold text-ink">No pudimos confirmar el pago</h1>
                <p className="mt-2 text-sm text-muted">Si se realizó el cargo, se reflejará en unos minutos. Si no, puedes intentarlo de nuevo.</p>
                <Button variant="secondary" className="mt-6" onClick={() => setParams({}, { replace: true })}>
                  Volver a intentar
                </Button>
              </>
            )}
          </div>
        )}

        {!confirmation && (
          <>
            {state === 'loading' && (
              <div className="grid gap-6 md:grid-cols-[1fr_340px]">
                <Skeleton className="h-96 rounded-3xl bg-white" />
                <Skeleton className="h-72 rounded-3xl bg-white" />
              </div>
            )}
            {state === 'error' && <ErrorState onRetry={load} />}
            {state === 'forbidden' && <ErrorState title="No encontramos esta solicitud." description="El folio no existe o no pertenece a tu cuenta." />}
            {state === 'ready' && !tipo && <ErrorState title="No hay pagos pendientes en este momento." description={`Estado actual: ${info.estado}.`} />}

            {state === 'ready' && tipo && (
              <div className="grid gap-6 md:grid-cols-[1fr_340px] md:gap-8">
                <div className="flex flex-col gap-6">
                  {cancelled && (
                    <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Cancelaste el pago con tarjeta. No se realizó ningún cargo; puedes intentarlo de nuevo cuando quieras.
                    </p>
                  )}

                  <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
                    <h1 className="text-2xl font-extrabold tracking-tight text-ink">{tipo === 'anticipo' ? 'Realizar anticipo' : 'Pagar saldo'}</h1>
                    <p className="mt-2 text-sm text-muted">
                      {tipo === 'anticipo'
                        ? 'El anticipo del 50 % confirma tu presupuesto para iniciar la reparación.'
                        : 'Cubre el saldo restante para programar la entrega de tu dispositivo.'}
                    </p>

                    <div className="mt-6 rounded-2xl border-2 border-electric/30 bg-electric/[0.03] p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-electric text-white">
                          <CreditCard className="size-5" aria-hidden />
                        </span>
                        <div>
                          <p className="font-bold text-ink">Tarjeta de crédito o débito</p>
                          <p className="text-xs text-muted">Pago en línea procesado por Stripe</p>
                        </div>
                      </div>
                      {info.pagoEnLinea ? (
                        <>
                          <FormError message={error} />
                          <Button size="lg" fullWidth loading={redirecting} leadingIcon={Lock} className="mt-5" onClick={payWithCard}>
                            Pagar {formatCurrency(amount ?? 0)} con tarjeta
                          </Button>
                          <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            Serás redirigido a la página segura de Stripe. PROTEC no recibe ni guarda los datos de tu tarjeta.
                          </p>
                        </>
                      ) : (
                        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-muted ring-1 ring-line">
                          El pago con tarjeta no está disponible por el momento. Puedes pagar en el centro de servicio.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-line p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-electric">
                          <Store className="size-5" aria-hidden />
                        </span>
                        <div>
                          <p className="font-bold text-ink">Efectivo o transferencia</p>
                          <p className="text-xs text-muted">En el centro de servicio</p>
                        </div>
                      </div>
                      <p className="mt-3 flex items-start gap-2 text-sm text-muted">
                        <Banknote className="mt-0.5 size-4 shrink-0 text-electric" aria-hidden />
                        Paga en el centro de servicio o por transferencia indicando tu folio <strong className="text-ink">{info.folio}</strong>. El personal registrará tu pago y la reparación avanzará automáticamente.
                      </p>
                    </div>
                  </div>
                </div>

                <aside className="flex flex-col gap-4 md:sticky md:top-28 md:self-start">
                  <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                    <p className="font-bold text-ink">Resumen</p>
                    <p className="mt-1 text-sm text-muted">
                      {info.folio} · {info.dispositivo?.marca} {info.dispositivo?.modelo}
                    </p>
                    <PaymentSummary resumen={info.resumenPagos} highlight={tipo} className="mt-4" />
                    <div className="mt-4 rounded-2xl bg-navy p-4 text-white">
                      <p className="text-xs text-white/70">{tipo === 'anticipo' ? 'Anticipo a pagar (50 %)' : 'Saldo a pagar'}</p>
                      <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatCurrency(amount ?? 0)}</p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  )
}

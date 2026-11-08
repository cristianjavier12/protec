import { useState } from 'react'
import { Banknote, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import ConfirmDialog, { Modal } from '../workflow/ConfirmDialog'
import { Field, FormError, inputClass } from '../workflow/Feedback'
import { useToast } from '../../context/ToastContext'
import { adminService } from '../../services/index'

/** Estados en los que el cliente debe pagar y qué pago corresponde. */
export const PAYMENT_DUE = { 'Pendiente de anticipo': 'anticipo', 'Reparación terminada': 'pago_final' }

/** Registrar un pago recibido en el centro de servicio (efectivo o transferencia). */
function RegisterPaymentModal({ repair, onClose, onDone }) {
  const { notify } = useToast()
  const tipo = repair ? PAYMENT_DUE[repair.estado] : null
  const [metodo, setMetodo] = useState('Efectivo')
  const [referencia, setReferencia] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (metodo === 'Transferencia' && referencia.trim().length < 3) return setError('Escribe la referencia o folio de la transferencia.')
    setBusy(true)
    setError('')
    try {
      await adminService.registerPayment(repair.folio, { tipo, metodo, referencia: referencia.trim() || undefined })
      notify({ type: 'success', title: 'Pago registrado', description: `${repair.folio} avanzó al siguiente paso.` })
      onDone()
      onClose()
    } catch (err) {
      setError(err?.data?.errors?.referencia || err?.message || 'No se pudo registrar el pago.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(repair)}
      onClose={busy ? undefined : onClose}
      title="Registrar pago en sucursal"
      description={repair ? `${repair.folio} · ${tipo === 'anticipo' ? 'Anticipo (50 %)' : 'Saldo final'}` : ''}
    >
      {repair && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">El monto se calcula automáticamente con el presupuesto aceptado. Registra el pago solo cuando lo hayas recibido.</p>
          <Field label="Método">
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={inputClass}>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </Field>
          <Field label={metodo === 'Transferencia' ? 'Referencia de la transferencia' : 'Nota (opcional)'}>
            <input value={referencia} onChange={(e) => setReferencia(e.target.value.slice(0, 100))} className={inputClass} placeholder={metodo === 'Transferencia' ? 'Ej. SPEI 0012345' : 'Ej. Recibido en mostrador'} />
          </Field>
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" leadingIcon={Banknote} loading={busy}>
              Registrar pago
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Acciones administrativas sobre una solicitud: registrar pago y eliminar folio. */
export default function RepairAdminActions({ repair, onChanged }) {
  const { notify } = useToast()
  const [paying, setPaying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await adminService.deleteRepair(repair.folio)
      notify({ type: 'success', title: 'Solicitud eliminada', description: repair.folio })
      setConfirming(false)
      onChanged()
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo eliminar', description: err?.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {PAYMENT_DUE[repair.estado] && (
        <Button size="sm" variant="secondary" className="h-9 px-3" leadingIcon={Banknote} onClick={() => setPaying(true)}>
          Registrar pago
        </Button>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="grid size-9 place-items-center rounded-xl border border-line text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        aria-label={`Eliminar la solicitud ${repair.folio}`}
        title="Eliminar folio"
      >
        <Trash2 className="size-4" />
      </button>
      <RegisterPaymentModal repair={paying ? repair : null} onClose={() => setPaying(false)} onDone={onChanged} />
      <ConfirmDialog
        open={confirming}
        title={`Eliminar ${repair.folio}`}
        message={
          <>
            <p>
              Se eliminará la solicitud de <strong className="text-ink">{repair.cliente}</strong> con sus fotografías, presupuesto, pagos, mensajes e historial.
            </p>
            <p className="mt-2 font-medium text-red-700">Esta acción no se puede deshacer. El cliente recibirá una notificación.</p>
          </>
        }
        confirmLabel="Eliminar folio"
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

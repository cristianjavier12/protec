import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import Button from '../ui/Button'
import { Field, FormError, fieldError, inputClass } from './Feedback'
import { SCHEDULE_SLOTS } from '../../utils/status'
import { cn } from '../../utils/cn'

const todayStr = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Formulario de dirección + fecha + horario (recolección o entrega a domicilio). */
export default function ScheduleForm({ submitLabel = 'Programar', onSubmit, onCancel }) {
  const [form, setForm] = useState({ direccion: '', referencias: '', fechaPreferida: todayStr(), horario: SCHEDULE_SLOTS[0] })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (form.direccion.trim().length < 10) next.direccion = 'Escribe la dirección completa (calle, número, colonia).'
    if (!form.fechaPreferida) next.fechaPreferida = 'Selecciona una fecha.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setServerError('')
    try {
      await onSubmit({ ...form, direccion: form.direccion.trim(), referencias: form.referencias.trim() })
    } catch (err) {
      setErrors({ direccion: fieldError(err, 'direccion'), fechaPreferida: fieldError(err, 'fechaPreferida'), horario: fieldError(err, 'horario') })
      setServerError(err?.message || 'No pudimos guardar la información.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Dirección" error={errors.direccion}>
        <input value={form.direccion} onChange={set('direccion')} placeholder="Calle, número, colonia, ciudad" className={inputClass} maxLength={300} />
      </Field>
      <Field label="Referencias" hint="Opcional: color de fachada, entre calles, etc.">
        <input value={form.referencias} onChange={set('referencias')} placeholder="Ej. Portón negro, junto a la farmacia" className={inputClass} maxLength={255} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha preferida" error={errors.fechaPreferida}>
          <input type="date" min={todayStr()} value={form.fechaPreferida} onChange={set('fechaPreferida')} className={inputClass} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Horario</span>
          <div className="grid grid-cols-3 gap-2">
            {SCHEDULE_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setForm((f) => ({ ...f, horario: slot }))}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-xs font-semibold transition',
                  form.horario === slot ? 'border-electric bg-electric/5 text-electric' : 'border-line text-muted hover:border-electric/40',
                )}
              >
                {slot}
              </button>
            ))}
          </div>
          {errors.horario && <span className="text-xs text-red-600">{errors.horario}</span>}
        </div>
      </div>
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" leadingIcon={CalendarCheck} loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

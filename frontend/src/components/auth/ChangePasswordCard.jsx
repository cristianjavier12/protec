import { useState } from 'react'
import { KeyRound, Lock, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button'
import { TextField } from '../ui/FormFields'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { userService } from '../../services/index'
import { passwordProblem } from '../../utils/validators'

const EMPTY = { actual: '', nueva: '', confirmacion: '' }

/**
 * Cambio de contraseña desde el perfil: exige la contraseña actual.
 * Al guardar, el backend cierra las demás sesiones y entrega un token nuevo para esta.
 */
export default function ChangePasswordCard() {
  const { setSession } = useAuth()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const close = () => {
    setOpen(false)
    setForm(EMPTY)
    setErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.actual) next.actual = 'Escribe tu contraseña actual.'
    const problem = passwordProblem(form.nueva)
    if (problem) next.nueva = problem
    else if (form.nueva === form.actual) next.nueva = 'La nueva contraseña debe ser diferente a la actual.'
    if (form.confirmacion !== form.nueva) next.confirmacion = 'Las contraseñas no coinciden.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const res = await userService.changePassword(form)
      setSession(res.token, res.user)
      notify({ type: 'success', title: 'Contraseña actualizada', description: res.message })
      close()
    } catch (err) {
      if (err?.data?.errors) setErrors(err.data.errors)
      else notify({ type: 'warning', title: 'No se pudo cambiar la contraseña', description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-electric/10 text-electric">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-bold text-ink">Seguridad</p>
            <p className="text-sm text-muted">Cambia tu contraseña cuando lo necesites.</p>
          </div>
        </div>
        {!open && (
          <Button variant="secondary" size="sm" leadingIcon={KeyRound} onClick={() => setOpen(true)}>
            Cambiar contraseña
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            label="Contraseña actual"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            value={form.actual}
            onChange={set('actual')}
            error={errors.actual}
            required
            className="sm:col-span-2"
          />
          <TextField label="Nueva contraseña" type="password" icon={KeyRound} autoComplete="new-password" value={form.nueva} onChange={set('nueva')} error={errors.nueva} hint="Mínimo 8 caracteres, con letras y números." required />
          <TextField label="Confirmar nueva contraseña" type="password" icon={KeyRound} autoComplete="new-password" value={form.confirmacion} onChange={set('confirmacion')} error={errors.confirmacion} required />
          <p className="text-xs text-muted sm:col-span-2">Por seguridad cerraremos tu sesión en otros dispositivos.</p>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar contraseña
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

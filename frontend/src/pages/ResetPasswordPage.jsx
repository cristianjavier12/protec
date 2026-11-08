import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, KeyRound, Loader2, Lock, TimerOff } from 'lucide-react'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/FormFields'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { authService } from '../services/index'
import { ROUTES } from '../utils/routes'
import { passwordProblem } from '../utils/validators'

/** Crear una nueva contraseña desde el enlace del correo (/restablecer-contrasena?token=...). */
export default function ResetPasswordPage() {
  usePageTitle('Nueva contraseña')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { notify } = useToast()
  const [state, setState] = useState('checking') // checking | valid | invalid | done
  const [form, setForm] = useState({ password: '', confirmacion: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setState('invalid')
      return
    }
    authService
      .validateResetToken(token)
      .then((res) => setState(res.valid ? 'valid' : 'invalid'))
      .catch(() => setState('invalid'))
  }, [token])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    const problem = passwordProblem(form.password)
    if (problem) next.password = problem
    if (form.confirmacion !== form.password) next.confirmacion = 'Las contraseñas no coinciden.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    setServerError('')
    try {
      await authService.resetPassword({ token, password: form.password, confirmacion: form.confirmacion })
      setState('done')
      notify({ type: 'success', title: 'Contraseña actualizada', description: 'Ya puedes iniciar sesión con tu nueva contraseña.' })
    } catch (err) {
      if (err?.status === 400) setState('invalid')
      else {
        setErrors({ password: err?.data?.errors?.password, confirmacion: err?.data?.errors?.confirmacion })
        setServerError(err?.message || 'No pudimos actualizar la contraseña.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      {state === 'checking' && (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="size-5 animate-spin text-electric" aria-hidden /> Verificando enlace...
        </div>
      )}

      {state === 'invalid' && (
        <div>
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <TimerOff className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">El enlace venció</h1>
          <p className="mt-3 text-muted">Este enlace ya no es válido: venció o ya se utilizó. Solicita uno nuevo para restablecer tu contraseña.</p>
          <Button to={ROUTES.FORGOT_PASSWORD} className="mt-8">
            Solicitar un nuevo enlace
          </Button>
        </div>
      )}

      {state === 'done' && (
        <div>
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">¡Listo!</h1>
          <p className="mt-3 text-muted">Tu contraseña se actualizó y cerramos las sesiones abiertas en otros dispositivos.</p>
          <Button className="mt-8" onClick={() => navigate(ROUTES.LOGIN, { replace: true })}>
            Iniciar sesión
          </Button>
        </div>
      )}

      {state === 'valid' && (
        <>
          <span className="grid size-12 place-items-center rounded-2xl bg-electric/10 text-electric">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Crea una nueva contraseña</h1>
          <p className="mt-3 text-muted">Usa al menos 8 caracteres, con letras y números.</p>
          {serverError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
          <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
            <TextField label="Nueva contraseña" type="password" icon={Lock} autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} required />
            <TextField label="Confirmar contraseña" type="password" icon={Lock} autoComplete="new-password" value={form.confirmacion} onChange={set('confirmacion')} error={errors.confirmacion} required />
            <Button type="submit" size="lg" fullWidth loading={loading}>
              Guardar contraseña
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link to={ROUTES.LOGIN} className="font-semibold text-electric hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </div>
  )
}

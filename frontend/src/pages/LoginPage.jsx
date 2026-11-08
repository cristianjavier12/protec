import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/FormFields'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { authService } from '../services/index'
import { ROUTES, homeForRole } from '../utils/routes'
import { validateLogin } from '../utils/validators'

/**
 * Inicio de sesión funcional con JWT.
 */
export default function LoginPage() {
  usePageTitle('Iniciar sesión')
  const { notify } = useToast()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending] = useState(false)

  // Si venía de una página protegida se regresa ahí; si no, a la pantalla principal de su rol.
  const from = location.state?.from?.pathname

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
    if (serverError) setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = validateLogin(form)
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    setServerError('')
    try {
      const user = await login({ correo: form.email.trim(), password: form.password })
      notify({
        type: 'success',
        title: '¡Bienvenido!',
        description: `Hola, ${user.nombre}. Tu sesión está activa.`,
      })
      navigate(from && from !== ROUTES.LOGIN ? from : homeForRole(user.rol), { replace: true })
    } catch (err) {
      const fieldErrors = err?.data?.errors
      if (fieldErrors) {
        const { correo, ...rest } = fieldErrors
        setErrors((prev) => ({ ...prev, ...rest, ...(correo ? { email: correo } : {}) }))
      }
      const msg = err?.status === 429
        ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        : err?.message || 'No pudimos iniciar sesión. Intenta de nuevo.'
      setUnverified(err?.data?.code === 'EMAIL_NOT_VERIFIED')
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async () => {
    setResending(true)
    try {
      const res = await authService.resendVerification(form.email.trim().toLowerCase())
      notify({ type: 'success', title: 'Correo enviado', description: res.message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo reenviar', description: err?.message })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      <p className="text-sm font-semibold text-electric">Bienvenido de nuevo</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Iniciar sesión</h1>
      <p className="mt-3 text-muted">Accede para consultar tus solicitudes y comunicarte con tu técnico.</p>

      {serverError && (
        <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${unverified ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {serverError}
          {unverified && (
            <button type="button" onClick={resendVerification} disabled={resending} className="mt-2 block font-semibold underline disabled:opacity-60">
              {resending ? 'Enviando...' : 'Reenviar correo de confirmación'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-9 flex flex-col gap-5">
        <TextField
          label="Correo electrónico"
          type="email"
          icon={Mail}
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          icon={Lock}
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />
        <Link to={ROUTES.FORGOT_PASSWORD} className="-mt-2 self-end text-sm font-semibold text-electric hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>

        <Button type="submit" size="lg" icon={ArrowRight} fullWidth className="mt-2" loading={loading}>
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link to={ROUTES.REGISTER} className="font-semibold text-electric hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, MailCheck, Lock, Phone, User, ArrowRight } from 'lucide-react'
import Button from '../components/ui/Button'
import { TextField, CheckboxField } from '../components/ui/FormFields'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { authService } from '../services/index'
import { ROUTES } from '../utils/routes'
import { validateRegister } from '../utils/validators'

const INITIAL = {
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

/**
 * Registro funcional con API real.
 */
export default function RegisterPage() {
  usePageTitle('Crear cuenta')
  const { notify } = useToast()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resending, setResending] = useState(false)

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
    if (serverError) setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = validateRegister(form)
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    setServerError('')
    try {
      const res = await register({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        correo: form.email.trim(),
        telefono: form.telefono.trim(),
        password: form.password,
        aceptaTerminos: form.terms,
      })
      if (res?.verificationRequired) {
        setPendingEmail(form.email.trim().toLowerCase())
        return
      }
      notify({ type: 'success', title: 'Cuenta creada', description: 'Ya puedes iniciar sesión.', duration: 5000 })
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (err) {
      const fieldErrors = err?.data?.errors
      if (fieldErrors) {
        // El backend usa `correo`; el formulario usa `email`.
        const { correo, aceptaTerminos, ...rest } = fieldErrors
        setErrors((prev) => ({ ...prev, ...rest, ...(correo ? { email: correo } : {}), ...(aceptaTerminos ? { terms: aceptaTerminos } : {}) }))
      }
      setServerError(
        fieldErrors ? 'Revisa los campos marcados.' : err?.message || 'No pudimos crear tu cuenta. Intenta de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true)
    try {
      const res = await authService.resendVerification(pendingEmail)
      notify({ type: 'success', title: 'Correo enviado', description: res.message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo reenviar', description: err?.message })
    } finally {
      setResending(false)
    }
  }

  if (pendingEmail) {
    return (
      <div className="mx-auto max-w-lg">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Confirma tu correo</h1>
        <p className="mt-3 text-muted">
          Tu cuenta se creó. Enviamos un enlace de confirmación a <strong className="text-ink">{pendingEmail}</strong>. Ábrelo para activar tu cuenta y
          después inicia sesión.
        </p>
        <p className="mt-3 text-sm text-muted">Si no lo ves en unos minutos, revisa tu carpeta de spam o solicita otro.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" loading={resending} onClick={resend}>
            Reenviar correo
          </Button>
          <Button to={ROUTES.LOGIN} icon={ArrowRight}>
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-sm font-semibold text-electric">Crea tu cuenta gratis</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Crear cuenta</h1>
      <p className="mt-3 text-muted">Registra tus dispositivos y da seguimiento a cada reparación.</p>

      {serverError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
        <TextField
          label="Nombre"
          icon={User}
          placeholder="Tu nombre"
          autoComplete="given-name"
          value={form.nombre}
          onChange={update('nombre')}
          error={errors.nombre}
          required
        />
        <TextField
          label="Apellidos"
          placeholder="Tus apellidos"
          autoComplete="family-name"
          value={form.apellidos}
          onChange={update('apellidos')}
          error={errors.apellidos}
          required
        />
        <TextField
          label="Correo"
          type="email"
          icon={Mail}
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          className="sm:col-span-2"
        />
        <TextField
          label="Teléfono"
          type="tel"
          icon={Phone}
          placeholder="55 1234 5678"
          autoComplete="tel"
          value={form.telefono}
          onChange={update('telefono')}
          error={errors.telefono}
          required
          className="sm:col-span-2"
        />
        <TextField
          label="Contraseña"
          type="password"
          icon={Lock}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />
        <TextField
          label="Confirmar contraseña"
          type="password"
          icon={Lock}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          required
        />

        <CheckboxField
          className="sm:col-span-2"
          checked={form.terms}
          onChange={update('terms')}
          error={errors.terms}
          label={
            <>
              He leído y acepto los{' '}
              <Link to={ROUTES.TERMS} target="_blank" className="font-semibold text-electric hover:underline">
                Términos y condiciones
              </Link>{' '}
              y el{' '}
              <Link to={ROUTES.PRIVACY} target="_blank" className="font-semibold text-electric hover:underline">
                Aviso de privacidad
              </Link>
              .
            </>
          }
        />

        <Button type="submit" size="lg" icon={ArrowRight} fullWidth className="sm:col-span-2" loading={loading}>
          Crear cuenta
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-electric hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/FormFields'
import { usePageTitle } from '../hooks/usePageTitle'
import { authService } from '../services/index'
import { ROUTES } from '../utils/routes'
import { isEmail } from '../utils/validators'

/**
 * Solicitud de recuperación de contraseña (/recuperar-contrasena).
 * Por seguridad la respuesta es la misma exista o no la cuenta.
 */
export default function ForgotPasswordPage() {
  usePageTitle('Recuperar contraseña')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) return setError('Ingresa un correo válido.')
    setLoading(true)
    setServerError('')
    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase())
      setSent(res.message)
    } catch (err) {
      if (err?.status === 404) {
        setError(err.message || 'No encontramos ninguna cuenta registrada con ese correo electrónico.')
      } else {
        setServerError(err?.status === 429 ? err.message : err?.message || 'No pudimos procesar la solicitud. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      <Link to={ROUTES.LOGIN} className="mb-6 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted transition hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
      </Link>

      {sent ? (
        <div>
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MailCheck className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Revisa tu correo</h1>
          <p className="mt-3 text-muted">{sent}</p>
          <p className="mt-3 text-sm text-muted">El enlace vence después de un tiempo y solo puede usarse una vez. Si no llega en unos minutos, puedes solicitar otro.</p>
          <Button variant="secondary" className="mt-8" onClick={() => setSent('')}>
            Enviar otro enlace
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-electric">¿Olvidaste tu contraseña?</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Recupera tu cuenta</h1>
          <p className="mt-3 text-muted">Escribe el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.</p>

          {serverError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

          <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
            <TextField
              label="Correo electrónico"
              type="email"
              icon={Mail}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              error={error}
              required
            />
            <Button type="submit" size="lg" icon={Send} fullWidth loading={loading}>
              Enviar enlace de recuperación
            </Button>
          </form>
        </>
      )}
    </div>
  )
}

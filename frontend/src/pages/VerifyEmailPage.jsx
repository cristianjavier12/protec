import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2, Mail, Send, TimerOff } from 'lucide-react'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/FormFields'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { authService } from '../services/index'
import { ROUTES } from '../utils/routes'
import { isEmail } from '../utils/validators'

/** Confirmación del correo desde el enlace enviado al registrarse (/verificar-correo?token=...). */
export default function VerifyEmailPage() {
  usePageTitle('Confirmar correo')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { notify } = useToast()
  const [state, setState] = useState('checking') // checking | done | invalid
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // evita doble verificación en modo estricto de React
    ran.current = true
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setState('invalid')
      return
    }
    authService
      .verifyEmail(token)
      .then(() => setState('done'))
      .catch(() => setState('invalid'))
  }, [token])

  const resend = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) return setError('Ingresa un correo válido.')
    setSending(true)
    try {
      const res = await authService.resendVerification(email.trim().toLowerCase())
      notify({ type: 'success', title: 'Correo enviado', description: res.message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo reenviar', description: err?.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      {state === 'checking' && (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="size-5 animate-spin text-electric" aria-hidden /> Confirmando tu correo...
        </div>
      )}

      {state === 'done' && (
        <div>
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">¡Correo confirmado!</h1>
          <p className="mt-3 text-muted">Tu cuenta está activa. Ya puedes iniciar sesión y solicitar tu primera reparación.</p>
          <Button to={ROUTES.LOGIN} icon={ArrowRight} className="mt-8">
            Iniciar sesión
          </Button>
        </div>
      )}

      {state === 'invalid' && (
        <div>
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <TimerOff className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">El enlace no es válido</h1>
          <p className="mt-3 text-muted">El enlace venció o ya se utilizó. Si tu cuenta ya está confirmada, simplemente inicia sesión; si no, solicita uno nuevo.</p>
          <form onSubmit={resend} noValidate className="mt-8 flex flex-col gap-4">
            <TextField
              label="Correo de tu cuenta"
              type="email"
              icon={Mail}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              error={error}
            />
            <Button type="submit" leadingIcon={Send} loading={sending}>
              Enviar un nuevo enlace
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            <Link to={ROUTES.LOGIN} className="font-semibold text-electric hover:underline">
              Ir a iniciar sesión
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

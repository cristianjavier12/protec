import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Shield,
  User,
  UserRound,
  Wrench,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Eyebrow from '../components/ui/Eyebrow'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/FormFields'
import ChangePasswordCard from '../components/auth/ChangePasswordCard'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { userService } from '../services/index'
import { formatDate } from '../utils/format'
import { isPhone } from '../utils/validators'
import { ROUTES } from '../utils/routes'
import { getDeviceMeta } from '../utils/repairs'
import { cn } from '../utils/cn'

const ROLE_LABELS = { usuario: 'Cliente', tecnico: 'Técnico', admin: 'Administrador' }

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface/70 px-4 py-3">
      <Icon className="size-4 shrink-0 text-electric" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-semibold text-ink">{value || '—'}</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

function validateProfile(form) {
  const errors = {}
  if (form.nombre.trim().length < 2) errors.nombre = 'Ingresa tu nombre (mínimo 2 caracteres).'
  if (form.apellidos.trim().length < 2) errors.apellidos = 'Ingresa tus apellidos (mínimo 2 caracteres).'
  if (!form.telefono.trim()) errors.telefono = 'Ingresa tu teléfono.'
  else if (!isPhone(form.telefono)) errors.telefono = 'Ingresa un teléfono válido.'
  return errors
}

/**
 * Mi cuenta (/mi-cuenta): datos del perfil, edición, estadísticas y dispositivos.
 */
export default function MyAccountPage() {
  usePageTitle('Mi cuenta')
  const { updateUser, logout } = useAuth()
  const { notify } = useToast()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ total: 0, activas: 0, terminadas: 0 })
  const [devices, setDevices] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '' })
  const [errors, setErrors] = useState({})

  const fillForm = (u) => setForm({ nombre: u?.nombre ?? '', apellidos: u?.apellidos ?? '', telefono: u?.telefono ?? '' })

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const [profileRes, devicesRes] = await Promise.all([userService.getProfile(), userService.listDevices()])
      setProfile(profileRes.user)
      setStats(profileRes.stats ?? { total: 0, activas: 0, terminadas: 0 })
      setDevices(devicesRes.devices ?? [])
      fillForm(profileRes.user)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const cancel = () => {
    setEditing(false)
    setErrors({})
    fillForm(profile)
  }

  const save = async (e) => {
    e.preventDefault()
    const next = validateProfile(form)
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const res = await userService.updateProfile({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim(),
      })
      setProfile(res.user)
      updateUser(res.user)
      setEditing(false)
      notify({ type: 'success', title: 'Perfil actualizado', description: res.message })
    } catch (err) {
      // Errores de validación del servidor mostrados debajo de cada campo.
      if (err?.data?.errors) setErrors(err.data.errors)
      notify({ type: 'warning', title: 'No se pudo guardar', description: err?.message || 'Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const initials = `${profile?.nombre?.[0] ?? ''}${profile?.apellidos?.[0] ?? ''}`.toUpperCase() || 'U'
  const fullName = [profile?.nombre, profile?.apellidos].filter(Boolean).join(' ')

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-28 pb-20 sm:pt-32">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Container className="relative">
        <div className="mx-auto max-w-4xl">
          <Eyebrow icon={UserRound}>Mi cuenta</Eyebrow>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Perfil y dispositivos</h1>

          {status === 'loading' && (
            <div className="mt-8 grid animate-pulse gap-6">
              <div className="h-64 rounded-3xl bg-white" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-3xl bg-white" />
                ))}
              </div>
              <div className="h-48 rounded-3xl bg-white" />
            </div>
          )}

          {status === 'error' && (
            <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-10">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                <AlertTriangle className="size-7" aria-hidden />
              </span>
              <p className="mt-5 text-lg font-bold text-ink">No pudimos cargar tu perfil.</p>
              <Button className="mt-6" leadingIcon={RefreshCw} onClick={load}>
                Reintentar
              </Button>
            </div>
          )}

          {status === 'ready' && profile && (
            <div className="mt-8 flex flex-col gap-6">
              {/* Perfil */}
              <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <span className="grid size-20 shrink-0 place-items-center rounded-full bg-brand-gradient text-2xl font-bold text-white shadow-glow">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-ink">{fullName}</p>
                    <p className="mt-0.5 truncate text-muted">{profile.correo}</p>
                  </div>
                  {!editing && (
                    <Button variant="secondary" size="sm" leadingIcon={Pencil} onClick={() => setEditing(true)}>
                      Editar perfil
                    </Button>
                  )}
                </div>

                {!editing ? (
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <InfoRow icon={User} label="Nombre completo" value={fullName} />
                    <InfoRow icon={Mail} label="Correo electrónico" value={profile.correo} />
                    <InfoRow icon={Phone} label="Teléfono" value={profile.telefono} />
                    <InfoRow icon={Shield} label="Tipo de cuenta" value={ROLE_LABELS[profile.rol] ?? profile.rol} />
                    <InfoRow icon={CalendarDays} label="Miembro desde" value={formatDate(profile.fechaRegistro)} />
                  </div>
                ) : (
                  <form onSubmit={save} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
                    <TextField label="Nombre" icon={User} value={form.nombre} onChange={update('nombre')} error={errors.nombre} required maxLength={80} />
                    <TextField label="Apellidos" value={form.apellidos} onChange={update('apellidos')} error={errors.apellidos} required maxLength={120} />
                    <TextField label="Teléfono" type="tel" icon={Phone} value={form.telefono} onChange={update('telefono')} error={errors.telefono} required />
                    <TextField label="Correo electrónico" icon={Mail} value={profile.correo} disabled hint="El correo no se puede modificar." />
                    <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button type="submit" loading={saving}>
                        Guardar cambios
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Seguridad */}
              <ChangePasswordCard />

              {/* Estadísticas */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={Wrench} label="Solicitudes" value={stats.total} tone="bg-electric/10 text-electric" />
                <StatCard icon={Clock} label="Activas" value={stats.activas} tone="bg-amber-50 text-amber-600" />
                <StatCard icon={CheckCircle2} label="Finalizadas" value={stats.terminadas} tone="bg-emerald-50 text-emerald-600" />
              </div>

              {/* Dispositivos */}
              <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-ink">Mis dispositivos</p>
                  <span className="rounded-full bg-surface px-3 py-0.5 text-sm font-semibold text-muted">{devices.length}</span>
                </div>

                {devices.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface/60 p-8 text-center">
                    <Package className="mx-auto size-8 text-muted/60" aria-hidden />
                    <p className="mt-3 font-semibold text-ink">Sin dispositivos registrados</p>
                    <p className="mt-1 text-sm text-muted">Se agregan automáticamente al solicitar una reparación.</p>
                    <Button className="mt-5" size="sm" to={ROUTES.REQUEST_REPAIR} icon={ArrowRight}>
                      Solicitar reparación
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {devices.map((d) => {
                      const meta = getDeviceMeta(d.tipo)
                      return (
                        <li key={d.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface/50 p-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy text-aqua">
                            <meta.icon className="size-6" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-ink">
                              {d.marca} {d.modelo}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {meta.label}
                              {d.numeroSerie ? ` · S/N ${d.numeroSerie}` : ''} · {formatDate(d.fechaRegistro)}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Link
                  to={ROUTES.MY_REPAIRS}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-electric hover:underline"
                >
                  Ver mis reparaciones <ArrowRight className="size-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline"
                >
                  <LogOut className="size-4" aria-hidden /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Shuffle, Trash2, UserCog, UserPlus, Users } from 'lucide-react'
import Button from '../ui/Button'
import ConfirmDialog, { Modal } from '../workflow/ConfirmDialog'
import { ErrorState, Field, FormError, SectionCard, SkeletonList, inputClass } from '../workflow/Feedback'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { adminService } from '../../services/index'
import { formatDate } from '../../utils/format'
import { SPECIALTY_LABELS } from '../../utils/status'
import { passwordProblem } from '../../utils/validators'
import { cn } from '../../utils/cn'

const ROLE_LABEL = { usuario: 'Cliente', tecnico: 'Técnico', admin: 'Administrador' }
const ROLE_TONE = { usuario: 'bg-slate-100 text-slate-700', tecnico: 'bg-electric/10 text-electric', admin: 'bg-navy text-white' }
const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'usuario', label: 'Clientes' },
  { key: 'tecnico', label: 'Técnicos' },
  { key: 'admin', label: 'Administradores' },
]

/** Contraseña temporal legible (letras + números) para compartir con la persona. */
function temporaryPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const pick = (set, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => set[v % set.length]).join('')
  return `${pick(letters, 6)}${pick(digits, 4)}`
}

const EMPTY = { rol: 'tecnico', especialidad: 'general', nombre: '', apellidos: '', correo: '', telefono: '', password: '' }

function CreateAccountModal({ open, onClose, onCreated }) {
  const { notify } = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, password: temporaryPassword() })
      setErrors({})
      setServerError('')
    }
  }, [open])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (form.nombre.trim().length < 2) next.nombre = 'Escribe el nombre.'
    if (form.apellidos.trim().length < 2) next.apellidos = 'Escribe los apellidos.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.correo.trim())) next.correo = 'Escribe un correo válido.'
    if (!/^[+\d][\d\s-]{7,17}$/.test(form.telefono.trim())) next.telefono = 'Escribe un teléfono válido.'
    const pw = passwordProblem(form.password)
    if (pw) next.password = pw
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setServerError('')
    try {
      const res = await adminService.createUser({ ...form, correo: form.correo.trim().toLowerCase(), confirmPassword: form.password })
      notify({ type: 'success', title: 'Cuenta creada', description: `Comparte la contraseña temporal con ${res.user.nombre}; podrá cambiarla en Mi cuenta.` })
      onCreated(res.user)
      onClose()
    } catch (err) {
      const fe = err?.data?.errors
      if (fe) setErrors({ ...fe, correo: fe.correo, password: fe.password })
      setServerError(err?.message || 'No se pudo crear la cuenta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Nueva cuenta" description="Crea cuentas para técnicos, administradores o clientes." size="lg">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de cuenta">
          <select value={form.rol} onChange={set('rol')} className={inputClass}>
            <option value="tecnico">Técnico</option>
            <option value="admin">Administrador</option>
            <option value="usuario">Cliente</option>
          </select>
        </Field>
        {form.rol === 'tecnico' ? (
          <Field label="Especialidad">
            <select value={form.especialidad} onChange={set('especialidad')} className={inputClass}>
              {Object.entries(SPECIALTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Nombre" error={errors.nombre}>
          <input value={form.nombre} onChange={set('nombre')} className={inputClass} maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Apellidos" error={errors.apellidos}>
          <input value={form.apellidos} onChange={set('apellidos')} className={inputClass} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Correo electrónico" error={errors.correo}>
          <input type="email" value={form.correo} onChange={set('correo')} className={inputClass} maxLength={160} autoComplete="off" />
        </Field>
        <Field label="Teléfono" error={errors.telefono}>
          <input type="tel" value={form.telefono} onChange={set('telefono')} className={inputClass} maxLength={20} autoComplete="off" />
        </Field>
        <Field label="Contraseña temporal" error={errors.password} hint="Compártela con la persona; podrá cambiarla desde Mi cuenta." className="sm:col-span-2">
          <div className="flex gap-2">
            <input value={form.password} onChange={set('password')} className={cn(inputClass, 'font-mono')} maxLength={72} autoComplete="new-password" />
            <Button type="button" variant="secondary" leadingIcon={RefreshCw} onClick={() => setForm((f) => ({ ...f, password: temporaryPassword() }))}>
              Generar
            </Button>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <FormError message={serverError} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" leadingIcon={UserPlus} loading={busy}>
            Crear cuenta
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ChangeRoleModal({ target, onClose, onChanged }) {
  const { notify } = useToast()
  const [rol, setRol] = useState('tecnico')
  const [especialidad, setEspecialidad] = useState('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (target) {
      setRol(target.rol === 'tecnico' ? 'usuario' : 'tecnico')
      setEspecialidad('general')
      setError('')
    }
  }, [target])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminService.changeUserRole(target.id, { rol, especialidad })
      notify({ type: 'success', title: 'Rol actualizado', description: `${target.nombre} ahora es ${ROLE_LABEL[rol].toLowerCase()}. Deberá iniciar sesión de nuevo.` })
      onChanged()
      onClose()
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar el rol.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={Boolean(target)} onClose={busy ? undefined : onClose} title="Cambiar tipo de cuenta" description={target ? `${target.nombre} · ${target.correo}` : ''}>
      {target && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Tipo actual: <strong className="text-ink">{ROLE_LABEL[target.rol]}</strong>
          </p>
          <Field label="Nuevo tipo de cuenta">
            <select value={rol} onChange={(e) => setRol(e.target.value)} className={inputClass}>
              {['tecnico', 'admin', 'usuario']
                .filter((r) => r !== target.rol)
                .map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
            </select>
          </Field>
          {rol === 'tecnico' && (
            <Field label="Especialidad">
              <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={inputClass}>
                {Object.entries(SPECIALTY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <p className="rounded-2xl bg-surface p-3 text-xs text-muted">
            Sus solicitudes como cliente se conservan. Por seguridad, se cerrará su sesión para que vuelva a entrar con los nuevos permisos.
          </p>
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" leadingIcon={Shuffle} loading={busy}>
              {rol === 'tecnico' ? 'Convertir en técnico' : 'Cambiar tipo'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Pestaña "Usuarios" del panel administrativo. */
export default function AdminUsersTab() {
  const { user: me, logout } = useAuth()
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [roleTarget, setRoleTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems((await adminService.listUsers()).users)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const adminCount = useMemo(() => items.filter((u) => u.rol === 'admin').length, [items])

  const filtered = useMemo(
    () => items.filter((u) => (!roleFilter || u.rol === roleFilter) && `${u.nombre} ${u.correo}`.toLowerCase().includes(q.trim().toLowerCase())),
    [items, q, roleFilter],
  )

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const targetId = deleteTarget.id
      const res = await adminService.deleteUser(targetId)
      notify({ type: 'success', title: 'Cuenta eliminada', description: res.removedRepairs ? `También se eliminaron ${res.removedRepairs} solicitud(es).` : deleteTarget.correo })
      setItems((list) => list.filter((u) => u.id !== targetId))
      setDeleteTarget(null)
      if (targetId === me?.id || res.selfDeleted) logout()
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo eliminar', description: err?.message })
    } finally {
      setDeleting(false)
    }
  }

  const deleteMessage = (u) => {
    if (!u) return null
    return (
      <>
        <p>
          Se eliminará la cuenta de <strong className="text-ink">{u.nombre}</strong> ({u.correo}). Esta acción no se puede deshacer.
        </p>
        {u.solicitudes > 0 && (
          <p className="mt-2 font-medium text-red-700">
            También se eliminarán sus {u.solicitudes} solicitud(es) de reparación con fotografías, pagos y mensajes.
          </p>
        )}
        {u.rol === 'tecnico' && <p className="mt-2">Los trabajos que ya terminó conservarán su historial.</p>}
      </>
    )
  }

  return (
    <SectionCard
      title={`Cuentas (${items.length})`}
      icon={Users}
      action={
        <Button size="sm" leadingIcon={UserPlus} onClick={() => setCreating(true)}>
          Nueva cuenta
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setRoleFilter(f.key)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                roleFilter === f.key ? 'bg-electric text-white shadow-glow' : 'bg-surface text-muted hover:text-electric',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-line px-3 focus-within:border-electric sm:w-72">
          <Search className="size-4 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre o correo" className="h-10 w-full bg-transparent text-sm outline-none" aria-label="Buscar cuenta" />
        </label>
      </div>

      <div className="mt-5">
        {state === 'loading' ? (
          <SkeletonList rows={4} className="h-14" />
        ) : state === 'error' ? (
          <ErrorState onRetry={load} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-surface text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Solicitudes</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => {
                  const isMe = u.id === me?.id
                  const busyTech = u.rol === 'tecnico' && u.asignadasActivas > 0
                  const isLastAdmin = u.rol === 'admin' && adminCount <= 1
                  const deleteDisabled = busyTech || isLastAdmin
                  const deleteTitle = isLastAdmin
                    ? 'Debe quedar por lo menos una cuenta de administrador'
                    : busyTech
                      ? 'Reasigna sus solicitudes activas antes de eliminarlo'
                      : 'Eliminar cuenta'
                  return (
                    <tr key={u.id} className="hover:bg-surface/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {u.nombre} {isMe && <span className="ml-1 text-xs text-muted">(tú)</span>}
                        </p>
                        <p className="text-xs text-muted">
                          {u.correo}
                          {!u.verificado && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Correo sin confirmar</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ROLE_TONE[u.rol])}>{ROLE_LABEL[u.rol]}</span>
                        {u.especialidad && <p className="mt-1 text-xs text-muted">{SPECIALTY_LABELS[u.especialidad]}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted tabular-nums">
                        {u.solicitudes}
                        {u.rol === 'tecnico' && <span className="block text-xs">{u.asignadasActivas} asignada(s) activa(s)</span>}
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDate(u.fechaRegistro)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isMe && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-9 px-3"
                              leadingIcon={UserCog}
                              disabled={isLastAdmin}
                              title={isLastAdmin ? 'Debe quedar por lo menos una cuenta de administrador' : undefined}
                              onClick={() => setRoleTarget(u)}
                            >
                              {u.rol === 'usuario' ? 'Convertir en técnico' : 'Cambiar tipo'}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            disabled={deleteDisabled}
                            title={deleteTitle}
                            className="grid size-9 place-items-center rounded-xl border border-line text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label={`Eliminar la cuenta de ${u.nombre}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                      No hay cuentas con ese criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAccountModal open={creating} onClose={() => setCreating(false)} onCreated={() => load()} />
      <ChangeRoleModal target={roleTarget} onClose={() => setRoleTarget(null)} onChanged={load} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar cuenta"
        message={deleteMessage(deleteTarget)}
        confirmLabel="Eliminar cuenta"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </SectionCard>
  )
}

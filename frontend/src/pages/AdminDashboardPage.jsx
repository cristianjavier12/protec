import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Hourglass,
  LayoutDashboard,
  Receipt,
  Search,
  Star,
  UserCheck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import DashboardStatCard from '../components/workflow/DashboardStatCard'
import StatusBadge from '../components/workflow/StatusBadge'
import AdminUsersTab from '../components/admin/AdminUsersTab'
import RepairAdminActions from '../components/admin/RepairAdminActions'
import { paymentMethodLabel } from '../components/workflow/PaymentSummary'
import { EmptyState, ErrorState, SectionCard, SkeletonList, inputClass } from '../components/workflow/Feedback'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { adminService } from '../services/index'
import { formatCurrency, formatDate } from '../utils/format'
import { DEVICE_META } from '../utils/repairs'
import { SPECIALTY_LABELS, TONE_DOT, statusToneOf } from '../utils/status'
import { repairDetailPath } from '../utils/routes'
import { cn } from '../utils/cn'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { key: 'tecnicos', label: 'Técnicos', icon: UserCog },
  { key: 'usuarios', label: 'Usuarios', icon: Users },
  { key: 'pagos', label: 'Pagos', icon: Receipt },
]

const ALL_STATUSES = [
  'Solicitud registrada', 'Diagnóstico inicial', 'Pendiente de técnico', 'Técnico asignado', 'Pendiente de anticipo',
  'Presupuesto rechazado', 'Listo para recibir dispositivo', 'Recolección pendiente', 'Recolección programada', 'Equipo recibido',
  'En revisión', 'En reparación', 'Esperando pieza', 'Reparación terminada', 'Listo para entrega', 'Entrega programada',
  'En camino', 'Finalizado', 'Resuelto mediante diagnóstico',
]
const DEVICE_COLORS = { celular: '#247cff', laptop: '#18c8ff', computadora: '#081a33' }

/* ---------- Gráficas ligeras (CSS, sin librerías) ---------- */

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.estado}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-ink">{d.estado}</span>
            <span className="font-semibold text-ink tabular-nums">{d.total}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface">
            <div className={cn('h-full rounded-full transition-[width] duration-700', TONE_DOT[statusToneOf(d.estado)])} style={{ width: `${(d.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.total, 0)
  let acc = 0
  const stops = data
    .map((d) => {
      const from = (acc / total) * 360
      acc += d.total
      return `${DEVICE_COLORS[d.tipo] ?? '#94a3b8'} ${from}deg ${(acc / total) * 360}deg`
    })
    .join(', ')
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-36 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${stops})` : '#e4ebf3' }} role="img" aria-label="Solicitudes por tipo de dispositivo">
        <div className="absolute inset-5 grid place-items-center rounded-full bg-white">
          <span className="text-center">
            <span className="block text-2xl font-extrabold text-ink">{total}</span>
            <span className="text-xs text-muted">solicitudes</span>
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {data.map((d) => (
          <li key={d.tipo} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: DEVICE_COLORS[d.tipo] }} />
              {DEVICE_META[d.tipo]?.label ?? d.tipo}
            </span>
            <span className="font-semibold tabular-nums">
              {d.total} <span className="font-normal text-muted">({total ? Math.round((d.total / total) * 100) : 0}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RevenueCard({ ingresos }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-navy to-navy-700 p-6 text-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <CircleDollarSign className="size-5 text-aqua" aria-hidden /> Ingresos registrados
        </p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">Solo pagos con estado “pagado”</span>
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight tabular-nums">{formatCurrency(ingresos?.total ?? 0)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs text-white/70">Anticipos</p>
          <p className="mt-0.5 font-bold tabular-nums">{formatCurrency(ingresos?.anticipos ?? 0)}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs text-white/70">Pagos finales</p>
          <p className="mt-0.5 font-bold tabular-nums">{formatCurrency(ingresos?.pagosFinales ?? 0)}</p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Pestañas ---------- */

function DashboardTab() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const load = useCallback(async () => {
    setState('loading')
    try {
      setData(await adminService.getDashboard())
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  if (state === 'error') return <ErrorState onRetry={load} />
  const s = data?.stats
  const loading = state === 'loading'
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <DashboardStatCard icon={ClipboardList} label="Solicitudes totales" value={s?.solicitudesTotales ?? 0} loading={loading} />
        <DashboardStatCard icon={Activity} label="Solicitudes activas" value={s?.activas ?? 0} tone="indigo" loading={loading} />
        <DashboardStatCard icon={Wrench} label="En reparación" value={s?.enReparacion ?? 0} tone="aqua" loading={loading} />
        <DashboardStatCard icon={CheckCircle2} label="Terminadas" value={s?.terminadas ?? 0} tone="green" loading={loading} />
        <DashboardStatCard icon={Hourglass} label="Pendientes de técnico" value={s?.pendientesTecnico ?? 0} tone="amber" loading={loading} />
        <DashboardStatCard icon={CircleDollarSign} label="Ingresos registrados" value={formatCurrency(data?.ingresos?.total ?? 0)} tone="navy" loading={loading} />
        <DashboardStatCard icon={UserCheck} label="Técnicos disponibles" value={s ? `${s.tecnicosDisponibles} / ${s.tecnicos}` : 0} tone="green" loading={loading} />
        <DashboardStatCard icon={Users} label="Usuarios registrados" value={s?.usuariosRegistrados ?? 0} tone="electric" loading={loading} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard title="Solicitudes por estado" icon={Activity}>
          {loading ? <SkeletonList rows={5} className="h-8" /> : data.porEstado.length ? <BarChart data={data.porEstado} /> : <p className="text-sm text-muted">Sin solicitudes.</p>}
        </SectionCard>
        <div className="flex flex-col gap-6">
          {loading ? <SkeletonList rows={1} className="h-56" /> : <RevenueCard ingresos={data.ingresos} />}
          <SectionCard title="Por tipo de dispositivo" icon={LayoutDashboard}>
            {loading ? <SkeletonList rows={1} className="h-36" /> : <DonutChart data={data.porDispositivo} />}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function AssignControl({ repair, technicians, onAssigned }) {
  const { notify } = useToast()
  const [techId, setTechId] = useState('')
  const [busy, setBusy] = useState(false)
  const options = technicians.filter((t) => t.activo && t.userId !== repair.tecnico?.id)
  const assign = async () => {
    if (!techId) return
    setBusy(true)
    try {
      await adminService.assignTechnician(repair.folio, Number(techId))
      notify({ type: 'success', title: repair.tecnico ? 'Técnico reasignado' : 'Técnico asignado', description: repair.folio })
      setTechId('')
      onAssigned()
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo asignar', description: err?.message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center gap-2">
      <select value={techId} onChange={(e) => setTechId(e.target.value)} className="h-9 min-w-0 rounded-lg border border-line bg-white px-2 text-xs" aria-label={`Técnico para ${repair.folio}`}>
        <option value="">{repair.tecnico ? 'Reasignar a…' : 'Asignar a…'}</option>
        {options.map((t) => (
          <option key={t.userId} value={t.userId}>
            {t.nombre} · {t.especialidadLabel}
            {t.disponible ? '' : ' (ocupado)'}
          </option>
        ))}
      </select>
      <Button size="sm" className="h-9 px-3" disabled={!techId} loading={busy} onClick={assign}>
        OK
      </Button>
    </div>
  )
}

function RepairsTab() {
  const [filters, setFilters] = useState({ estado: '', tecnico: '', tipoDispositivo: '', desde: '', hasta: '', search: '' })
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() })), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    adminService.listTechnicians().then((r) => setTechnicians(r.technicians)).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? 'refreshing' : 'loading'))
    try {
      setData(await adminService.listRepairs(filters))
      setState('ready')
    } catch {
      setState('error')
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const canAssign = (r) => !r.terminada && (r.estado === 'Pendiente de técnico' || r.tecnico)

  return (
    <SectionCard title={`Solicitudes${data ? ` (${data.total})` : ''}`} icon={ClipboardList}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-electric lg:col-span-2">
          <Search className="size-4 text-muted" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar folio" className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Buscar folio" />
        </label>
        <select value={filters.estado} onChange={set('estado')} className={inputClass} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={filters.tecnico} onChange={set('tecnico')} className={inputClass} aria-label="Técnico">
          <option value="">Todos los técnicos</option>
          <option value="none">Sin técnico</option>
          {technicians.map((t) => (
            <option key={t.userId} value={t.userId}>
              {t.nombre}
            </option>
          ))}
        </select>
        <select value={filters.tipoDispositivo} onChange={set('tipoDispositivo')} className={inputClass} aria-label="Tipo de dispositivo">
          <option value="">Todos los dispositivos</option>
          {Object.entries(DEVICE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filters.desde} onChange={set('desde')} className={cn(inputClass, 'px-2')} aria-label="Desde" title="Desde" />
          <input type="date" value={filters.hasta} onChange={set('hasta')} className={cn(inputClass, 'px-2')} aria-label="Hasta" title="Hasta" />
        </div>
      </div>

      <div className="mt-5">
        {state === 'loading' ? (
          <SkeletonList rows={5} className="h-16" />
        ) : state === 'error' ? (
          <ErrorState onRetry={load} />
        ) : !data.repairs.length ? (
          <EmptyState icon={ClipboardList} title="No hay solicitudes con esos filtros." />
        ) : (
          <div className={cn('overflow-x-auto rounded-2xl border border-line', state === 'refreshing' && 'opacity-60')}>
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-surface text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Folio</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Dispositivo</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Técnico</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.repairs.map((r) => (
                  <tr key={r.folio} className="align-top hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link to={repairDetailPath(r.folio)} className="font-semibold whitespace-nowrap text-electric hover:underline">
                        {r.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{r.cliente}</td>
                    <td className="px-4 py-3 text-muted">
                      {DEVICE_META[r.dispositivo.tipo]?.label} · {r.dispositivo.marca} {r.dispositivo.modelo}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={r.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <p className={r.tecnico ? 'text-ink' : 'text-amber-700'}>{r.tecnico?.nombre ?? 'Sin asignar'}</p>
                      {canAssign(r) && (
                        <div className="mt-2">
                          <AssignControl repair={r} technicians={technicians} onAssigned={load} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(r.fechaCreacion)}</td>
                    <td className="px-4 py-3">
                      <RepairAdminActions repair={r} onChanged={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-emerald-500' : 'bg-line')}
    >
      <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition', checked && 'translate-x-5')} />
    </button>
  )
}

function TechniciansTab() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    setState('loading')
    try {
      setItems((await adminService.listTechnicians()).technicians)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const update = async (t, patch, message) => {
    setBusy(t.id)
    try {
      const res = await adminService.updateTechnician(t.id, patch)
      setItems((list) => list.map((x) => (x.id === t.id ? res.technician : x)))
      notify({ type: 'success', title: message })
    } catch (err) {
      notify({ type: 'warning', title: 'No se pudo actualizar', description: err?.message })
    } finally {
      setBusy(null)
    }
  }

  if (state === 'loading') return <SkeletonList rows={3} className="h-24" />
  if (state === 'error') return <ErrorState onRetry={load} />
  if (!items.length) return <EmptyState icon={UserCog} title="No hay técnicos registrados." />

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((t) => (
        <div key={t.id} className={cn('rounded-3xl border bg-white p-5 shadow-soft', t.activo ? 'border-line' : 'border-dashed border-line opacity-75')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{t.nombre}</p>
              <p className="truncate text-xs text-muted">{t.correo}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden /> {t.calificacion.toFixed(1)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted">Reparaciones activas</p>
              <p className="font-bold text-ink">{t.reparacionesActivas}</p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted">Servicios terminados</p>
              <p className="font-bold text-ink">{t.serviciosTerminados}</p>
            </div>
          </div>
          <label className="mt-4 block text-xs font-semibold text-muted">
            Especialidad
            <select
              value={t.especialidad}
              disabled={busy === t.id}
              onChange={(e) => update(t, { especialidad: e.target.value }, 'Especialidad actualizada')}
              className={cn(inputClass, 'mt-1 py-2')}
            >
              {Object.entries(SPECIALTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>
                Estado: <strong className={t.activo ? 'text-emerald-700' : 'text-red-600'}>{t.activo ? 'Activo' : 'Inactivo'}</strong>
              </span>
              <Toggle checked={t.activo} disabled={busy === t.id} label={`${t.activo ? 'Desactivar' : 'Activar'} a ${t.nombre}`} onChange={(v) => update(t, { activo: v }, v ? 'Técnico activado' : 'Técnico desactivado')} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>
                Disponibilidad: <strong className={t.disponible ? 'text-emerald-700' : 'text-amber-700'}>{t.disponible ? 'Disponible' : 'Ocupado'}</strong>
              </span>
              <Toggle checked={t.disponible} disabled={busy === t.id} label={`Disponibilidad de ${t.nombre}`} onChange={(v) => update(t, { disponible: v }, v ? 'Marcado como disponible' : 'Marcado como ocupado')} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentsTab() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const load = useCallback(async () => {
    setState('loading')
    try {
      setData(await adminService.listPayments())
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  if (state === 'loading') return <SkeletonList rows={3} className="h-20" />
  if (state === 'error') return <ErrorState onRetry={load} />
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <RevenueCard ingresos={data.ingresos} />
      <SectionCard title={`Pagos registrados (${data.payments.length})`} icon={Receipt}>
        {!data.payments.length ? (
          <EmptyState icon={Receipt} title="Aún no hay pagos registrados." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Folio</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Método</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link to={repairDetailPath(p.folio)} className="font-semibold text-electric hover:underline">
                        {p.folio}
                      </Link>
                      <p className="text-xs text-muted">{formatDate(p.fecha)}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{p.usuario}</td>
                    <td className="px-4 py-3">{p.tipo === 'anticipo' ? 'Anticipo' : 'Pago final'}</td>
                    <td className="px-4 py-3 text-muted">{paymentMethodLabel(p.metodo)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', p.estado === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink tabular-nums">{formatCurrency(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

/** Panel administrativo básico (/admin). Solo rol "admin" (validado también en el backend). */
export default function AdminDashboardPage() {
  usePageTitle('Administración')
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'dashboard'

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-24 pb-20 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative">
        <p className="text-sm font-semibold text-electric">Administración</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Operación de PROTEC</h1>
        <p className="mt-2 text-muted">Supervisa solicitudes, técnicos, usuarios e ingresos registrados.</p>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft ring-1 ring-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setParams(t.key === 'dashboard' ? {} : { tab: t.key })}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                tab === t.key ? 'bg-electric text-white shadow-glow' : 'text-muted hover:bg-surface hover:text-ink',
              )}
            >
              <t.icon className="size-4" aria-hidden /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'solicitudes' && <RepairsTab />}
          {tab === 'tecnicos' && <TechniciansTab />}
          {tab === 'usuarios' && <AdminUsersTab />}
          {tab === 'pagos' && <PaymentsTab />}
        </div>
      </Container>
    </section>
  )
}

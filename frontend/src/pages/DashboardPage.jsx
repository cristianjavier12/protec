import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, ArrowRight, Bell, CheckCircle2, Clock3, Plus, Wrench } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import DashboardStatCard from '../components/workflow/DashboardStatCard'
import RepairCard from '../components/workflow/RepairCard'
import NotificationItem from '../components/workflow/NotificationItem'
import { EmptyState, ErrorState, SectionCard, Skeleton } from '../components/workflow/Feedback'
import { notificationLink } from '../components/layout/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { userService } from '../services/index'
import { ROUTES, homeForRole, repairDetailPath } from '../utils/routes'

/** Panel principal del usuario (/dashboard). */
export default function DashboardPage() {
  usePageTitle('Mi panel')
  const { user } = useAuth()
  const { version, markRead } = useNotifications()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading')
    try {
      setData(await userService.getDashboard())
      setState('ready')
    } catch {
      if (!silent) setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Las notificaciones en tiempo real también refrescan el panel.
  useEffect(() => {
    if (version) load(true)
  }, [version, load])

  if (user && user.rol !== 'usuario') return <Navigate to={homeForRole(user.rol)} replace />

  const loading = state === 'loading'
  const stats = data?.stats

  return (
    <section className="relative min-h-[80vh] overflow-hidden bg-surface pt-24 pb-20 sm:pt-28">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-electric">Panel de cliente</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Hola, {user?.nombre}</h1>
            <p className="mt-2 text-muted">Consulta el avance de tus reparaciones y las novedades de tu técnico.</p>
          </div>
          <Button to={ROUTES.REQUEST_REPAIR} size="lg" leadingIcon={Plus}>
            Nueva reparación
          </Button>
        </div>

        {state === 'error' ? (
          <div className="mt-10">
            <ErrorState onRetry={() => load()} />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <DashboardStatCard icon={Wrench} label="Reparaciones activas" value={stats?.activas ?? 0} tone="electric" loading={loading} />
              <DashboardStatCard icon={CheckCircle2} label="Reparaciones terminadas" value={stats?.terminadas ?? 0} tone="green" loading={loading} />
              <DashboardStatCard icon={Clock3} label="Solicitudes pendientes" value={stats?.pendientes ?? 0} tone="amber" loading={loading} />
              <DashboardStatCard icon={Bell} label="Notificaciones nuevas" value={stats?.notificaciones ?? 0} tone="indigo" loading={loading} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
              <SectionCard
                title="Mis reparaciones recientes"
                icon={Wrench}
                action={
                  <Link to={ROUTES.MY_REPAIRS} className="inline-flex items-center gap-1 text-sm font-semibold text-electric hover:underline">
                    Ver todas <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              >
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                  </div>
                ) : data?.repairs?.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.repairs.map((r) => (
                      <RepairCard key={r.folio} repair={r} to={repairDetailPath(r.folio)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Wrench}
                    title="No tienes reparaciones activas."
                    description="Registra tu dispositivo y describe el problema; nuestro asistente te orientará en minutos."
                    action={
                      <Button to={ROUTES.REQUEST_REPAIR} leadingIcon={Plus}>
                        Solicitar una reparación
                      </Button>
                    }
                  />
                )}
              </SectionCard>

              <SectionCard title="Actividad reciente" icon={Activity}>
                {loading ? (
                  <div className="flex flex-col gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : data?.activity?.length ? (
                  <div className="-mx-2 flex flex-col gap-1">
                    {data.activity.map((n) => (
                      <NotificationItem key={n.id} notification={n} compact to={notificationLink(n, 'usuario')} onRead={(id) => markRead(id).catch(() => {})} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Activity} title="Sin actividad todavía" description="Aquí verás los avances de tu técnico, presupuestos y entregas." />
                )}
              </SectionCard>
            </div>
          </>
        )}
      </Container>
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { Container } from '../components/ui/Container'
import Button from '../components/ui/Button'
import NotificationItem from '../components/workflow/NotificationItem'
import { EmptyState, ErrorState, SkeletonList } from '../components/workflow/Feedback'
import { notificationLink } from '../components/layout/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { notificationService } from '../services/index'
import { cn } from '../utils/cn'

const FILTERS = [
  { key: '', param: null, label: 'Todas' },
  { key: 'unread', param: 'no-leidas', label: 'No leídas' },
  { key: 'repairs', param: 'reparaciones', label: 'Reparaciones' },
  { key: 'messages', param: 'mensajes', label: 'Mensajes' },
]

/** Centro de notificaciones (/notificaciones). */
export default function NotificationsPage() {
  usePageTitle('Notificaciones')
  const { user } = useAuth()
  const { unreadCount, version, markRead, markAllRead } = useNotifications()
  const [params, setParams] = useSearchParams()
  const active = FILTERS.find((f) => f.param === params.get('filtro')) ?? FILTERS[0]
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState('loading')
      try {
        const res = await notificationService.list(active.key || undefined)
        setItems(res.notifications ?? [])
        setState('ready')
      } catch {
        if (!silent) setState('error')
      }
    },
    [active.key],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (version) load(true)
  }, [version, load])

  const handleRead = async (id) => {
    setItems((list) => (active.key === 'unread' ? list.filter((n) => n.id !== id) : list.map((n) => (n.id === id ? { ...n, leida: true } : n))))
    await markRead(id).catch(() => {})
  }

  const handleAll = async () => {
    await markAllRead().catch(() => {})
    setItems((list) => (active.key === 'unread' ? [] : list.map((n) => ({ ...n, leida: true }))))
  }

  return (
    <section className="min-h-[80vh] bg-surface pt-24 pb-20 sm:pt-28">
      <Container className="max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-ink">
              <Bell className="size-7 text-electric" aria-hidden /> Notificaciones
            </h1>
            <p className="mt-1 text-muted">{unreadCount ? `Tienes ${unreadCount} sin leer.` : 'Estás al día.'}</p>
          </div>
          <Button variant="secondary" size="sm" leadingIcon={CheckCheck} onClick={handleAll} disabled={!unreadCount}>
            Marcar todas como leídas
          </Button>
        </div>

        <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              role="tab"
              aria-selected={active.key === f.key}
              onClick={() => setParams(f.param ? { filtro: f.param } : {})}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                active.key === f.key ? 'bg-electric text-white shadow-glow' : 'bg-white text-muted ring-1 ring-line hover:text-electric',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-line bg-white p-2 shadow-soft sm:p-3">
          {state === 'loading' ? (
            <div className="p-2">
              <SkeletonList rows={5} className="h-20" />
            </div>
          ) : state === 'error' ? (
            <ErrorState onRetry={() => load()} />
          ) : items.length === 0 ? (
            <EmptyState icon={BellOff} title="No tienes nuevas notificaciones." description="Te avisaremos aquí y en tiempo real cuando haya novedades." className="m-2 border-0" />
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((n) => (
                <NotificationItem key={n.id} notification={n} to={notificationLink(n, user?.rol)} onRead={handleRead} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

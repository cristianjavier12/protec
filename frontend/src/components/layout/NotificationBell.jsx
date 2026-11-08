import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react'
import NotificationItem from '../workflow/NotificationItem'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import { notificationService } from '../../services/index'
import { ROUTES, repairDetailPath, techRepairDetailPath } from '../../utils/routes'
import { cn } from '../../utils/cn'

/** Ruta de destino de una notificación según el rol. */
export function notificationLink(n, rol) {
  if (!n.folio) return null
  if (rol === 'tecnico') return techRepairDetailPath(n.folio, n.tipo === 'mensaje' ? 'chat' : undefined)
  return `${repairDetailPath(n.folio)}${n.tipo === 'mensaje' ? '#chat' : ''}`
}

/** Campana con contador y dropdown de las notificaciones más recientes. */
export default function NotificationBell() {
  const { user } = useAuth()
  const { unreadCount, version, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    notificationService
      .list()
      .then((res) => setItems((res.notifications ?? []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, version, load])

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleRead = async (id) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    await markRead(id).catch(() => {})
  }

  const handleAll = async () => {
    await markAllRead().catch(() => {})
    setItems((list) => list.map((n) => ({ ...n, leida: true })))
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative grid size-10 place-items-center rounded-xl text-ink/70 transition hover:bg-surface hover:text-electric',
          open && 'bg-surface text-electric',
        )}
        aria-label={`Notificaciones${unreadCount ? ` (${unreadCount} sin leer)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[76px] z-50 overflow-hidden rounded-3xl border border-line bg-white shadow-card sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Notificaciones</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleAll} className="inline-flex items-center gap-1 text-xs font-semibold text-electric hover:underline">
                <CheckCheck className="size-3.5" aria-hidden /> Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {loading && !items.length ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="size-5 animate-spin text-electric" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <BellOff className="mx-auto size-7 text-muted/50" aria-hidden />
                <p className="mt-2 text-sm text-muted">No tienes nuevas notificaciones.</p>
              </div>
            ) : (
              items.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  compact
                  to={notificationLink(n, user?.rol)}
                  onRead={handleRead}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
          <Link
            to={ROUTES.NOTIFICATIONS}
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-electric transition hover:bg-surface"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  )
}

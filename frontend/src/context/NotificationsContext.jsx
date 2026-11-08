import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { notificationService } from '../services/index'
import { useAuth } from './AuthContext'
import { useSocketEvent } from './SocketContext'
import { useToast } from './ToastContext'

/**
 * Contador de notificaciones no leídas + avisos en tiempo real (Socket.IO).
 * `version` cambia con cada notificación nueva para que las vistas puedan refrescarse.
 */
const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const { notify } = useToast()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => {
    if (!isAuthenticated) return
    notificationService
      .list('unread')
      .then((res) => setUnreadCount(res.unreadCount ?? 0))
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) refresh()
    else setUnreadCount(0)
  }, [isAuthenticated, refresh])

  const onNew = useCallback(
    (data) => {
      setUnreadCount((prev) => (typeof data?.unreadCount === 'number' ? data.unreadCount : prev + 1))
      setVersion((v) => v + 1)
      // No se repite el aviso si el usuario ya está viendo el centro de notificaciones.
      if (location.pathname !== '/notificaciones') {
        notify({ type: data?.tipo === 'pago' ? 'success' : 'info', title: data?.titulo ?? 'Nueva notificación', description: data?.mensaje })
      }
    },
    [notify, location.pathname],
  )
  useSocketEvent('notification:new', onNew)

  const markRead = useCallback(async (id) => {
    const res = await notificationService.markRead(id)
    setUnreadCount(res.unreadCount ?? 0)
  }, [])

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead()
    setUnreadCount(0)
  }, [])

  const value = useMemo(
    () => ({ unreadCount, version, refresh, markRead, markAllRead }),
    [unreadCount, version, refresh, markRead, markAllRead],
  )
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>')
  return ctx
}

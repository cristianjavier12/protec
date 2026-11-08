import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { config } from '../utils/config'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

/**
 * Conexión Socket.IO autenticada con el mismo JWT de la API.
 * Se abre al iniciar sesión y se cierra al cerrar sesión.
 */
const SocketContext = createContext({ socket: null, connected: false })

const REVOKED_MESSAGES = {
  role: 'El tipo de tu cuenta cambió. Inicia sesión de nuevo para ver tus opciones.',
  deleted: 'Tu cuenta fue eliminada por administración.',
}

export function SocketProvider({ children }) {
  const { token, isAuthenticated, logout } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined

    const instance = io(config.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
    })
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    // El administrador cambió el rol o eliminó la cuenta: se cierra la sesión en este dispositivo.
    const onRevoked = (data) => {
      notify({ type: 'warning', title: REVOKED_MESSAGES[data?.reason] ?? 'Tu sesión terminó. Inicia sesión nuevamente.' })
      logout()
      navigate('/login', { replace: true })
    }
    instance.on('connect', onConnect)
    instance.on('disconnect', onDisconnect)
    instance.on('connect_error', onDisconnect)
    instance.on('session:revoked', onRevoked)
    setSocket(instance)

    return () => {
      instance.removeAllListeners()
      instance.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [isAuthenticated, token, logout, notify, navigate])

  const value = useMemo(() => ({ socket, connected }), [socket, connected])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)

/** Suscribe un manejador a un evento del socket mientras el componente esté montado. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket()
  useEffect(() => {
    if (!socket || !handler) return undefined
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }, [socket, event, handler])
}

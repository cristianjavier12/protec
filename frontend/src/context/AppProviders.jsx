import { AuthProvider } from './AuthContext.jsx'
import { ToastProvider } from './ToastContext.jsx'
import { SocketProvider } from './SocketContext.jsx'
import { NotificationsProvider } from './NotificationsContext.jsx'

/**
 * Punto único para registrar los providers globales.
 */
export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../utils/cn'

/**
 * ToastContext
 * ------------
 * Notificaciones ligeras dentro de la app. Se usa ahora para avisar cuando una
 * función pertenece a la siguiente etapa, y después servirá para las
 * notificaciones en tiempo real (Socket.IO).
 */
const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
}

const TONES = {
  success: 'text-emerald-600 bg-emerald-50',
  info: 'text-electric bg-electric/10',
  warning: 'text-amber-600 bg-amber-50',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    ({ title, description, type = 'info', duration = 4200 }) => {
      const id = ++idRef.current
      setToasts((list) => [...list.slice(-2), { id, title, description, type }])
      window.setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card"
            >
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONES[t.type])}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-lg p-1 text-muted transition hover:bg-surface hover:text-ink"
                aria-label="Cerrar notificación"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from '../ui/Button'
import { cn } from '../../utils/cn'

/** Ventana modal accesible (Escape para cerrar, foco inicial dentro del diálogo). */
export function Modal({ open, title, description, onClose, children, size = 'md' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('input, select, textarea, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cn('w-full rounded-3xl bg-white p-6 shadow-2xl sm:p-7', size === 'lg' ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-ink" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

/** Confirmación para acciones destructivas o irreversibles. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = true, busy = false, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onClose}>
      <div className="flex items-start gap-3">
        {danger && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        )}
        <div className="text-sm leading-relaxed text-muted">{message}</div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} loading={busy} className={danger ? 'bg-red-600 shadow-none hover:bg-red-700' : ''}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

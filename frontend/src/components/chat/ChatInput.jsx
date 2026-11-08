import { useId, useState } from 'react'
import { SendHorizontal, Paperclip } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Input del chat. `onAttach` es opcional.
 */
export default function ChatInput({ onSend, onAttach, disabled, placeholder = 'Describe tu problema...' }) {
  const [value, setValue] = useState('')
  const inputId = useId()

  const submit = (e) => {
    e.preventDefault()
    const text = value.trim()
    if (!text || disabled) return
    onSend?.(text)
    setValue('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-white p-3 sm:p-4">
      {onAttach && (
        <button
          type="button"
          onClick={onAttach}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-electric"
          aria-label="Adjuntar fotografía"
        >
          <Paperclip className="size-5" />
        </button>
      )}
      <label className="sr-only" htmlFor={inputId}>
        Mensaje
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-ink transition outline-none placeholder:text-muted/70 focus:border-electric focus:bg-white focus:ring-4 focus:ring-electric/10 sm:text-[15px]"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={cn(
          'inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-electric px-4 text-sm font-semibold text-white shadow-glow transition-all',
          'hover:bg-electric-600 disabled:opacity-50 disabled:shadow-none',
        )}
      >
        <span className="hidden sm:inline">Enviar</span>
        <SendHorizontal className="size-4" aria-hidden />
        <span className="sr-only sm:hidden">Enviar</span>
      </button>
    </form>
  )
}

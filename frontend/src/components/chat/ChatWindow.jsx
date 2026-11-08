import { useEffect, useRef } from 'react'
import { ChatMessage, TypingIndicator, BotAvatar } from './ChatMessage'
import ChatInput from './ChatInput'
import { cn } from '../../utils/cn'

/**
 * Ventana de chat reutilizable (asistente de diagnóstico y, más adelante, chat con técnico).
 * Es "controlada": recibe los mensajes y delega el envío a `onSend`,
 * normalmente provisto por el hook useChat.
 */
export default function ChatWindow({
  messages,
  isTyping = false,
  onSend,
  onAttach,
  title = 'Asistente PROTEC',
  subtitle = 'En línea',
  headerActions,
  placeholder,
  className,
  bodyClassName,
  inputDisabled = false,
}) {
  const bodyRef = useRef(null)

  // Auto-scroll dentro del contenedor (sin mover la página).
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const lastBotIndex = messages.reduce((acc, m, i) => (m.role === 'bot' ? i : acc), -1)

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card', className)}>
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3.5 sm:px-5">
        <div className="relative">
          <BotAvatar />
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{title}</p>
          <p className="text-xs text-emerald-600">{subtitle}</p>
        </div>
        {headerActions}
      </div>

      <div
        ref={bodyRef}
        className={cn('scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto bg-surface/60 p-4 sm:p-5', bodyClassName)}
        role="log"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <ChatMessage
            key={m.id}
            message={m}
            showOptions={i === lastBotIndex && i === messages.length - 1}
            onOptionSelect={onSend}
            disabled={isTyping}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      <ChatInput onSend={onSend} onAttach={onAttach} disabled={isTyping || inputDisabled} placeholder={placeholder} />
    </div>
  )
}

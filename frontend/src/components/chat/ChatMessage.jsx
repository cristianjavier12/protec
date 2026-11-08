import { cn } from '../../utils/cn'
import { LogoMark } from '../ui/Logo'

const AVATAR_SIZES = {
  sm: { box: 'size-8 rounded-xl', mark: 'size-5' },
  md: { box: 'size-10 rounded-xl', mark: 'size-6' },
  lg: { box: 'size-14 rounded-2xl', mark: 'size-9' },
}

export function BotAvatar({ size = 'md', className }) {
  const s = AVATAR_SIZES[size] ?? AVATAR_SIZES.md
  return (
    <span className={cn('grid shrink-0 place-items-center bg-navy ring-1 ring-white/10', s.box, className)}>
      <LogoMark className={s.mark} />
    </span>
  )
}

/**
 * Burbuja de mensaje.
 * message: { id, role: 'bot' | 'user', text, options?: string[] }
 */
export function ChatMessage({ message, showOptions, onOptionSelect, disabled }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex items-end gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <BotAvatar size="sm" />}
      <div className={cn('flex max-w-[82%] flex-col gap-2 sm:max-w-[75%]', isUser && 'items-end')}>
        <div
          className={cn(
            'px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line sm:text-[15px]',
            isUser
              ? 'rounded-2xl rounded-br-md bg-electric text-white shadow-[0_6px_16px_-8px_rgb(36_124_255/0.7)]'
              : 'rounded-2xl rounded-bl-md border border-line bg-white text-ink',
          )}
        >
          {message.text}
        </div>
        {showOptions && message.options?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onOptionSelect?.(opt)}
                className="rounded-full border border-electric/30 bg-electric/[0.06] px-3.5 py-1.5 text-sm font-medium text-electric transition hover:bg-electric hover:text-white disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5" aria-live="polite" aria-label="PROTEC está escribiendo">
      <BotAvatar size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-typing size-1.5 rounded-full bg-electric"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

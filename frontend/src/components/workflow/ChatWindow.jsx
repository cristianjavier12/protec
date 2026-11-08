import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Loader2, Lock, MessageSquare, SendHorizontal, WifiOff } from 'lucide-react'
import { useSocket, useSocketEvent } from '../../context/SocketContext'
import { repairService } from '../../services/index'
import { formatDate } from '../../utils/format'
import { cn } from '../../utils/cn'

const ROLE_LABEL = { usuario: 'Cliente', tecnico: 'Técnico', admin: 'Administrador' }
const time = (iso) => new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

/**
 * Chat usuario-técnico en tiempo real (Socket.IO).
 * - Mensajes propios a la derecha; los de la otra persona a la izquierda.
 * - Hora, estado leído/no leído, indicador "Escribiendo..." y conexión.
 * - Enter envía; Shift+Enter agrega salto de línea.
 * - Si el WebSocket no está disponible, usa la API REST como respaldo.
 * La autorización la valida el backend en ambos canales.
 */
export default function ChatWindow({ folio, currentUser, counterpart, enabled = true, readOnly = false, className }) {
  const { socket, connected } = useSocket()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [online, setOnline] = useState(() => new Set())
  const [typingName, setTypingName] = useState('')
  const listRef = useRef(null)
  const typingTimer = useRef(null)
  const lastTypingEmit = useRef(0)
  const idleTimer = useRef(null)

  const markRead = useCallback(() => {
    if (!enabled) return
    if (socket?.connected) socket.emit('chat:read', { folio })
    else repairService.markMessagesRead(folio).catch(() => {})
  }, [socket, folio, enabled])

  // Historial
  useEffect(() => {
    let alive = true
    setLoading(true)
    repairService
      .getMessages(folio)
      .then((res) => {
        if (!alive) return
        setMessages(res.mensajes ?? [])
        setLoadError('')
      })
      .catch((err) => alive && setLoadError(err?.message || 'No pudimos cargar la conversación.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [folio])

  // Unirse a la sala (y volver a unirse tras reconexión)
  useEffect(() => {
    if (!socket || !enabled) return undefined
    const join = () =>
      socket.emit('chat:join', { folio }, (res) => {
        if (res?.ok) {
          setOnline(new Set(res.online ?? []))
          socket.emit('chat:read', { folio })
        }
      })
    if (socket.connected) join()
    socket.on('connect', join)
    return () => {
      socket.off('connect', join)
      socket.emit('chat:leave', { folio })
    }
  }, [socket, folio, enabled])

  useSocketEvent(
    'chat:message',
    useCallback(
      (data) => {
        if (data?.folio !== folio || !data.message) return
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
        if (data.message.idRemitente !== currentUser.id) {
          setTypingName('')
          markRead()
        }
      },
      [folio, currentUser.id, markRead],
    ),
  )

  useSocketEvent(
    'chat:typing',
    useCallback(
      (data) => {
        if (data?.folio !== folio || data.userId === currentUser.id) return
        clearTimeout(typingTimer.current)
        if (data.typing) {
          setTypingName(data.nombre)
          typingTimer.current = setTimeout(() => setTypingName(''), 4000)
        } else setTypingName('')
      },
      [folio, currentUser.id],
    ),
  )

  useSocketEvent(
    'chat:read',
    useCallback(
      (data) => {
        if (data?.folio !== folio || data.readerId === currentUser.id) return
        setMessages((prev) => prev.map((m) => (m.idRemitente === currentUser.id ? { ...m, leido: true } : m)))
      },
      [folio, currentUser.id],
    ),
  )

  useSocketEvent(
    'chat:presence',
    useCallback(
      (data) => {
        if (data?.folio !== folio) return
        setOnline((prev) => {
          const next = new Set(prev)
          if (data.online) next.add(data.userId)
          else next.delete(data.userId)
          return next
        })
      },
      [folio],
    ),
  )

  useEffect(() => () => {
    clearTimeout(typingTimer.current)
    clearTimeout(idleTimer.current)
  }, [])

  // Scroll automático al último mensaje
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typingName, loading])

  const emitTyping = (typing) => {
    if (socket?.connected) socket.emit('chat:typing', { folio, typing })
  }

  const onChange = (e) => {
    setText(e.target.value.slice(0, 1000))
    setSendError('')
    const now = Date.now()
    if (now - lastTypingEmit.current > 2000) {
      emitTyping(true)
      lastTypingEmit.current = now
    }
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      emitTyping(false)
      lastTypingEmit.current = 0
    }, 2500)
  }

  const send = async () => {
    const mensaje = text.trim()
    if (!mensaje || sending) return
    setSending(true)
    setSendError('')
    clearTimeout(idleTimer.current)
    emitTyping(false)
    lastTypingEmit.current = 0
    try {
      let message
      if (socket?.connected) {
        const res = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve({ ok: false, message: 'No hubo respuesta del servidor.' }), 8000)
          socket.emit('chat:message', { folio, mensaje }, (r) => {
            clearTimeout(timer)
            resolve(r)
          })
        })
        if (!res?.ok) throw new Error(res?.message)
        message = res.message
      } else {
        message = (await repairService.sendMessage(folio, mensaje)).message
      }
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
      setText('')
    } catch (err) {
      setSendError(err?.message || 'No pudimos enviar el mensaje. Inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const counterpartOnline = counterpart?.id ? online.has(counterpart.id) : false
  let lastDay = ''

  return (
    <div className={cn('flex h-[min(560px,75vh)] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft', className)}>
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-navy to-navy-700 px-4 py-3 text-white sm:px-5">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold">
          {counterpart?.nombre ? initials(counterpart.nombre) : <MessageSquare className="size-5" aria-hidden />}
          <span
            className={cn('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-navy', counterpartOnline ? 'bg-emerald-400' : 'bg-slate-400')}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{counterpart?.nombre ?? 'Conversación'}</p>
          <p className="text-xs text-white/70">
            {ROLE_LABEL[counterpart?.rol] ?? 'Participante'} · {counterpartOnline ? 'En línea' : 'Desconectado'}
          </p>
        </div>
        {!connected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80" title="Reconectando...">
            <WifiOff className="size-3.5" aria-hidden /> Sin tiempo real
          </span>
        )}
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-surface/60 px-3 py-4 sm:px-5" aria-live="polite">
        {loading && (
          <div className="grid h-full place-items-center">
            <Loader2 className="size-6 animate-spin text-electric" aria-label="Cargando mensajes" />
          </div>
        )}
        {!loading && loadError && <p className="text-center text-sm text-muted">{loadError}</p>}
        {!loading && !loadError && !enabled && (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">El chat se habilitará cuando se asigne un técnico a tu solicitud.</div>
        )}
        {!loading && !loadError && enabled && messages.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <MessageSquare className="mx-auto size-8 text-muted/50" aria-hidden />
              <p className="mt-2 text-sm text-muted">Aún no hay mensajes. Escribe para iniciar la conversación.</p>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.idRemitente === currentUser.id
          const day = formatDate(m.fechaEnvio)
          const showDay = day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted shadow-soft">{day}</span>
                </p>
              )}
              <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
                {!mine && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-aqua" title={`${m.nombre} ${m.apellidos}`}>
                    {initials(`${m.nombre} ${m.apellidos}`)}
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-soft sm:max-w-[70%]',
                    mine ? 'rounded-br-md bg-electric text-white' : 'rounded-bl-md bg-white text-ink',
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[11px] font-semibold text-electric">
                      {m.nombre} · {ROLE_LABEL[m.rol] ?? m.rol}
                    </p>
                  )}
                  <p className="break-words whitespace-pre-wrap">{m.mensaje}</p>
                  <p className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', mine ? 'text-white/75' : 'text-muted')}>
                    {time(m.fechaEnvio)}
                    {mine &&
                      (m.leido ? (
                        <CheckCheck className="size-3.5 text-aqua" aria-label="Leído" />
                      ) : (
                        <Check className="size-3.5" aria-label="Enviado, no leído" />
                      ))}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {typingName && (
          <div className="flex items-center gap-2 pl-9 text-xs text-muted">
            <span className="flex gap-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-typing rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            {typingName} está escribiendo...
          </div>
        )}
      </div>

      {/* Entrada */}
      {readOnly || !enabled ? (
        <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-3 text-xs text-muted">
          <Lock className="size-3.5" aria-hidden />
          {readOnly ? 'El servicio finalizó. La conversación queda como historial.' : 'Chat no disponible todavía.'}
        </div>
      ) : (
        <div className="border-t border-line bg-white p-3">
          {sendError && <p className="mb-2 text-xs text-red-600">{sendError}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={onChange}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Escribe un mensaje..."
              aria-label="Mensaje"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-electric focus:bg-white focus:ring-4 focus:ring-electric/10"
            />
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() || sending}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-electric text-white shadow-glow transition hover:bg-electric-600 disabled:opacity-40 disabled:shadow-none"
              aria-label="Enviar mensaje"
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted/80">Enter para enviar · Shift + Enter para nueva línea</p>
        </div>
      )}
    </div>
  )
}

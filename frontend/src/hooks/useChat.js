import { useCallback, useEffect, useRef, useState } from 'react'

let messageSeq = 0
const createId = () => `m-${Date.now().toString(36)}-${++messageSeq}`

/**
 * useChat
 * -------
 * Estado de una conversación (asistente o chat con técnico).
 *
 * `getReply(text, messages)` es la pieza intercambiable:
 *  - Se usa en la vista previa del asistente; el diagnóstico real usa useRuleDiagnosis
 *    y el chat con el técnico usa Socket.IO (components/workflow/ChatWindow).
 *
 * Puede devolver un string, un objeto { text, options } o una promesa de ellos.
 */
export function useChat({ initialMessages = [], getReply, replyDelay = 900 } = {}) {
  const [messages, setMessages] = useState(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const addMessage = useCallback((message) => {
    const full = { id: createId(), createdAt: new Date().toISOString(), ...message }
    setMessages((list) => [...list, full])
    return full
  }, [])

  const sendMessage = useCallback(
    (rawText) => {
      const text = rawText?.trim()
      if (!text || isTyping) return
      addMessage({ role: 'user', text })

      if (!getReply) return
      setIsTyping(true)
      timeoutRef.current = window.setTimeout(async () => {
        try {
          const reply = await getReply(text, messages)
          if (reply) {
            addMessage(typeof reply === 'string' ? { role: 'bot', text: reply } : { role: 'bot', ...reply })
          }
        } finally {
          setIsTyping(false)
        }
      }, replyDelay)
    },
    [addMessage, getReply, isTyping, messages, replyDelay],
  )

  const reset = useCallback(() => {
    window.clearTimeout(timeoutRef.current)
    setIsTyping(false)
    setMessages(initialMessages)
  }, [initialMessages])

  return { messages, isTyping, sendMessage, addMessage, reset }
}

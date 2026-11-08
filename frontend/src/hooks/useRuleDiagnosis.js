import { useCallback, useRef, useState } from 'react'

let seq = 0
const uid = () => `dx-${Date.now().toString(36)}-${++seq}`

const botMsg = (text, options) => ({ id: uid(), role: 'bot', text, ...(options?.length ? { options } : {}) })
const userMsg = (text) => ({ id: uid(), role: 'user', text })

/** Convierte la pregunta pública del motor en un mensaje con botones de opción. */
const questionMessage = (question) => botMsg(question.text, question.options?.map((o) => o.label))

/**
 * useRuleDiagnosis
 * ----------------
 * Conversación con el motor de reglas del backend (sin IA).
 * El motor es "stateless": en cada turno se envían TODAS las respuestas válidas
 * y devuelve { status: 'question' | 'clarify' | 'result', ... }.
 *
 * @param {(answers: string[]) => Promise<object>} run  función que llama a la API
 * @param {Array} introMessages mensajes iniciales del asistente
 */
export function useRuleDiagnosis({ run, introMessages = [] }) {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState(null)
  const answersRef = useRef([])
  const busyRef = useRef(false)
  const introRef = useRef(introMessages)
  introRef.current = introMessages

  const push = useCallback((...items) => setMessages((list) => [...list, ...items]), [])

  /** Aplica la respuesta del motor a la conversación. */
  const applyOutcome = useCallback(
    (data, sentAnswers) => {
      setOutcome(data)
      if (data.status === 'clarify') {
        answersRef.current = sentAnswers.slice(0, data.validCount ?? sentAnswers.length - 1)
        push(botMsg(data.message), questionMessage(data.question))
        return
      }
      answersRef.current = sentAnswers
      if (data.status === 'question') {
        const intro = (data.intro ?? []).map((t) => botMsg(t))
        push(...intro, questionMessage(data.question))
        return
      }
      if (data.status === 'result') {
        push(botMsg('Gracias. Con tus respuestas preparé un diagnóstico preliminar. Lo verás a continuación.'))
      }
    },
    [push],
  )

  const start = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    answersRef.current = []
    setOutcome(null)
    setError(null)
    setMessages(introRef.current.map((m) => botMsg(m)))
    setIsTyping(true)
    try {
      const data = await run([])
      applyOutcome(data, [])
    } catch (err) {
      setError(err?.message || 'No pudimos iniciar el asistente.')
    } finally {
      setIsTyping(false)
      busyRef.current = false
    }
  }, [run, applyOutcome])

  const send = useCallback(
    async (rawText) => {
      const text = rawText?.trim()
      if (!text || busyRef.current || outcome?.status === 'result') return
      busyRef.current = true
      push(userMsg(text))
      setIsTyping(true)
      const nextAnswers = [...answersRef.current, text]
      try {
        // Pequeña pausa para que la conversación se sienta natural.
        const [data] = await Promise.all([run(nextAnswers), new Promise((r) => setTimeout(r, 450))])
        applyOutcome(data, nextAnswers)
      } catch (err) {
        push(botMsg(err?.message || 'No pude procesar tu respuesta. Intenta de nuevo.'))
      } finally {
        setIsTyping(false)
        busyRef.current = false
      }
    },
    [run, applyOutcome, push, outcome],
  )

  return {
    messages,
    isTyping,
    outcome,
    result: outcome?.status === 'result' ? outcome.result : null,
    error,
    start,
    send,
  }
}

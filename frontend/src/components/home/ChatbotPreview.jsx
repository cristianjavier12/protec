import { useCallback } from 'react'
import { ArrowRight, CircleHelp, ListChecks, UserCheck } from 'lucide-react'
import { Section } from '../ui/Container'
import Eyebrow from '../ui/Eyebrow'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import ChatWindow from '../chat/ChatWindow'
import { useChat } from '../../hooks/useChat'
import { previewConversation } from '../../data/chatMock'
import { ROUTES } from '../../utils/routes'

const points = [
  { icon: CircleHelp, text: 'Preguntas guiadas según tu dispositivo.' },
  { icon: ListChecks, text: 'Soluciones sencillas que puedes intentar en casa.' },
  { icon: UserCheck, text: 'Escalamiento a un técnico cuando es necesario.' },
]

const PREVIEW_REPLY =
  'Gracias. Para continuar con más preguntas y posibles soluciones, abre el diagnóstico completo con el botón "Iniciar diagnóstico".'

export default function ChatbotPreview() {
  const getReply = useCallback(() => PREVIEW_REPLY, [])
  const chat = useChat({ initialMessages: previewConversation, getReply })

  return (
    <Section id="diagnostico" className="overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-0 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/10 blur-3xl" />

      <div className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Asistente de diagnóstico</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
            Empieza con un diagnóstico
          </h2>
        </Reveal>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-electric/10 via-transparent to-aqua/10" />
              <ChatWindow
                messages={chat.messages}
                isTyping={chat.isTyping}
                onSend={chat.sendMessage}
                placeholder="Describe tu problema..."
                bodyClassName="h-[380px] sm:h-[420px]"
              />
            </div>
          </Reveal>

          <Reveal delay={120} className="flex flex-col items-start">
            <h3 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Un diagnóstico antes de la reparación
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              El asistente de PROTEC realiza preguntas iniciales para identificar posibles causas y determinar si es
              necesaria la intervención de un técnico.
            </p>

            <ul className="mt-8 flex flex-col gap-4">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-electric/[0.08] text-electric">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-medium text-ink/85">{text}</span>
                </li>
              ))}
            </ul>

            <Button to={ROUTES.DIAGNOSIS} size="lg" icon={ArrowRight} className="mt-10">
              Iniciar diagnóstico
            </Button>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}

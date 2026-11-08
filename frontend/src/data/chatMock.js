/**
 * Conversaciones simuladas del asistente.
 * Formato de mensaje compartido por el componente <ChatWindow />
 * (vista previa ilustrativa del asistente en la página de inicio):
 * { id, role: 'bot' | 'user', text, options?: string[] }
 */
export const previewConversation = [
  { id: 'p1', role: 'bot', text: 'Hola. ¿Qué dispositivo presenta el problema?' },
  { id: 'p2', role: 'user', text: 'Una laptop.' },
  { id: 'p3', role: 'bot', text: 'Cuéntame qué está sucediendo.' },
  { id: 'p4', role: 'user', text: 'Enciende, pero la pantalla permanece negra.' },
  {
    id: 'p5',
    role: 'bot',
    text: 'Vamos a revisar algunas posibles causas. ¿Escuchas el ventilador al encenderla?',
  },
]

export const diagnosisWelcome = [
  {
    id: 'd1',
    role: 'bot',
    text: 'Hola, soy el asistente de PROTEC. Te haré algunas preguntas para identificar posibles causas del problema.',
  },
  {
    id: 'd2',
    role: 'bot',
    text: '¿Qué dispositivo presenta el problema?',
    options: ['Celular', 'Laptop', 'Computadora'],
  },
]

export const DIAGNOSIS_PREVIEW_REPLY =
  'Gracias. El motor de diagnóstico guiado se habilitará en la siguiente etapa. Mientras tanto, puedes registrar tu solicitud y un técnico revisará tu caso.'

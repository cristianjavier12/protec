import {
  Smartphone,
  FileText,
  ScanSearch,
  UserCheck,
  Activity,
  PackageCheck,
  ClipboardPlus,
  MonitorSmartphone,
  MessageSquareWarning,
  ImagePlus,
  Bot,
  Wrench,
  Receipt,
  Truck,
  Hammer,
  Route,
  Wallet,
  HandHelping,
} from 'lucide-react'

/** Proceso resumido de 6 pasos (Inicio). */
export const homeSteps = [
  { number: '01', title: 'Registra tu dispositivo', description: 'Indica el tipo, marca y modelo.', icon: Smartphone },
  { number: '02', title: 'Describe el problema', description: 'Cuéntanos qué sucede y adjunta fotos.', icon: FileText },
  { number: '03', title: 'Obtén un diagnóstico inicial', description: 'El asistente identifica posibles causas.', icon: ScanSearch },
  { number: '04', title: 'Conecta con un técnico', description: 'Si es necesario, un especialista toma el caso.', icon: UserCheck },
  { number: '05', title: 'Sigue la reparación', description: 'Consulta el avance en cada etapa.', icon: Activity },
  { number: '06', title: 'Recibe tu dispositivo', description: 'Tu equipo vuelve funcionando.', icon: PackageCheck },
]

/** Proceso completo de 12 etapas (/como-funciona). */
export const fullProcess = [
  {
    title: 'Crear solicitud',
    description: 'Inicia una nueva solicitud de reparación desde tu cuenta en pocos segundos.',
    icon: ClipboardPlus,
    phase: 'Solicitud',
  },
  {
    title: 'Registrar dispositivo',
    description: 'Selecciona si es celular, laptop o computadora e indica marca y modelo.',
    icon: MonitorSmartphone,
    phase: 'Solicitud',
  },
  {
    title: 'Describir falla',
    description: 'Explica qué está pasando, desde cuándo y en qué situaciones ocurre.',
    icon: MessageSquareWarning,
    phase: 'Solicitud',
  },
  {
    title: 'Adjuntar evidencia',
    description: 'Sube fotografías del estado del dispositivo para un registro claro.',
    icon: ImagePlus,
    phase: 'Solicitud',
  },
  {
    title: 'Diagnóstico inicial',
    description: 'El asistente de PROTEC hace preguntas y propone soluciones sencillas cuando es posible.',
    icon: Bot,
    phase: 'Diagnóstico',
  },
  {
    title: 'Atención técnica si es necesaria',
    description: 'Si el problema requiere reparación física, el caso se escala a un técnico.',
    icon: Wrench,
    phase: 'Diagnóstico',
  },
  {
    title: 'Presupuesto',
    description: 'Consulta el costo aproximado y registra el anticipo para iniciar el servicio.',
    icon: Receipt,
    phase: 'Acuerdo',
  },
  {
    title: 'Recolección',
    description: 'Solicita que recojamos tu dispositivo cuando el servicio lo requiera.',
    icon: Truck,
    phase: 'Reparación',
  },
  {
    title: 'Reparación',
    description: 'El técnico realiza la reparación y registra cada avance importante.',
    icon: Hammer,
    phase: 'Reparación',
  },
  {
    title: 'Seguimiento',
    description: 'Consulta el estado, las evidencias y comunícate con el técnico en todo momento.',
    icon: Route,
    phase: 'Reparación',
  },
  {
    title: 'Pago restante',
    description: 'Cuando el equipo está listo, registra el pago restante del servicio.',
    icon: Wallet,
    phase: 'Entrega',
  },
  {
    title: 'Entrega',
    description: 'Recibe tu dispositivo y conserva el historial completo de la reparación.',
    icon: HandHelping,
    phase: 'Entrega',
  },
]

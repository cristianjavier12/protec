import {
  ScanSearch,
  Headphones,
  Activity,
  ShieldCheck,
  Stethoscope,
  Wrench,
  Camera,
  MessagesSquare,
  Route,
  Truck,
  Eye,
  FileImage,
  History,
} from 'lucide-react'

/** Franja de indicadores bajo el Hero. */
export const highlights = [
  {
    icon: ScanSearch,
    title: 'Diagnóstico inicial',
    description: 'Identifica posibles causas antes de cualquier reparación.',
  },
  {
    icon: Headphones,
    title: 'Atención especializada',
    description: 'Técnicos que atienden los casos que lo requieren.',
  },
  {
    icon: Activity,
    title: 'Seguimiento',
    description: 'Consulta el estado de tu servicio en cada etapa.',
  },
  {
    icon: ShieldCheck,
    title: 'Proceso transparente',
    description: 'Costos, avances y evidencias siempre visibles.',
  },
]

/** Tarjetas de la sección "Todo el proceso en un solo lugar". */
export const platformServices = [
  {
    icon: Stethoscope,
    title: 'Diagnóstico inicial',
    description: 'Atención inicial para identificar posibles causas del problema.',
  },
  {
    icon: Wrench,
    title: 'Técnicos',
    description: 'Los casos que requieren intervención pueden ser atendidos por un especialista.',
  },
  {
    icon: Camera,
    title: 'Evidencias',
    description: 'Registra fotografías del estado del dispositivo.',
  },
  {
    icon: MessagesSquare,
    title: 'Comunicación',
    description: 'Mantén contacto durante el proceso.',
  },
  {
    icon: Route,
    title: 'Seguimiento',
    description: 'Consulta en qué etapa se encuentra el servicio.',
  },
  {
    icon: Truck,
    title: 'Recolección y entrega',
    description: 'Gestiona el traslado del dispositivo cuando el servicio lo requiera.',
  },
]

/** Sección "Tu dispositivo siempre bajo control". */
export const transparencyItems = [
  { icon: Eye, title: 'Transparencia', description: 'Conoce cada etapa del servicio.' },
  {
    icon: FileImage,
    title: 'Evidencias',
    description: 'Consulta información relacionada con la reparación.',
  },
  { icon: MessagesSquare, title: 'Comunicación', description: 'Mantén contacto durante el proceso.' },
  { icon: History, title: 'Historial', description: 'Conserva un registro de tus servicios.' },
]

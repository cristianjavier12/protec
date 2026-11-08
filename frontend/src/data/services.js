import {
  Smartphone,
  Laptop,
  Monitor,
  Stethoscope,
  Route,
  Headphones,
  Truck,
} from 'lucide-react'
import { ROUTES, requestRepairWithDevice } from '../utils/routes'

/**
 * Catálogo detallado de servicios (/servicios).
 * `anchor` permite enlazar directamente (ej. /servicios#laptops).
 */
export const serviceCatalog = [
  {
    anchor: 'celulares',
    icon: Smartphone,
    category: 'Reparación',
    title: 'Reparación de celulares',
    description:
      'Atención para smartphones de las principales marcas, desde fallas de hardware hasta problemas de software.',
    items: [
      'Cambio de pantalla y cristal',
      'Reemplazo de batería',
      'Puerto de carga y conectores',
      'Cámaras, audio y botones',
      'Actualización y restauración de software',
    ],
    cta: { label: 'Reparar celular', to: requestRepairWithDevice('phone') },
    featured: true,
  },
  {
    anchor: 'laptops',
    icon: Laptop,
    category: 'Reparación',
    title: 'Reparación de laptops',
    description:
      'Soluciones para equipos portátiles de trabajo, estudio o gaming, con diagnóstico previo del problema.',
    items: [
      'Pantalla, bisagras y teclado',
      'Batería y sistema de carga',
      'Almacenamiento SSD / HDD',
      'Limpieza y sobrecalentamiento',
      'Reinstalación y optimización del sistema',
    ],
    cta: { label: 'Reparar laptop', to: requestRepairWithDevice('laptop') },
    featured: true,
  },
  {
    anchor: 'computadoras',
    icon: Monitor,
    category: 'Reparación',
    title: 'Reparación de computadoras',
    description:
      'Diagnóstico, mantenimiento y reparación de equipos de escritorio, de marca o ensamblados.',
    items: [
      'Fallas de encendido y fuente de poder',
      'Tarjeta madre, RAM y gráficos',
      'Mantenimiento preventivo',
      'Actualización de componentes',
      'Sistema operativo y controladores',
    ],
    cta: { label: 'Reparar computadora', to: requestRepairWithDevice('desktop') },
    featured: true,
  },
  {
    anchor: 'diagnostico',
    icon: Stethoscope,
    category: 'Plataforma',
    title: 'Diagnóstico',
    description:
      'Un asistente realiza preguntas iniciales para identificar posibles causas y orientarte antes de una reparación.',
    items: [
      'Preguntas guiadas según el dispositivo',
      'Soluciones sencillas paso a paso',
      'Detección de casos que requieren técnico',
    ],
    cta: { label: 'Iniciar diagnóstico', to: ROUTES.DIAGNOSIS },
  },
  {
    anchor: 'seguimiento',
    icon: Route,
    category: 'Plataforma',
    title: 'Seguimiento',
    description:
      'Consulta en todo momento en qué etapa se encuentra tu servicio y qué se ha realizado.',
    items: [
      'Estado actualizado de la reparación',
      'Línea de tiempo con cada etapa',
      'Historial de servicios',
    ],
    cta: { label: 'Consultar seguimiento', to: ROUTES.TRACKING },
  },
  {
    anchor: 'atencion-tecnica',
    icon: Headphones,
    category: 'Plataforma',
    title: 'Atención técnica',
    description:
      'Cuando el problema requiere intervención física, un técnico especializado toma el caso.',
    items: [
      'Asignación de técnico',
      'Comunicación directa durante el proceso',
      'Costo aproximado antes de reparar',
    ],
    cta: { label: 'Solicitar reparación', to: ROUTES.REQUEST_REPAIR },
  },
  {
    anchor: 'recoleccion',
    icon: Truck,
    category: 'Logística',
    title: 'Recolección y entrega',
    description:
      'Gestiona el traslado del dispositivo cuando el servicio lo requiera, sin salir de la plataforma.',
    items: [
      'Solicitud de recolección',
      'Confirmación de recepción del equipo',
      'Entrega del dispositivo reparado',
    ],
    cta: { label: 'Ver cómo funciona', to: ROUTES.HOW_IT_WORKS },
  },
]

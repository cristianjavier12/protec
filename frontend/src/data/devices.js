import { Smartphone, Laptop, Monitor } from 'lucide-react'

/**
 * Tipos de dispositivo soportados.
 * `id` es el valor usado en la URL (?device=) y el que se enviará a la API.
 */
export const DEVICE_TYPES = [
  {
    id: 'phone',
    name: 'Celular',
    plural: 'Celulares',
    icon: Smartphone,
    description:
      'Diagnóstico y reparación de pantalla, batería, carga, software y otros componentes.',
    cta: 'Reparar celular',
    issues: ['Pantalla', 'Batería', 'Puerto de carga', 'Software', 'Cámara', 'Audio'],
    brands: ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Huawei', 'OPPO', 'Google', 'Otra'],
    modelPlaceholder: 'Ej. Galaxy S23, iPhone 13, Moto G84',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    plural: 'Laptops',
    icon: Laptop,
    description:
      'Solución de problemas de hardware, batería, almacenamiento, rendimiento y sistema.',
    cta: 'Reparar laptop',
    issues: ['Hardware', 'Batería', 'Almacenamiento', 'Rendimiento', 'Sistema', 'Teclado'],
    brands: ['Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'Apple', 'MSI', 'Otra'],
    modelPlaceholder: 'Ej. IdeaPad 3, Pavilion 15, MacBook Air M1',
  },
  {
    id: 'desktop',
    name: 'Computadora',
    plural: 'Computadoras',
    icon: Monitor,
    description:
      'Diagnóstico, mantenimiento y reparación de componentes y fallas de funcionamiento.',
    cta: 'Reparar computadora',
    issues: ['Componentes', 'Encendido', 'Mantenimiento', 'Sobrecalentamiento', 'Sistema', 'Red'],
    brands: ['HP', 'Dell', 'Lenovo', 'Apple', 'ASUS', 'Acer', 'Ensamblada', 'Otra'],
    modelPlaceholder: 'Ej. OptiPlex 7090, iMac 24", PC ensamblada',
  },
]

/** Alias aceptados en la URL para mayor tolerancia. */
const DEVICE_ALIASES = {
  phone: 'phone',
  celular: 'phone',
  movil: 'phone',
  smartphone: 'phone',
  laptop: 'laptop',
  notebook: 'laptop',
  desktop: 'desktop',
  computadora: 'desktop',
  pc: 'desktop',
}

export const resolveDeviceId = (value) => DEVICE_ALIASES[value?.toLowerCase?.()] ?? null

export const getDeviceById = (id) => DEVICE_TYPES.find((d) => d.id === id) ?? null

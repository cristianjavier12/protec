import { Laptop, Monitor, Smartphone, HardDrive } from 'lucide-react'
import { statusToneOf } from './status'

/** Tipos de dispositivo tal como los guarda el backend (`dispositivos.tipo`). */
export const DEVICE_META = {
  celular: { label: 'Celular', icon: Smartphone },
  laptop: { label: 'Laptop', icon: Laptop },
  computadora: { label: 'Computadora', icon: Monitor },
}

export const getDeviceMeta = (tipo) => DEVICE_META[tipo] ?? { label: 'Dispositivo', icon: HardDrive }

/** Tono del badge según el estado de la solicitud (ver utils/status.js). */
export const statusTone = (estado) => statusToneOf(estado)

export const PRIORITY_META = {
  baja: { label: 'Baja', className: 'bg-emerald-50 text-emerald-700' },
  media: { label: 'Media', className: 'bg-amber-50 text-amber-700' },
  alta: { label: 'Alta', className: 'bg-red-50 text-red-700' },
}

export const CONTACT_LABELS = { chat: 'Chat en la plataforma', llamada: 'Llamada telefónica' }

/** Formatea bytes a KB/MB legibles. */
export function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Configuración global leída desde variables de entorno (Vite).
 * Ver .env.example
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000',
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  },
  // Solo para maquetar sin backend: VITE_USE_MOCKS=true. Por defecto se usa la API real.
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
}

export const APP_NAME = 'PROTEC'


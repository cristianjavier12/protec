/**
 * Datos reales del negocio. Se configuran con variables de entorno VITE_BUSINESS_*
 * (ver frontend/.env.example). Los que no estén definidos simplemente no se muestran.
 */
const env = import.meta.env
const clean = (v) => (typeof v === 'string' ? v.trim() : '')
const digits = (v) => clean(v).replace(/[^\d]/g, '')

const DEFAULT_LEGAL_NAME =
  'Cristian Javier Padilla Cornejo, Jessica Pedraza Quintana, Gael Ceja de Anda, Edwin Daniel Carvajal López y Mario Abraham Murillo García'

export const business = {
  name: clean(env.VITE_BUSINESS_NAME) || 'PROTEC',
  /** Nombre o razón social del responsable (requerido en el Aviso de privacidad). */
  legalName: clean(env.VITE_BUSINESS_LEGAL_NAME) || DEFAULT_LEGAL_NAME,
  rfc: clean(env.VITE_BUSINESS_RFC),
  /** Domicilio del centro de servicio / domicilio para oír y recibir notificaciones. */
  address: clean(env.VITE_BUSINESS_ADDRESS),
  email: clean(env.VITE_BUSINESS_EMAIL) || 'cristianpadilla1108@gmail.com',
  /** Correo para solicitudes de derechos ARCO (si no se define, se usa el de contacto). */
  privacyEmail: clean(env.VITE_BUSINESS_PRIVACY_EMAIL) || clean(env.VITE_BUSINESS_EMAIL) || 'cristianpadilla1108@gmail.com',
  phone: clean(env.VITE_BUSINESS_PHONE),
  /** WhatsApp con lada internacional, p. ej. 5215512345678 */
  whatsapp: digits(env.VITE_BUSINESS_WHATSAPP),
  hours: clean(env.VITE_BUSINESS_HOURS),
  /** Fecha de la última actualización de los documentos legales. */
  legalUpdated: clean(env.VITE_LEGAL_UPDATED) || '8 de noviembre de 2026',
}

/** Nombre del responsable para los documentos legales. */
export const responsibleName = business.legalName || business.name

export const telHref = (phone) => `tel:${digits(phone)}`
export const whatsappHref = (number, text = 'Hola, necesito información sobre una reparación.') =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`

export const hasContact = Boolean(business.email || business.phone || business.whatsapp || business.address)

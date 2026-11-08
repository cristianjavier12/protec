import 'dotenv/config'

/**
 * Configuración centralizada leída desde variables de entorno.
 * Ningún secreto debe escribirse directamente en el código.
 */
const required = (name, fallback) => {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Falta la variable de entorno ${name}. Revisa backend/.env (ver .env.example).`)
  }
  return value
}

const isProduction = process.env.NODE_ENV === 'production'
const trimSlash = (url) => (url || '').replace(/\/+$/, '')

/**
 * Conexión MySQL: acepta DATABASE_URL / MYSQL_URL (formato mysql://usuario:clave@host:puerto/base,
 * como lo entregan Railway y otros proveedores) o las variables DB_* por separado.
 */
function databaseConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL
  if (url) {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '') || 'protec',
    }
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'protec',
  }
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => trimSlash(o.trim()))
  .filter(Boolean)

export const env = {
  isProduction,
  isDevelopment: !isProduction,
  port: Number(process.env.PORT) || 4000,
  publicUrl: trimSlash(process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`),
  /** URL pública del frontend (enlaces de correos y retorno de Stripe). */
  frontendUrl: trimSlash(process.env.FRONTEND_URL || corsOrigins[0] || 'http://localhost:5173'),
  corsOrigins,
  /** SSL hacia MySQL (requerido por algunos proveedores en la nube). */
  dbSsl: process.env.DB_SSL === 'true',

  db: databaseConfig(),

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'protec',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: (process.env.STRIPE_CURRENCY || 'mxn').toLowerCase(),
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'PROTEC <cristianpadilla1108@gmail.com>',
  },

  /** Vigencia del enlace de recuperación de contraseña (minutos). */
  resetTokenMinutes: Math.min(Math.max(Number(process.env.RESET_TOKEN_MINUTES) || 30, 5), 1440),
  /** Vigencia del enlace de verificación de correo (horas). */
  verifyTokenHours: Math.min(Math.max(Number(process.env.VERIFY_TOKEN_HOURS) || 48, 1), 168),

  /** Datos del negocio (pie de los correos). Se muestran solo los que estén definidos. */
  business: {
    name: process.env.BUSINESS_NAME || 'PROTEC',
    legalName:
      process.env.BUSINESS_LEGAL_NAME ||
      'Cristian Javier Padilla Cornejo, Jessica Pedraza Quintana, Gael Ceja de Anda, Edwin Daniel Carvajal López y Mario Abraham Murillo García',
    address: process.env.BUSINESS_ADDRESS || '',
    email: process.env.BUSINESS_EMAIL || 'cristianpadilla1108@gmail.com',
    phone: process.env.BUSINESS_PHONE || '',
  },
}

export const cloudinaryEnabled = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret)
export const stripeEnabled = Boolean(env.stripe.secretKey)
export const mailEnabled = Boolean(env.mail.host && env.mail.user && env.mail.pass)
/**
 * La verificación de correo se exige cuando hay SMTP (o en desarrollo, donde el enlace se muestra en consola).
 * En producción sin SMTP se desactiva para no bloquear el registro (el servidor lo advierte al iniciar).
 */
export const emailVerificationEnabled = process.env.EMAIL_VERIFICATION === 'false' ? false : mailEnabled || !isProduction

if (isProduction && env.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.')
}

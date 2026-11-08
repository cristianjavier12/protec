import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

/** Limita intentos de inicio de sesión / registro para mitigar fuerza bruta. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
})

/** Límite general para la API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.' },
})

/**
 * Recuperación y cambio de contraseña: cuenta TODAS las peticiones
 * (la de recuperación siempre responde 200 y no debe permitir enviar correos sin límite).
 */
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 8 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Hiciste demasiadas solicitudes. Espera 15 minutos e inténtalo de nuevo.' },
})

import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env, isAllowedOrigin } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimit.js'
import routes from './routes/index.js'
import { UPLOADS_DIR } from './services/storageService.js'
import { stripeWebhook } from './controllers/repairFlowController.js'
import { asyncHandler } from './utils/asyncHandler.js'

/**
 * Construye la aplicación Express (separada de server.js para poder probarla).
 * Socket.IO se monta sobre el mismo servidor HTTP en server.js.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      // Permite que el frontend (otro origen) muestre las imágenes locales de desarrollo.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    cors({
      origin(origin, cb) {
        if (isAllowedOrigin(origin)) return cb(null, true)
        return cb(null, false)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  )
  app.use((req, _res, next) => {
    const origin = req.headers.origin
    if (origin && !process.env.FRONTEND_URL && /^https:\/\//i.test(origin) && isAllowedOrigin(origin)) {
      env.frontendUrl = origin.replace(/\/+$/, '')
    }
    next()
  })
  // Webhook de Stripe: necesita el cuerpo SIN procesar para verificar la firma (va antes de express.json).
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(stripeWebhook))

  app.use(express.json({ limit: '200kb' }))
  if (env.isDevelopment) app.use(morgan('dev'))

  // Respaldo local de imágenes (solo cuando Cloudinary no está configurado).
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }))

  app.use('/api', apiLimiter, routes)
  app.use('/api', notFound)

  app.get('/', (_req, res) => res.json({ service: 'PROTEC API', docs: '/api/health' }))

  app.use(errorHandler)
  return app
}

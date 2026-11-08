import http from 'node:http'
import { createApp } from './src/app.js'
import { checkDatabaseConnection } from './src/config/db.js'
import { cloudinaryEnabled } from './src/config/cloudinary.js'
import { emailVerificationEnabled, env, mailEnabled, stripeEnabled } from './src/config/env.js'
import { initSocketIO } from './src/socket/index.js'
import { setIO } from './src/services/notificationService.js'

/**
 * Punto de entrada del backend de PROTEC.
 * Servidor HTTP + Express + Socket.IO.
 */
async function start() {
  try {
    await checkDatabaseConnection()
    console.log(`[db] Conectado a MySQL ${env.db.host}:${env.db.port}/${env.db.database}`)
  } catch (error) {
    console.error('[db] No se pudo conectar a MySQL:', error.code ?? error.message)
    console.error('     Verifica que el servidor esté encendido y los datos de backend/.env.')
    console.error('     Si es la primera vez, ejecuta: npm run db:init')
    process.exit(1)
  }

  const app = createApp()
  const server = http.createServer(app)

  // Inicializar Socket.IO
  const io = initSocketIO(server)
  setIO(io)
  console.log('[ws] Socket.IO inicializado')

  server.listen(env.port, () => {
    console.log(`[api] PROTEC API escuchando en ${env.publicUrl}/api (${env.isProduction ? 'producción' : 'desarrollo'})`)
    console.log(`[api] Imágenes: ${cloudinaryEnabled ? 'Cloudinary' : env.isProduction ? 'NO DISPONIBLE (configura Cloudinary)' : 'almacenamiento local (configura Cloudinary en .env)'}`)
    console.log(`[api] Pagos en línea: ${stripeEnabled ? `Stripe${env.stripe.webhookSecret ? ' + webhook' : ' (falta STRIPE_WEBHOOK_SECRET)'}` : 'no configurados (solo pagos en sucursal)'}`)
    console.log(`[api] Correo: ${mailEnabled ? `SMTP ${env.mail.host}` : 'no configurado (los correos no se enviarán)'}`)
    console.log(`[api] Verificación de correo al registrarse: ${emailVerificationEnabled ? 'activa' : 'DESACTIVADA (configura SMTP para activarla)'}`)
    console.log(`[ws]  WebSocket disponible en ${env.publicUrl}`)
  })

  const shutdown = () => server.close(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()

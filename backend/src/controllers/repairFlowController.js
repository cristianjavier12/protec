import { notificationModel } from '../models/notificationModel.js'
import { repairModel } from '../models/repairModel.js'
import * as chat from '../services/chatService.js'
import { findAuthorizedRepair } from '../services/repairService.js'
import * as workflow from '../services/workflowService.js'
import { REPAIR_STATUS as S } from '../utils/constants.js'
import { serializeNotification, serializeRepairSummary } from '../utils/serializers.js'

/* ===== Dashboard del usuario ===== */

const PENDING = [S.REGISTERED, S.DIAGNOSIS, S.PENDING_TECH]

export async function getUserDashboard(req, res) {
  const userId = req.user.id
  const [counts, unread, repairs, activity] = await Promise.all([
    repairModel.dashboardCountsByUser(userId, PENDING),
    notificationModel.countUnread(userId),
    repairModel.listByUser(userId, { filter: 'all' }),
    notificationModel.listByUser(userId, { limit: 8 }),
  ])
  res.json({
    stats: { activas: counts.activas, terminadas: counts.terminadas, pendientes: counts.pendientes, notificaciones: unread },
    repairs: repairs.slice(0, 4).map(serializeRepairSummary),
    activity: activity.map(serializeNotification),
  })
}

/* ===== Detalle ===== */

export async function getRepairDetail(req, res) {
  res.json({ repair: await workflow.getRepairDetail(req.user, req.params.folio) })
}

/* ===== Presupuesto, pagos, logística, calificación ===== */

export async function respondBudget(req, res) {
  const repair = await workflow.respondBudget(req.user, req.params.folio, req.body ?? {})
  res.json({ message: req.body?.accept === true ? 'Presupuesto aceptado.' : 'Presupuesto rechazado.', repair })
}

export async function getPayments(req, res) {
  res.json(await workflow.getPaymentInfo(req.user, req.params.folio))
}

/** POST /repairs/:folio/payments/checkout -> { url } de Stripe Checkout */
export async function createCheckout(req, res) {
  res.status(201).json(await workflow.createCheckoutSession(req.user, req.params.folio, req.body ?? {}))
}

/** GET /repairs/:folio/payments/verify?session_id= — confirma el pago al regresar de Stripe. */
export async function verifyCheckout(req, res) {
  res.json(await workflow.verifyCheckoutSession(req.user, req.params.folio, req.query.session_id))
}

/** POST /payments/stripe/webhook (cuerpo sin procesar para verificar la firma). */
export async function stripeWebhook(req, res) {
  res.json(await workflow.handleStripeWebhook(req.body, req.headers['stripe-signature']))
}

export async function schedulePickup(req, res) {
  const repair = await workflow.schedulePickup(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: 'Recolección programada.', repair })
}

export async function scheduleDelivery(req, res) {
  const repair = await workflow.scheduleDelivery(req.user, req.params.folio, req.body ?? {})
  res.json({ message: 'Entrega configurada.', repair })
}

export async function rateService(req, res) {
  const repair = await workflow.rateService(req.user, req.params.folio, req.body ?? {})
  res.status(201).json({ message: '¡Gracias por calificar el servicio!', repair })
}

/* ===== Chat (REST: historial y respaldo si no hay WebSocket) ===== */

export async function getMessages(req, res) {
  res.json(await chat.getMessages(req.user, req.params.folio))
}

export async function sendMessage(req, res) {
  const message = await chat.postMessage(req.user, req.params.folio, req.body?.mensaje)
  res.status(201).json({ message })
}

export async function markMessagesRead(req, res) {
  res.json(await chat.markRead(req.user, req.params.folio))
}

/* ===== Notificaciones ===== */

export async function getNotifications(req, res) {
  const filter = ['unread', 'repairs', 'messages'].includes(req.query.filter) ? req.query.filter : ''
  const [rows, unreadCount] = await Promise.all([
    notificationModel.listByUser(req.user.id, { filter, limit: 100 }),
    notificationModel.countUnread(req.user.id),
  ])
  res.json({ notifications: rows.map(serializeNotification), unreadCount })
}

export async function markNotificationRead(req, res) {
  await notificationModel.markRead(Number(req.params.id), req.user.id)
  res.json({ unreadCount: await notificationModel.countUnread(req.user.id) })
}

export async function markAllNotificationsRead(req, res) {
  await notificationModel.markAllRead(req.user.id)
  res.json({ unreadCount: 0 })
}

/* ===== Buscador global por folio (respeta permisos) ===== */

export async function searchFolio(req, res) {
  const row = await findAuthorizedRepair(req.params.folio, req.user)
  const asTech = req.user.rol === 'tecnico' && row.id_tecnico === req.user.id
  res.json({
    folio: row.folio,
    estado: row.estado,
    path: asTech ? `/tecnico/reparacion/${row.folio}` : `/reparacion/${row.folio}`,
  })
}

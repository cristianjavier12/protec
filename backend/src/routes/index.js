import { Router } from 'express'
import * as auth from '../controllers/authController.js'
import * as diagnosis from '../controllers/diagnosisController.js'
import * as repairs from '../controllers/repairController.js'
import * as uploads from '../controllers/uploadController.js'
import * as users from '../controllers/userController.js'
import * as tech from '../controllers/technicianController.js'
import * as flow from '../controllers/repairFlowController.js'
import * as admin from '../controllers/adminController.js'
import { authenticateToken, optionalAuth, authorizeRoles } from '../middleware/auth.js'
import { authLimiter, passwordLimiter } from '../middleware/rateLimit.js'
import { evidenceUpload } from '../middleware/upload.js'
import { asyncHandler as h } from '../utils/asyncHandler.js'

const router = Router()

/* ---------- Salud ---------- */
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'protec-api', time: new Date().toISOString() }))

/* ---------- Autenticación ---------- */
router.post('/auth/register', authLimiter, h(auth.register))
router.post('/auth/login', authLimiter, h(auth.login))
router.get('/auth/me', authenticateToken, h(auth.me))
router.post('/auth/verify-email', passwordLimiter, h(auth.verifyEmail))
router.post('/auth/resend-verification', passwordLimiter, h(auth.resendVerification))
router.post('/auth/forgot-password', passwordLimiter, h(auth.forgotPassword))
router.get('/auth/reset-password/validate', passwordLimiter, h(auth.validateResetToken))
router.post('/auth/reset-password', passwordLimiter, h(auth.resetPassword))

/* ---------- Perfil y dispositivos ---------- */
router.get('/users/me', authenticateToken, h(users.getMe))
router.put('/users/me', authenticateToken, h(users.updateMe))
router.put('/users/me/password', authenticateToken, passwordLimiter, h(users.changePassword))
router.get('/devices', authenticateToken, h(users.listMyDevices))

/* ---------- Dashboard del usuario ---------- */
router.get('/users/dashboard', authenticateToken, h(flow.getUserDashboard))

/* ---------- Evidencias (Cloudinary) ---------- */
router.post('/uploads', authenticateToken, evidenceUpload.single('file'), h(uploads.uploadEvidence))
router.delete('/uploads', authenticateToken, h(uploads.deleteEvidence))

/* ---------- Solicitudes ---------- */
router.get('/repairs', authenticateToken, h(repairs.listMyRepairs))
router.post('/repairs', authenticateToken, h(repairs.createRepair))
router.get('/repairs/:folio/tracking', optionalAuth, h(repairs.getTracking))
router.get('/repairs/:folio', authenticateToken, h(flow.getRepairDetail))
router.post('/repairs/:folio/evidencias', authenticateToken, h(repairs.addEvidences))

/* ---------- Presupuesto (respuesta del usuario) ---------- */
router.post('/repairs/:folio/budget/respond', authenticateToken, h(flow.respondBudget))

/* ---------- Pagos (Stripe Checkout; el webhook se monta en app.js con el cuerpo sin procesar) ---------- */
router.get('/repairs/:folio/payments', authenticateToken, h(flow.getPayments))
router.post('/repairs/:folio/payments/checkout', authenticateToken, h(flow.createCheckout))
router.get('/repairs/:folio/payments/verify', authenticateToken, h(flow.verifyCheckout))

/* ---------- Logística ---------- */
router.post('/repairs/:folio/pickup', authenticateToken, h(flow.schedulePickup))
router.post('/repairs/:folio/delivery', authenticateToken, h(flow.scheduleDelivery))

/* ---------- Calificación ---------- */
router.post('/repairs/:folio/rating', authenticateToken, h(flow.rateService))

/* ---------- Chat (REST fallback) ---------- */
router.get('/repairs/:folio/messages', authenticateToken, h(flow.getMessages))
router.post('/repairs/:folio/messages', authenticateToken, h(flow.sendMessage))
router.post('/repairs/:folio/messages/read', authenticateToken, h(flow.markMessagesRead))

/* ---------- Notificaciones ---------- */
router.get('/notifications', authenticateToken, h(flow.getNotifications))
router.patch('/notifications/:id/read', authenticateToken, h(flow.markNotificationRead))
router.post('/notifications/read-all', authenticateToken, h(flow.markAllNotificationsRead))

/* ---------- Diagnóstico (chatbot por reglas) ---------- */
router.post('/diagnostics/preview', h(diagnosis.preview))
router.get('/diagnostics/:folio', authenticateToken, h(diagnosis.getSession))
router.post('/diagnostics/:folio/answer', authenticateToken, h(diagnosis.answer))
router.post('/diagnostics/:folio/resolution', authenticateToken, h(diagnosis.resolve))

/* ---------- Buscador global de folio (respeta permisos por rol) ---------- */
router.get('/search/folio/:folio', authenticateToken, h(flow.searchFolio))

/* ========== PANEL DEL TÉCNICO ========== */
router.get('/technician/dashboard', authenticateToken, authorizeRoles('tecnico'), h(tech.getDashboard))
router.get('/technician/repairs/:folio', authenticateToken, authorizeRoles('tecnico'), h(tech.getRepairDetail))
router.post('/technician/repairs/:folio/diagnosis', authenticateToken, authorizeRoles('tecnico'), h(tech.saveDiagnosis))
router.post('/technician/repairs/:folio/budget', authenticateToken, authorizeRoles('tecnico'), h(tech.createBudget))
router.patch('/technician/repairs/:folio/status', authenticateToken, authorizeRoles('tecnico'), h(tech.updateStatus))
router.post('/technician/repairs/:folio/evidences', authenticateToken, authorizeRoles('tecnico'), h(tech.addEvidences))
router.post('/technician/repairs/:folio/parts', authenticateToken, authorizeRoles('tecnico'), h(tech.addPart))
router.delete('/technician/repairs/:folio/parts/:partId', authenticateToken, authorizeRoles('tecnico'), h(tech.removePart))
router.patch('/technician/availability', authenticateToken, authorizeRoles('tecnico'), h(tech.toggleAvailability))
router.patch('/technician/repairs/:folio/logistics/:logId/status', authenticateToken, authorizeRoles('tecnico'), h(tech.updateLogisticsStatus))

/* ========== PANEL ADMINISTRATIVO ========== */
router.get('/admin/dashboard', authenticateToken, authorizeRoles('admin'), h(admin.getDashboard))
router.get('/admin/technicians', authenticateToken, authorizeRoles('admin'), h(admin.listTechnicians))
router.patch('/admin/technicians/:id', authenticateToken, authorizeRoles('admin'), h(admin.updateTechnician))
router.get('/admin/repairs', authenticateToken, authorizeRoles('admin'), h(admin.listRepairs))
router.post('/admin/repairs/:folio/assign', authenticateToken, authorizeRoles('admin'), h(admin.assignTech))
router.get('/admin/users', authenticateToken, authorizeRoles('admin'), h(admin.listUsers))
router.get('/admin/payments', authenticateToken, authorizeRoles('admin'), h(admin.listPayments))
router.post('/admin/users', authenticateToken, authorizeRoles('admin'), h(admin.createUser))
router.patch('/admin/users/:id/role', authenticateToken, authorizeRoles('admin'), h(admin.changeUserRole))
router.delete('/admin/users/:id', authenticateToken, authorizeRoles('admin'), h(admin.deleteUser))
router.delete('/admin/repairs/:folio', authenticateToken, authorizeRoles('admin'), h(admin.deleteRepair))
router.post('/admin/repairs/:folio/payments', authenticateToken, authorizeRoles('admin'), h(admin.registerPayment))

export default router

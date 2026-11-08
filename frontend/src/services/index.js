/**
 * Servicios de la API de PROTEC.
 * Cada función consume un endpoint real de Express + MySQL.
 */
import { api } from './apiClient'

/* ---------- Autenticación ---------- */
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (correo) => api.post('/auth/resend-verification', { correo }),
  forgotPassword: (correo) => api.post('/auth/forgot-password', { correo }),
  validateResetToken: (token) => api.get(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
}

/* ---------- Perfil de usuario ---------- */
export const userService = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (payload) => api.put('/users/me', payload),
  listDevices: () => api.get('/devices'),
  getDashboard: () => api.get('/users/dashboard'),
  changePassword: (payload) => api.put('/users/me/password', payload),
}

/* ---------- Solicitudes de reparación ---------- */
export const repairService = {
  create: (payload) => api.post('/repairs', payload),
  list: (params) => {
    const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    const query = Object.keys(clean).length ? `?${new URLSearchParams(clean)}` : ''
    return api.get(`/repairs${query}`)
  },
  getByFolio: (folio) => api.get(`/repairs/${encodeURIComponent(folio)}`),
  getTracking: (folio) => api.get(`/repairs/${encodeURIComponent(folio)}/tracking`),
  addEvidences: (folio, tokens) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/evidencias`, { evidencias: tokens }),

  // Presupuesto
  respondBudget: (folio, accept) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/budget/respond`, { accept }),

  // Pagos
  getPayments: (folio) => api.get(`/repairs/${encodeURIComponent(folio)}/payments`),
  createCheckout: (folio, tipo) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/payments/checkout`, { tipo }),
  verifyCheckout: (folio, sessionId) =>
    api.get(`/repairs/${encodeURIComponent(folio)}/payments/verify?session_id=${encodeURIComponent(sessionId)}`),

  // Logística
  schedulePickup: (folio, data) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/pickup`, data),
  scheduleDelivery: (folio, data) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/delivery`, data),

  // Calificación
  rateService: (folio, data) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/rating`, data),

  // Chat
  getMessages: (folio) => api.get(`/repairs/${encodeURIComponent(folio)}/messages`),
  sendMessage: (folio, mensaje) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/messages`, { mensaje }),
  markMessagesRead: (folio) =>
    api.post(`/repairs/${encodeURIComponent(folio)}/messages/read`),
}

/* ---------- Evidencias / Uploads ---------- */
export const uploadService = {
  uploadEvidence: (file, { onProgress } = {}) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload('/uploads', form, { onProgress })
  },
  deleteEvidence: (token) => api.delete('/uploads', { body: { token } }),
}

/* ---------- Diagnóstico (chatbot por reglas) ---------- */
export const diagnosisService = {
  preview: (payload) => api.post('/diagnostics/preview', payload),
  getSession: (folio) => api.get(`/diagnostics/${encodeURIComponent(folio)}`),
  answer: (folio, payload) => api.post(`/diagnostics/${encodeURIComponent(folio)}/answer`, payload),
  resolve: (folio, payload) => api.post(`/diagnostics/${encodeURIComponent(folio)}/resolution`, payload),
}

/* ---------- Notificaciones ---------- */
export const notificationService = {
  list: (filter) => api.get(`/notifications${filter ? `?filter=${filter}` : ''}`),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}

/* ---------- Panel del técnico ---------- */
export const technicianService = {
  getDashboard: (params) => {
    const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    const query = Object.keys(clean).length ? `?${new URLSearchParams(clean)}` : ''
    return api.get(`/technician/dashboard${query}`)
  },
  getRepairDetail: (folio) => api.get(`/technician/repairs/${encodeURIComponent(folio)}`),
  saveDiagnosis: (folio, data) =>
    api.post(`/technician/repairs/${encodeURIComponent(folio)}/diagnosis`, data),
  createBudget: (folio, data) =>
    api.post(`/technician/repairs/${encodeURIComponent(folio)}/budget`, data),
  updateStatus: (folio, data) =>
    api.patch(`/technician/repairs/${encodeURIComponent(folio)}/status`, data),
  addEvidences: (folio, data) =>
    api.post(`/technician/repairs/${encodeURIComponent(folio)}/evidences`, data),
  addPart: (folio, data) =>
    api.post(`/technician/repairs/${encodeURIComponent(folio)}/parts`, data),
  removePart: (folio, partId) =>
    api.delete(`/technician/repairs/${encodeURIComponent(folio)}/parts/${partId}`),
  toggleAvailability: (disponible) =>
    api.patch('/technician/availability', { disponible }),
  updateLogisticsStatus: (folio, logId, estado) =>
    api.patch(`/technician/repairs/${encodeURIComponent(folio)}/logistics/${logId}/status`, { estado }),
}

/* ---------- Panel administrativo ---------- */
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  listTechnicians: () => api.get('/admin/technicians'),
  updateTechnician: (id, data) => api.patch(`/admin/technicians/${id}`, data),
  listRepairs: (params) => {
    const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    const query = Object.keys(clean).length ? `?${new URLSearchParams(clean)}` : ''
    return api.get(`/admin/repairs${query}`)
  },
  assignTechnician: (folio, technicianUserId) =>
    api.post(`/admin/repairs/${encodeURIComponent(folio)}/assign`, { technicianUserId }),
  listUsers: () => api.get('/admin/users'),
  listPayments: () => api.get('/admin/payments'),
  createUser: (data) => api.post('/admin/users', data),
  changeUserRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteRepair: (folio) => api.delete(`/admin/repairs/${encodeURIComponent(folio)}`),
  registerPayment: (folio, data) => api.post(`/admin/repairs/${encodeURIComponent(folio)}/payments`, data),
}

/* ---------- Buscador global de folio ---------- */
export const searchService = {
  searchFolio: (folio) => api.get(`/search/folio/${encodeURIComponent(folio)}`),
}

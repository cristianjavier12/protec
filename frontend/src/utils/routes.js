/**
 * Rutas centralizadas de la aplicación.
 * Usar siempre estas constantes en lugar de strings sueltos.
 */
export const ROUTES = {
  HOME: '/',
  SERVICES: '/servicios',
  HOW_IT_WORKS: '/como-funciona',
  REQUEST_REPAIR: '/solicitar-reparacion',
  DIAGNOSIS: '/diagnostico',
  DIAGNOSIS_FOLIO: '/diagnostico/:folio',
  TRACKING: '/seguimiento',
  ABOUT: '/nosotros',
  HELP: '/ayuda',
  LOGIN: '/login',
  REGISTER: '/registro',
  FORGOT_PASSWORD: '/recuperar-contrasena',
  RESET_PASSWORD: '/restablecer-contrasena',
  VERIFY_EMAIL: '/verificar-correo',
  TERMS: '/terminos',
  PRIVACY: '/privacidad',

  // Rutas autenticadas (usuario)
  DASHBOARD: '/dashboard',
  MY_ACCOUNT: '/mi-cuenta',
  MY_REPAIRS: '/mis-reparaciones',
  REPAIR_DETAIL: '/reparacion/:folio',
  REPAIR_CREATED: '/solicitud-creada/:folio',
  REPAIR_PAYMENT: '/reparacion/:folio/pago',
  NOTIFICATIONS: '/notificaciones',

  // Panel del técnico
  TECH_DASHBOARD: '/tecnico',
  TECH_REPAIR_DETAIL: '/tecnico/reparacion/:folio',

  // Panel del administrador
  ADMIN_DASHBOARD: '/admin',
}

/** Construye la URL de solicitud con un dispositivo preseleccionado. */
export const requestRepairWithDevice = (deviceId) =>
  deviceId ? `${ROUTES.REQUEST_REPAIR}?device=${deviceId}` : ROUTES.REQUEST_REPAIR

/** Construye la URL de seguimiento con un folio precargado. */
export const trackingWithFolio = (folio) =>
  folio ? `${ROUTES.TRACKING}?folio=${encodeURIComponent(folio)}` : ROUTES.TRACKING

/** Construye la URL de detalle de reparación. */
export const repairDetailPath = (folio) =>
  `/reparacion/${encodeURIComponent(folio)}`

/** Construye la URL del diagnóstico vinculado a un folio. */
export const diagnosisWithFolio = (folio) =>
  `/diagnostico/${encodeURIComponent(folio)}`

/** Construye la URL de solicitud creada. */
export const repairCreatedPath = (folio) =>
  `/solicitud-creada/${encodeURIComponent(folio)}`

/** Construye la URL de pago. */
export const repairPaymentPath = (folio) =>
  `/reparacion/${encodeURIComponent(folio)}/pago`

/** Construye la URL de detalle técnico. */
export const techRepairDetailPath = (folio, tab) =>
  `/tecnico/reparacion/${encodeURIComponent(folio)}${tab ? `?tab=${tab}` : ''}`

/** Pantalla principal después de iniciar sesión según el rol. */
export const homeForRole = (rol) =>
  rol === 'tecnico' ? ROUTES.TECH_DASHBOARD : rol === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD

/** Navegación principal por rol (sección 49). */
export const ROLE_NAV = {
  usuario: [
    { label: 'Inicio', to: ROUTES.DASHBOARD },
    { label: 'Nueva reparación', to: ROUTES.REQUEST_REPAIR },
    { label: 'Mis reparaciones', to: ROUTES.MY_REPAIRS },
    { label: 'Notificaciones', to: ROUTES.NOTIFICATIONS },
    { label: 'Mi cuenta', to: ROUTES.MY_ACCOUNT },
  ],
  tecnico: [
    { label: 'Dashboard técnico', to: ROUTES.TECH_DASHBOARD, end: true },
    { label: 'Mis trabajos', to: `${ROUTES.TECH_DASHBOARD}?vista=trabajos`, match: 'vista=trabajos' },
    { label: 'Mensajes', to: `${ROUTES.NOTIFICATIONS}?filtro=mensajes`, match: 'filtro=mensajes' },
    { label: 'Notificaciones', to: ROUTES.NOTIFICATIONS },
    { label: 'Perfil', to: ROUTES.MY_ACCOUNT },
  ],
  admin: [
    { label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD, tab: 'dashboard' },
    { label: 'Solicitudes', to: `${ROUTES.ADMIN_DASHBOARD}?tab=solicitudes`, tab: 'solicitudes' },
    { label: 'Técnicos', to: `${ROUTES.ADMIN_DASHBOARD}?tab=tecnicos`, tab: 'tecnicos' },
    { label: 'Usuarios', to: `${ROUTES.ADMIN_DASHBOARD}?tab=usuarios`, tab: 'usuarios' },
    { label: 'Pagos', to: `${ROUTES.ADMIN_DASHBOARD}?tab=pagos`, tab: 'pagos' },
  ],
}

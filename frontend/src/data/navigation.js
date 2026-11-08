import { ROUTES } from '../utils/routes'

/** Enlaces principales de la navbar. */
export const mainNav = [
  { label: 'Inicio', to: ROUTES.HOME, end: true },
  { label: 'Servicios', to: ROUTES.SERVICES },
  { label: 'Cómo funciona', to: ROUTES.HOW_IT_WORKS },
  { label: 'Seguimiento', to: ROUTES.TRACKING },
  { label: 'Nosotros', to: ROUTES.ABOUT },
  { label: 'Ayuda', to: ROUTES.HELP },
]

/** Columnas del footer. */
export const footerNav = [
  {
    title: 'Servicios',
    links: [
      { label: 'Celulares', to: `${ROUTES.SERVICES}#celulares` },
      { label: 'Laptops', to: `${ROUTES.SERVICES}#laptops` },
      { label: 'Computadoras', to: `${ROUTES.SERVICES}#computadoras` },
      { label: 'Diagnóstico', to: `${ROUTES.SERVICES}#diagnostico` },
    ],
  },
  {
    title: 'Plataforma',
    links: [
      { label: 'Solicitar reparación', to: ROUTES.REQUEST_REPAIR },
      { label: 'Seguimiento', to: ROUTES.TRACKING },
      { label: 'Diagnóstico', to: ROUTES.DIAGNOSIS },
      { label: 'Iniciar sesión', to: ROUTES.LOGIN },
    ],
  },
  {
    title: 'Información',
    links: [
      { label: 'Cómo funciona', to: ROUTES.HOW_IT_WORKS },
      { label: 'Nosotros', to: ROUTES.ABOUT },
      { label: 'Ayuda', to: ROUTES.HELP },
    ],
  },
]

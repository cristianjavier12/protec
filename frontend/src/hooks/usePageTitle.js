import { useEffect } from 'react'
import { APP_NAME } from '../utils/config'

/** Actualiza el título del documento por página. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} · ${APP_NAME}`
      : `${APP_NAME} · Reparación inteligente de dispositivos`
  }, [title])
}

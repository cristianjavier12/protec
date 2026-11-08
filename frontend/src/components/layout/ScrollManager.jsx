import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Gestiona el scroll al navegar:
 *  - Cambio de ruta sin hash -> vuelve arriba.
 *  - URL con hash (#seccion) -> desplaza suavemente hasta la sección.
 */
export default function ScrollManager() {
  const { pathname, hash, key } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      let attempts = 0
      let timer
      // Reintenta por si la sección aún no se ha montado (cambio de página).
      const tryScroll = () => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (attempts++ < 10) {
          timer = window.setTimeout(tryScroll, 60)
        }
      }
      tryScroll()
      return () => window.clearTimeout(timer)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, key])

  return null
}

import { useEffect } from 'react'

/** Bloquea el scroll del body mientras `locked` sea true (menú móvil, modales). */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [locked])
}

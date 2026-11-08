import { useCallback, useEffect, useRef } from 'react'
import { useSocketEvent } from '../context/SocketContext'

/**
 * Ejecuta `onUpdate` cuando el backend avisa (Socket.IO `repair:updated`)
 * que la solicitud con este folio cambió. Permite refrescar la vista sin recargar.
 */
export function useRepairLive(folio, onUpdate) {
  const cb = useRef(onUpdate)
  useEffect(() => {
    cb.current = onUpdate
  }, [onUpdate])

  useSocketEvent(
    'repair:updated',
    useCallback(
      (data) => {
        if (!folio || data?.folio?.toUpperCase() !== String(folio).toUpperCase()) return
        cb.current?.(data)
      },
      [folio],
    ),
  )
}

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { eventKeyMap } from '../api/queryKeys'

/**
 * Subscribe to the backend SSE event bus (`GET /api/events`).
 *
 * Handles two event types:
 * - `invalidate` — instantly invalidates the listed React Query keys
 * - `notification` — (future) could drive a toast / snackbar
 *
 * Reconnects automatically on connection loss with exponential back-off.
 * Mount once at the app root — the hook is idempotent (one connection per app).
 */
export function useEventBus() {
  const queryClient = useQueryClient()
  const retryRef = useRef(0)

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      es = new EventSource('/api/events')

      es.onopen = () => {
        // Reset back-off on successful connection
        retryRef.current = 0
      }

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: 'invalidate' | 'notification'
            keys?: string[]
            message?: string
          }

          if (payload.type === 'invalidate' && payload.keys) {
            for (const key of payload.keys) {
              const registryKey = eventKeyMap[key]
              if (registryKey) {
                queryClient.invalidateQueries({ queryKey: registryKey })
              }
            }
          }
          // Notification events can be handled here in the future
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        // EventSource auto-reconnects for network errors, but if the
        // connection is closed (readyState === CLOSED) we reconnect manually.
        if (es?.readyState === EventSource.CLOSED) {
          es.close()
          es = null

          const delay = Math.min(30_000, 1_000 * Math.pow(2, retryRef.current))
          retryRef.current += 1
          reconnectTimer = setTimeout(connect, delay)
        }
      }
    }

    connect()

    return () => {
      es?.close()
      es = null
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [queryClient])
}

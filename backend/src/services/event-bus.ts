/**
 * Lightweight server-sent event bus.
 *
 * Backend services call `emit()` to push notifications.
 * The SSE endpoint streams them to all connected frontends.
 * The frontend invalidates the matching React Query keys — no polling needed.
 */

import type { Response } from 'express'

// ── Types ──────────────────────────────────────────────────────────────────

export interface BusEvent {
  /** Event type — the frontend switches on this. */
  type: 'invalidate' | 'notification'
  /** React Query keys to invalidate (for type === 'invalidate'). */
  keys?: string[]
  /** Optional human-readable message (for type === 'notification'). */
  message?: string
}

// ── Subscriber registry ────────────────────────────────────────────────────

type Subscriber = (event: BusEvent) => void
const subscribers = new Set<Subscriber>()

/** Push an event to all connected SSE clients. */
export function emit(event: BusEvent): void {
  for (const sub of subscribers) {
    sub(event)
  }
}

/** Register an SSE response as a subscriber. Returns an unsubscribe fn. */
export function subscribe(callback: Subscriber): () => void {
  subscribers.add(callback)
  return () => { subscribers.delete(callback) }
}

// ── Convenience helpers ────────────────────────────────────────────────────

/** Invalidate one or more React Query keys on all connected frontends. */
export function invalidate(...keys: string[]): void {
  emit({ type: 'invalidate', keys })
}

/** Send a notification message to all connected frontends. */
export function notify(message: string): void {
  emit({ type: 'notification', message })
}

// ── SSE response wiring ────────────────────────────────────────────────────

/** Wire an Express response as an SSE stream. Call from the route handler. */
export function attachSSE(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Send initial heartbeat so the client knows the connection is alive
  res.write(': heartbeat\n\n')

  // Keep-alive every 30 s to prevent proxy/load-balancer timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30_000)

  const unsubscribe = subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  })

  res.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}

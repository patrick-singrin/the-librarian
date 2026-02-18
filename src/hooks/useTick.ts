import { useState, useEffect } from 'react'

/**
 * Forces a re-render at a fixed interval (default: 60 s).
 * Returns a tick counter that increments each interval.
 *
 * Useful for keeping relative-time displays fresh
 * even when the underlying data hasn't changed.
 */
export function useTick(intervalMs = 60_000): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return tick
}

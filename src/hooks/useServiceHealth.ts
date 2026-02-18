import { useHealth } from './useHealth'
import type { ServiceHealth, HealthResponse } from '../types/api'

type ServiceName = keyof HealthResponse['services']

interface ServiceHealthInfo {
  health: ServiceHealth | undefined
  isStarting: boolean
  isDown: boolean
  isHealthy: boolean
  message: string | null
}

export function useServiceHealth(service: ServiceName): ServiceHealthInfo {
  const { data } = useHealth()
  const health = data?.services[service]

  const isStarting =
    health?.status === 'degraded' &&
    !!health.error?.toLowerCase().includes('starting')
  const isDown = health?.status === 'down'
  const isHealthy = health?.status === 'healthy'

  const message = isStarting
    ? (health?.error ?? 'Service is starting up...')
    : null

  return { health, isStarting, isDown, isHealthy, message }
}

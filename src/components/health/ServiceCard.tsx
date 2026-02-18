import type { ServiceHealth } from '../../types/api'
import { Card, Indicator } from '../ui'

interface ServiceCardProps {
  name: string
  health: ServiceHealth | undefined
  isLoading: boolean
}

export function ServiceCard({ name, health, isLoading }: ServiceCardProps) {
  const status = health?.status ?? 'down'
  const statusLabel = isLoading ? 'Checking...' : status === 'healthy' ? 'Healthy' : status === 'degraded' ? 'Degraded' : 'Down'

  const indicatorVariant = status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error' as const

  const borderColor =
    status === 'healthy'
      ? 'border-green-200'
      : status === 'degraded'
        ? 'border-yellow-200'
        : 'border-red-200'

  return (
    <Card
      as="article"
      className={borderColor}
      aria-label={`${name}: ${statusLabel}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <span
          role="status"
          className="flex items-center gap-1.5 text-xs font-medium"
          aria-label={`Status: ${statusLabel}`}
        >
          <Indicator variant={indicatorVariant} size="xs" />
          {statusLabel}
        </span>
      </div>
      {health?.latencyMs != null && (
        <p className="mt-2 text-xs text-gray-500">{health.latencyMs} ms</p>
      )}
      {health?.error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {health.error}
        </p>
      )}
    </Card>
  )
}

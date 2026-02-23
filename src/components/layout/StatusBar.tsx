import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { FileArchive, Circuitry, Database, Brain } from '@phosphor-icons/react'
import { useHealth } from '../../hooks/useHealth'
import type { ServiceHealth, HealthResponse } from '../../types/api'
import type { IndicatorVariant } from '../ui'
import { Badge, Tooltip } from '../ui'
import { Button as AriaButton } from 'react-aria-components'
import { RagHealthBanner } from './RagHealthBanner'

interface ServiceConfig {
  key: keyof HealthResponse['services']
  label: string
  icon: ComponentType<PhosphorIconProps>
}

const services: ServiceConfig[] = [
  { key: 'paperless', label: 'Paperless', icon: FileArchive },
  { key: 'rag', label: 'RAG', icon: Circuitry },
  { key: 'qdrant', label: 'Qdrant', icon: Database },
  { key: 'lmStudio', label: 'LLM Provider', icon: Brain },
]

function statusToIndicator(health: ServiceHealth | undefined): IndicatorVariant | undefined {
  if (!health) return undefined
  if (health.status === 'healthy') return 'success'
  if (health.status === 'degraded') return 'warning'
  return 'error'
}

function TooltipContent({ health }: { health: ServiceHealth | undefined }) {
  if (!health) {
    return <span className="text-base-subtle-foreground-default">Loading…</span>
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium capitalize">{health.status}</span>
      <span className="text-base-subtle-foreground-default">{health.latencyMs} ms</span>
      {health.error && (
        <span className="text-error-foreground-default">{health.error}</span>
      )}
    </div>
  )
}

export function StatusBar() {
  const { data } = useHealth()

  return (
    <>
      <div
        role="status"
        aria-label="Service status"
        className="sticky top-0 z-10 flex h-[52px] items-center gap-3 border-b border-base-subtle-border-default bg-white px-6"
      >
        <h1 className="mr-auto text-lg font-bold text-base-foreground-default">The Librarian</h1>
        {services.map(({ key, label, icon }) => {
          const health = data?.services[key]
          const indicator = statusToIndicator(health)

          return (
            <Tooltip key={key} content={<TooltipContent health={health} />} placement="bottom">
              <AriaButton className="cursor-default rounded-full outline-focus transition-[background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2">
                <Badge
                  variant="base"
                  type="outline"
                  size="xs"
                  indicator={indicator}
                  icon={icon}
                >
                  {label}
                </Badge>
              </AriaButton>
            </Tooltip>
          )
        })}
      </div>
      <RagHealthBanner />
    </>
  )
}

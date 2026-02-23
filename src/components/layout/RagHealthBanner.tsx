import { WarningCircle } from '@phosphor-icons/react'
import { useServiceHealth } from '../../hooks/useServiceHealth'

/**
 * Global banner shown when the RAG API is down or still starting up.
 * Rendered in AppShell above the sidebar + content area so it spans
 * all pages (except Settings, which is excluded by the parent).
 */
function RagHealthBanner() {
  const rag = useServiceHealth('rag')

  if (rag.isHealthy || (!rag.isDown && !rag.isStarting)) return null

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning-subtle-border-default bg-warning-subtle-background-default px-6 py-2 text-sm text-warning-foreground-default"
    >
      <WarningCircle size={16} weight="fill" className="shrink-0" />
      <span>
        {rag.isStarting
          ? 'RAG API is starting up — some data may be stale while the model loads'
          : 'RAG API is not running — showing cached data. Restart it from the Settings page.'}
      </span>
    </div>
  )
}

export { RagHealthBanner }

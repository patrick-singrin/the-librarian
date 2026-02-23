import { Files, TrayArrowDown, ArrowsClockwise, FileArchive, Circuitry } from '@phosphor-icons/react'
import { useOverview } from '../../hooks/useOverview'
import { useCheckNew } from '../../hooks/useSyncStatus'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useTick } from '../../hooks/useTick'
import { KpiTile } from '../ui'
import { DocumentTimeline } from './DocumentTimeline'

export function HealthDashboard() {
  const overview = useOverview()
  const checkNew = useCheckNew()          // shared cache with RAG Tool page
  const rag = useServiceHealth('rag')

  // Keep relative timestamps fresh
  useTick(60_000)

  // ── Paperless KPIs (from overview) ──
  // React Query keeps old data on refetch errors + localStorage persistence,
  // so we can derive the snapshot directly — no need to stash "last good" state.
  const p = overview.data?.paperless
  const hasPaperless = p != null && p.totalDocuments > 0
  const pSnap = hasPaperless
    ? { documents: p.totalDocuments, inbox: p.inboxDocuments, updatedAt: overview.dataUpdatedAt }
    : null
  const pLoading = !pSnap && overview.isFetching

  // ── RAG "Synced" KPI (from useCheckNew — same cache as RAG Tool) ──
  const cn = checkNew.data
  const syncPct =
    cn?.total_indexed != null && cn?.total_in_paperless && cn.total_in_paperless > 0
      ? `${Math.round((cn.total_indexed / cn.total_in_paperless) * 100)}%`
      : null
  const ragLoading = !cn && checkNew.isFetching

  const hasError = overview.error || checkNew.error

  return (
    <div>
      {/* Error — only for genuine unexpected failures (global banner handles RAG down/starting) */}
      {hasError && !rag.isDown && !rag.isStarting && (
        <div role="alert" className="mb-4 rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
          Unable to load overview: {(overview.error ?? checkNew.error)?.message}
        </div>
      )}

      <section aria-label="Key statistics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiTile
            title="Documents"
            icon={Files}
            badge={{ label: 'Paperless', icon: FileArchive }}
            value={pSnap?.documents}
            loading={pLoading}
            updatedAt={pSnap?.updatedAt}
          />
          <KpiTile
            title="Inbox"
            icon={TrayArrowDown}
            badge={{ label: 'Paperless', icon: FileArchive }}
            value={pSnap?.inbox}
            loading={pLoading}
            updatedAt={pSnap?.updatedAt}
          />
          <KpiTile
            title="Synced"
            icon={ArrowsClockwise}
            badge={{ label: 'RAG', icon: Circuitry }}
            value={syncPct}
            loading={ragLoading}
            updatedAt={checkNew.dataUpdatedAt || null}
            description="Documents assigned to a RAG space"
          />
        </div>
      </section>

      <section aria-label="Documents over time" className="mt-6">
        <DocumentTimeline />
      </section>
    </div>
  )
}

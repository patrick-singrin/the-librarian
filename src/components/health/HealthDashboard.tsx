import { useRef } from 'react'
import { Files, TrayArrowDown, ArrowsClockwise, FileArchive, Circuitry } from '@phosphor-icons/react'
import { useOverview } from '../../hooks/useOverview'
import { useCheckNew } from '../../hooks/useSyncStatus'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useTick } from '../../hooks/useTick'
import { KpiTile } from '../ui'
import { DocumentTimeline } from './DocumentTimeline'

interface PaperlessSnapshot {
  documents: number
  inbox: number
  updatedAt: number
}

export function HealthDashboard() {
  const overview = useOverview()
  const checkNew = useCheckNew()          // shared cache with RAG Tool page
  const rag = useServiceHealth('rag')
  const lastGoodPaperless = useRef<PaperlessSnapshot | null>(null)

  // Keep relative timestamps fresh
  useTick(60_000)

  // ── Paperless KPIs (from overview) ──
  const p = overview.data?.paperless
  const hasPaperless = p != null && p.totalDocuments > 0

  if (hasPaperless) {
    lastGoodPaperless.current = {
      documents: p.totalDocuments,
      inbox: p.inboxDocuments,
      updatedAt: overview.dataUpdatedAt,
    }
  }

  const pSnap = lastGoodPaperless.current
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
      {hasError && (
        rag.isStarting ? (
          <div role="status" className="mb-4 rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
            {rag.message}
          </div>
        ) : (
          <div role="alert" className="mb-4 rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
            Unable to load overview: {(overview.error ?? checkNew.error)?.message}
          </div>
        )
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

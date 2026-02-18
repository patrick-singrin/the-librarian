import { useRef } from 'react'
import { Files, TrayArrowDown, ArrowsClockwise, FileArchive, Circuitry } from '@phosphor-icons/react'
import { useOverview } from '../../hooks/useOverview'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { KpiTile } from '../ui'
import { DocumentTimeline } from './DocumentTimeline'

interface Snapshot {
  documents: number
  inbox: number
  syncPct: string | null
  updatedAt: number
}

export function HealthDashboard() {
  const { data, isFetching, error, dataUpdatedAt } = useOverview()
  const rag = useServiceHealth('rag')
  const lastGood = useRef<Snapshot | null>(null)

  const p = data?.paperless
  const r = data?.rag

  // Only accept the response when Paperless actually returned data
  const hasPaperless = p != null && p.totalDocuments > 0

  if (hasPaperless) {
    lastGood.current = {
      documents: p.totalDocuments,
      inbox: p.inboxDocuments,
      syncPct:
        r?.totalIndexed != null && r?.totalInPaperless
          ? `${Math.round((r.totalIndexed / r.totalInPaperless) * 100)}%`
          : lastGood.current?.syncPct ?? null,
      updatedAt: dataUpdatedAt,
    }
  }

  const snap = lastGood.current
  const loading = !snap && isFetching

  return (
    <div>
      {error && (
        rag.isStarting ? (
          <div role="status" className="mb-4 rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
            {rag.message}
          </div>
        ) : (
          <div role="alert" className="mb-4 rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
            Unable to load overview: {error.message}
          </div>
        )
      )}

      <section aria-label="Key statistics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiTile
            title="Documents"
            icon={Files}
            badge={{ label: 'Paperless', icon: FileArchive }}
            value={snap?.documents}
            loading={loading}
            updatedAt={snap?.updatedAt}
          />
          <KpiTile
            title="Inbox"
            icon={TrayArrowDown}
            badge={{ label: 'Paperless', icon: FileArchive }}
            value={snap?.inbox}
            loading={loading}
            updatedAt={snap?.updatedAt}
          />
          <KpiTile
            title="Synced"
            icon={ArrowsClockwise}
            badge={{ label: 'RAG', icon: Circuitry }}
            value={snap?.syncPct}
            loading={loading}
            updatedAt={snap?.updatedAt}
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

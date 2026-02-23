import { useMetaEnrichment } from '../../hooks/useMetaEnrichment'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useTick } from '../../hooks/useTick'
import { DocumentTile, PipelineTile } from '../ui'
import type { TileBadge } from '../ui'
import {
  Atom,
  CircleNotch,
  Check,
} from '@phosphor-icons/react'

export function MetaPage() {
  const meta = useMetaEnrichment()
  const paperless = useServiceHealth('paperless')

  // Keep relative timestamps fresh
  useTick(60_000)

  const isCompleted = meta.phase === 'completed'
  const isIdle = meta.phase === 'idle'

  // ── Badge ──
  const badge: TileBadge | undefined = meta.loading
    ? undefined
    : meta.isRunning
      ? { label: 'Enriching', indicator: 'info' }
      : isCompleted
        ? meta.jobSucceeded
          ? { label: 'Complete', indicator: 'success' }
          : { label: 'Error', indicator: 'error' }
        : meta.count === 0
          ? { label: 'All enriched', indicator: 'success' }
          : { label: `${meta.count} pending`, indicator: 'warning' }

  // ── Progress bar ──
  const progressValue = isCompleted ? meta.count : 0
  const progressTotal = meta.count || 0

  // ── Button ──
  const buttonDisabled = meta.isRunning || (isIdle && meta.count === 0)
  const buttonLabel = meta.isRunning
    ? 'Enriching…'
    : isCompleted
      ? 'Continue'
      : 'Start Enrichment'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Error banners */}
      {meta.enrichError && isIdle && (
        <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
          Enrichment failed to start: {meta.enrichError.message}
        </div>
      )}

      {isIdle && !meta.enrichError && !meta.loading && meta.count === 0 && paperless.isStarting && (
        <div role="status" className="rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
          {paperless.message}
        </div>
      )}

      {/* ── Pipeline tile ── */}
      <PipelineTile
        title="Meta Data Tool"
        icon={Atom}
        badge={badge}
        updatedAt={meta.dataUpdatedAt}
        progressValue={progressValue}
        progressTotal={progressTotal}
        actionLabel={buttonLabel}
        actionIcon={meta.isRunning ? CircleNotch : isCompleted ? Check : Atom}
        actionVariant={isCompleted ? 'base-outline' : 'primary-solid'}
        onAction={isCompleted ? meta.acknowledge : meta.startEnrich}
        actionDisabled={buttonDisabled}
        loading={meta.loading}
        active={meta.isRunning || isCompleted}
        docs={meta.docs}
        renderDoc={(doc) => (
          <DocumentTile title={doc.title} documentId={doc.id} />
        )}
        banner={<MetaBanner phase={meta.phase} succeeded={meta.jobSucceeded} output={meta.output} error={meta.error} count={meta.count} />}
        onRefresh={meta.refresh}
        refreshing={meta.isFetching}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetaBanner — feedback banner after enrichment
// ---------------------------------------------------------------------------

function MetaBanner({
  phase,
  succeeded,
  output,
  error,
  count,
}: {
  phase: 'idle' | 'running' | 'completed'
  succeeded: boolean
  output: string | null
  error: string | null
  count: number
}) {
  if (phase === 'idle') return null

  // Running banner
  if (phase === 'running') {
    return (
      <div role="status" className="rounded-lg border border-info-subtle-border-default bg-info-subtle-background-default p-3 text-sm text-info-foreground-default">
        Enrichment in progress…
      </div>
    )
  }

  // Completed — error
  if (!succeeded) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
        <p className="font-medium">Enrichment finished with errors</p>
        {(output || error) && (
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
            {output || error}
          </pre>
        )}
      </div>
    )
  }

  // Completed — success
  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg border border-success-subtle-border-default bg-success-subtle-background-default p-3 text-sm text-success-foreground-default">
      <p>Enrichment complete — {count} document{count !== 1 ? 's' : ''} processed</p>
      {output && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Show output</summary>
          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap">{output}</pre>
        </details>
      )}
    </div>
  )
}

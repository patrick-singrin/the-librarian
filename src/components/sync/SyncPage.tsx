import { ProgressBar } from 'react-aria-components'
import { useSyncStats, useCheckNew, useSync } from '../../hooks/useSyncStatus'
import { Button, Tile, Indicator, Card } from '../ui'
import type { TileBadge } from '../ui'
import { formatRelativeTime } from '../../utils/relativeTime'
import { useTick } from '../../hooks/useTick'
import {
  ChartBar,
  Wrench,
  MagnifyingGlass,
  ArrowsClockwise,
} from '@phosphor-icons/react'

export function SyncPage() {
  const stats = useSyncStats()
  const checkNew = useCheckNew()
  const sync = useSync()

  // Keep relative timestamps fresh
  useTick(60_000)

  const rawPaperless = stats.data?.paperless_documents
  const paperlessDocs = typeof rawPaperless === 'number' ? rawPaperless : null
  const indexedDocs = checkNew.data?.total_indexed ?? null
  const newCount = checkNew.data?.new_count ?? null

  const syncPercent =
    paperlessDocs != null && indexedDocs != null && paperlessDocs > 0
      ? Math.round((indexedDocs / paperlessDocs) * 100)
      : 0

  const embeddingModel = stats.data?.embedding_model ?? null
  const llmModel = stats.data?.llm_model ?? null
  const embeddingAvailable = checkNew.data?.embedding_available ?? false
  const llmAvailable = checkNew.data?.llm_available ?? false

  const newDocs = checkNew.data?.new_documents ?? []
  const isFullySynced = checkNew.data != null && newCount === 0
  const loading = stats.isLoading || checkNew.isLoading

  // Tile header badge — shows sync state at a glance
  const statusBadge: TileBadge | undefined = loading
    ? undefined
    : isFullySynced
      ? { label: 'Synced', indicator: 'success' }
      : newCount != null
        ? { label: `${newCount} missing`, indicator: 'warning' }
        : undefined

  function handleSync() {
    sync.mutate(undefined)
  }

  function handleSyncOne(docId: number) {
    sync.mutate([docId])
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h2 className="text-2xl font-bold text-base-foreground-default">RAG Tool</h2>

      {stats.error && (
        <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
          Unable to load stats: {stats.error.message}
        </div>
      )}

      {/* ── Section 1: Status ── */}
      <Tile title="Status" icon={ChartBar} badge={statusBadge}>
        <div className="flex flex-col gap-4">
          {/* Hero: indexed count + progress */}
          <div className="flex flex-col items-center rounded-lg bg-base-subtle-background-default px-4 py-5">
            <span className="pt-2 pb-1 text-[30px] font-semibold leading-9 text-base-foreground-default">
              {loading ? '…' : (
                <>
                  {indexedDocs?.toLocaleString('en-US')}{' '}
                  <span className="text-base font-normal text-base-subtle-foreground-default">
                    / {paperlessDocs?.toLocaleString('en-US')}
                  </span>
                </>
              )}
            </span>

            {/* Progress bar */}
            <div className="mt-4 w-full">
              <ProgressBar
                value={syncPercent}
                minValue={0}
                maxValue={100}
                aria-label="Sync progress"
                className="flex flex-col gap-1"
              >
                {({ percentage, valueText }) => (
                  <>
                    <div className="flex justify-between text-xs text-base-subtle-foreground-default">
                      <span>Indexed</span>
                      <span>{valueText}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-base-background-default">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFullySynced
                            ? 'bg-success-p-background-default'
                            : 'bg-primary-p-background-default'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </>
                )}
              </ProgressBar>
            </div>

            {/* Last checked */}
            <footer className="mt-3 flex items-center gap-1 text-xs text-base-subtle-foreground-default">
              <span className="font-light">Last checked:</span>
              <span className="font-medium">
                {checkNew.dataUpdatedAt ? formatRelativeTime(checkNew.dataUpdatedAt) : '–'}
              </span>
            </footer>
          </div>

          {/* Model info */}
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-base-subtle-foreground-default">
              <Indicator variant={embeddingAvailable ? 'success' : 'error'} size="xs" />
              <span className="font-light">Embedding:</span>
              <span className="font-medium text-base-foreground-default">{embeddingModel ?? '–'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-base-subtle-foreground-default">
              <Indicator variant={llmAvailable ? 'success' : 'error'} size="xs" />
              <span className="font-light">LLM:</span>
              <span className="font-medium text-base-foreground-default">{llmModel ?? '–'}</span>
            </span>
          </div>
        </div>
      </Tile>

      {/* ── Section 2: Tools ── */}
      <Tile title="Tools" icon={Wrench}>
        <div className="flex flex-col gap-4">
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="base-outline"
              iconLeft={MagnifyingGlass}
              onPress={() => checkNew.refetch()}
              isDisabled={checkNew.isFetching}
            >
              {checkNew.isFetching ? 'Checking…' : 'Check for New'}
            </Button>
            <Button
              variant="primary-solid"
              iconLeft={ArrowsClockwise}
              onPress={handleSync}
              isDisabled={sync.isPending || isFullySynced}
            >
              {sync.isPending ? 'Syncing…' : 'Sync All'}
            </Button>
          </div>

          {/* Sync feedback */}
          {sync.error && (
            <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
              Sync failed: {sync.error.message}
            </div>
          )}

          {sync.data && (
            <div role="status" className="rounded-lg border border-success-subtle-border-default bg-success-subtle-background-default p-3 text-sm text-success-foreground-default">
              {sync.data.message} — {sync.data.indexed_count} indexed, {sync.data.skipped_count} skipped, {sync.data.total_chunks} chunks
            </div>
          )}

          {/* Unindexed documents list */}
          {newDocs.length > 0 && (
            <section aria-label="Unindexed documents">
              <h4 className="mb-2 text-xs font-medium text-base-subtle-foreground-default">
                {newDocs.length} unindexed document{newDocs.length !== 1 ? 's' : ''}
              </h4>
              <ul className="flex flex-col gap-1">
                {newDocs.map((doc) => (
                  <li key={doc.id}>
                    <Card padding="sm" className="flex items-center justify-between !py-2">
                      <span className="text-sm text-base-foreground-default">
                        <span className="font-medium">#{doc.id}</span>
                        <span className="ml-2">{doc.title}</span>
                        <span className="ml-2 text-xs text-base-subtle-foreground-default">
                          {new Date(doc.created).toLocaleDateString('en-US')}
                        </span>
                      </span>
                      <Button
                        variant="base-outline"
                        size="sm"
                        onPress={() => handleSyncOne(doc.id)}
                        isDisabled={sync.isPending}
                      >
                        Sync
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {checkNew.data && newDocs.length === 0 && (
            <p role="status" className="text-sm text-base-subtle-foreground-default">
              All documents are indexed.
            </p>
          )}
        </div>
      </Tile>
    </div>
  )
}

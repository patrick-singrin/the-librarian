import { useState } from 'react'
import { ProgressBar } from 'react-aria-components'
import { useSpaces, useSyncStats, useCheckNew, useSync } from '../../hooks/useSyncStatus'
import { Badge, Button, Tile, Indicator, Card, Select, SelectItem } from '../ui'
import type { TileBadge } from '../ui'
import { formatRelativeTime } from '../../utils/relativeTime'
import { useTick } from '../../hooks/useTick'
import {
  ChartBar,
  Wrench,
  MagnifyingGlass,
  ArrowsClockwise,
  Info,
  Database,
} from '@phosphor-icons/react'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { SpacesTile } from './SpacesTile'

const ALL_SPACES_KEY = '__all__'

export function SyncPage() {
  const [selectedSpace, setSelectedSpace] = useState<string>(ALL_SPACES_KEY)
  const spaceId = selectedSpace === ALL_SPACES_KEY ? undefined : selectedSpace

  const spaces = useSpaces()
  const stats = useSyncStats(spaceId)
  const checkNew = useCheckNew(spaceId)
  const sync = useSync()
  const rag = useServiceHealth('rag')

  // Keep relative timestamps fresh
  useTick(60_000)

  const totalDocs = checkNew.data?.total_in_paperless ?? null
  const totalIndexed = checkNew.data?.total_indexed ?? null
  const newCount = checkNew.data?.new_count ?? null

  const syncPercent =
    totalDocs != null && totalIndexed != null && totalDocs > 0
      ? Math.round((totalIndexed / totalDocs) * 100)
      : 0

  const embeddingModel = stats.data?.embedding_model ?? null
  const llmModel = stats.data?.llm_model ?? null
  const embeddingAvailable = checkNew.data?.embedding_available ?? false
  const llmAvailable = checkNew.data?.llm_available ?? false

  const unassignedCount = checkNew.data?.unassigned_count ?? 0

  const newDocs = checkNew.data?.new_documents ?? []
  const isFullySynced = checkNew.data != null && newCount === 0
  const loading = stats.isLoading || checkNew.isLoading
  const spacesList = spaces.data ?? []
  const hasSpaces = spacesList.length > 0

  // Tile header badge — shows sync state at a glance
  const statusBadge: TileBadge | undefined = loading
    ? undefined
    : isFullySynced
      ? { label: 'Synced', indicator: 'success' }
      : newCount != null
        ? { label: `${newCount} missing`, indicator: 'warning' }
        : undefined

  function handleSync() {
    sync.mutate({ spaceId })
  }

  function handleSyncOne(docId: number) {
    sync.mutate({ docIds: [docId], spaceId })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header with space selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-base-foreground-default">RAG Tool</h2>
        {hasSpaces && (
          <Select
            aria-label="Select space"
            selectedKey={selectedSpace}
            onSelectionChange={(key) => setSelectedSpace(key as string)}
          >
            <SelectItem id={ALL_SPACES_KEY} textValue="All Spaces">
              All Spaces
            </SelectItem>
            {spacesList.map((s) => (
              <SelectItem key={s.slug} id={s.slug} textValue={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </Select>
        )}
      </div>

      {stats.error && (
        rag.isStarting ? (
          <div role="status" className="rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
            {rag.message}
          </div>
        ) : (
          <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
            Unable to load stats: {stats.error.message}
          </div>
        )
      )}

      {/* ── Section 1: Status ── */}
      <Tile title="Status" icon={ChartBar} badge={statusBadge}>
        <div className="flex flex-col gap-4">
          {/* Hero: indexed count + progress */}
          <div className="flex flex-col items-center rounded-lg bg-base-subtle-background-default px-4 py-5">
            <span className="pt-2 pb-1 text-[30px] font-semibold leading-9 text-base-foreground-default">
              {loading ? '…' : (
                <>
                  {totalIndexed?.toLocaleString('en-US')}{' '}
                  <span className="text-base font-normal text-base-subtle-foreground-default">
                    / {totalDocs?.toLocaleString('en-US')}
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

            {/* Info note + last checked */}
            <footer className="mt-3 flex flex-col items-center gap-1">
              {!spaceId && hasSpaces && (
                <span className="text-[11px] text-base-subtle-foreground-default">
                  Only documents assigned to a space are indexed
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-base-subtle-foreground-default">
                <span className="font-light">Last checked:</span>
                <span className="font-medium">
                  {checkNew.dataUpdatedAt ? formatRelativeTime(checkNew.dataUpdatedAt) : '–'}
                </span>
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

          {/* Unassigned documents hint */}
          {!loading && hasSpaces && !spaceId && unassignedCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-base-border-default bg-base-subtle-background-default px-3 py-2.5">
              <Info size={16} weight="regular" className="mt-px shrink-0 text-base-subtle-foreground-default" />
              <span className="text-xs text-base-subtle-foreground-default">
                <span className="font-medium text-base-foreground-default">{unassignedCount.toLocaleString('en-US')}</span>
                {' '}document{unassignedCount !== 1 ? 's' : ''} in Paperless without a RAG space — these are not indexed.
              </span>
            </div>
          )}
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
              {sync.data.message} — {sync.data.indexed_count} indexed, {sync.data.total_chunks} chunks
            </div>
          )}

          {/* Unindexed documents list (capped at 10) */}
          {newDocs.length > 0 && (
            <section aria-label="Unindexed documents">
              <h4 className="mb-2 text-xs font-medium text-base-subtle-foreground-default">
                {newDocs.length} unindexed document{newDocs.length !== 1 ? 's' : ''}
              </h4>
              <ul className="flex flex-col gap-1">
                {newDocs.slice(0, 10).map((doc) => (
                  <li key={doc.id}>
                    <Card padding="sm" className="flex items-center gap-3 !py-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-base-foreground-default">
                        <span className="font-medium">#{doc.id}</span>
                        <span className="ml-2">{doc.title}</span>
                        <span className="ml-2 text-xs text-base-subtle-foreground-default">
                          {new Date(doc.created).toLocaleDateString('en-US')}
                        </span>
                      </span>
                      {doc.spaces.length > 0 && (
                        <span className="flex shrink-0 gap-1">
                          {doc.spaces.map((slug) => (
                            <Badge key={slug} variant="primary" type="outline" size="xs" icon={Database}>
                              {spacesList.find((s) => s.slug === slug)?.name ?? slug}
                            </Badge>
                          ))}
                        </span>
                      )}
                      <Button
                        variant="base-outline"
                        size="sm"
                        onPress={() => handleSyncOne(doc.id)}
                        isDisabled={sync.isPending}
                        className="shrink-0"
                      >
                        Sync
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
              {newDocs.length > 10 && (
                <p className="mt-2 text-xs text-base-subtle-foreground-default">
                  and {newDocs.length - 10} more — use Sync All to index everything at once.
                </p>
              )}
            </section>
          )}

          {checkNew.data && newDocs.length === 0 && (
            <p role="status" className="text-sm text-base-subtle-foreground-default">
              All documents are indexed.
            </p>
          )}
        </div>
      </Tile>

      {/* ── Section 3: Spaces ── */}
      <SpacesTile />
    </div>
  )
}

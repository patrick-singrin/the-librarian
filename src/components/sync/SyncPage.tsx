import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Database,
  Info,
  Plus,
  Scribble,
  CircleNotch,
} from '@phosphor-icons/react'
import { useSpacesOverview, useCheckNew } from '../../hooks/useSyncStatus'
import { useSyncStream, type SyncPhase } from '../../hooks/useSyncStream'
import { useSyncAcknowledge } from '../../hooks/useSyncAcknowledge'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { Button, Dialog, DocumentTile, Indicator, PipelineTile, SpaceTile } from '../ui'
import type { TileBadge } from '../ui'
import type { DocSyncStatus } from '../ui/DocumentTile'
import { SpacesTile } from './SpacesTile'

export function SyncPage() {
  const [showModelInfo, setShowModelInfo] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isManualCheck, setIsManualCheck] = useState(false)

  // Sync stream state
  const stream = useSyncStream()

  // Pause polling while streaming or showing completion (avoid races with RAG API settling)
  const paused = stream.phase !== 'idle'

  const spacesOverview = useSpacesOverview(paused)
  const checkNew = useCheckNew(undefined, paused)
  const rag = useServiceHealth('rag')

  const spacesList = useMemo(() => spacesOverview.data?.spaces ?? [], [spacesOverview.data?.spaces])

  const newCount = checkNew.data?.new_count ?? 0
  const newDocs = useMemo(() => checkNew.data?.new_documents ?? [], [checkNew.data?.new_documents])
  const isFullySynced = checkNew.data != null && newCount === 0 && stream.phase !== 'completed'
  const loading = checkNew.isLoading

  const embeddingModel = checkNew.data?.embedding_model ?? null
  const embeddingAvailable = checkNew.data?.embedding_available ?? false

  // Check for running sync on mount (navigation-away case)
  useEffect(() => {
    stream.checkRunningSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Section 1: Space tile data ──────────────────────────────────────────
  // During streaming, add deltas from the stream to the cached overview stats
  const liveSpaceData = useMemo(() => {
    return spacesList.map((entry) => {
      const delta = stream.indexedBySpace.get(entry.slug) ?? 0
      return {
        space: { slug: entry.slug, name: entry.name },
        indexed: entry.indexed + delta,
        total: entry.total,
      }
    })
  }, [spacesList, stream.indexedBySpace])

  // ── Section 3: Progress bar values ──────────────────────────────────────
  const progressValue = stream.phase === 'idle'
    ? 0
    : stream.indexedCount + stream.failedCount

  const progressTotal = stream.phase === 'idle'
    ? newCount
    : stream.total

  // ── Section 3: RAG Ingest Tool badge ────────────────────────────────────
  const toolBadge: TileBadge | undefined = (() => {
    if (loading) return undefined
    if (stream.phase === 'streaming') return { label: 'Ingesting', indicator: 'info' as const }
    if (stream.phase === 'completed') {
      if (stream.error || (stream.result && stream.result.failed_count > 0)) {
        return { label: 'Warning', indicator: 'warning' as const }
      }
      return { label: 'Synced', indicator: 'success' as const }
    }
    if (isFullySynced) return { label: 'Synced', indicator: 'success' as const }
    if (newCount > 0) return { label: 'Pending', indicator: 'warning' as const }
    return undefined
  })()

  // ── Section 3: Button state ─────────────────────────────────────────────
  const isCompleted = stream.phase === 'completed'
  const buttonDisabled = stream.isStreaming || (stream.phase === 'idle' && newCount === 0)
  const buttonLabel = stream.isStreaming
    ? 'Ingesting…'
    : isCompleted
      ? 'Continue'
      : 'Start Ingestion'

  // ── Section 3: Pipeline — build the doc list ────────────────────────────
  // During streaming, we use the stream's doc list (with live status)
  // During idle, we use checkNew's new_documents
  const pipelineDocs = useMemo(() => {
    if (stream.phase !== 'idle' && stream.docs.length > 0) {
      return stream.docs.map((d) => ({
        id: d.doc_id,
        title: d.title,
        spaces: d.spaces,
        syncStatus: d.status as DocSyncStatus,
        reason: d.reason,
      }))
    }
    return newDocs.map((d) => ({
      id: d.id,
      title: d.title,
      spaces: d.spaces,
      syncStatus: undefined as DocSyncStatus | undefined,
      reason: undefined as string | undefined,
    }))
  }, [stream.phase, stream.docs, newDocs])

  function handleSync() {
    stream.startSync()
  }

  function handleManualCheck() {
    setIsManualCheck(true)
    checkNew.refetch().finally(() => setIsManualCheck(false))
  }

  // Derive the "checking" visual state — only true for user-initiated checks
  const isCheckingNew = isManualCheck && checkNew.isFetching

  // Optimistically patch the cache when the user acknowledges a completed sync
  const handleAcknowledge = useSyncAcknowledge({
    indexedBySpace: stream.indexedBySpace,
    indexedCount: stream.indexedCount,
    reset: stream.reset,
  })

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1: Spaces — edge-to-edge white background ── */}
      <div className="-mx-6 -mt-6 bg-base-background-default px-6 pb-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-base-foreground-default">
            Spaces
            <span className="text-xl font-light text-base-foreground-default">
              ({spacesList.length})
            </span>
          </h2>
          <Button
            variant="primary-outline"
            size="sm"
            iconLeft={Plus}
            onPress={() => setDialogOpen(true)}
          >
            Add new Space
          </Button>
        </div>

        {/* Space tiles — horizontal scroll */}
        {spacesList.length > 0 && (
          <div className="mt-4 flex gap-4 overflow-x-auto">
            {liveSpaceData.map(({ space, indexed, total }) => {
              const synced = total > 0 && indexed >= total
              const isSyncing = stream.isStreaming && (stream.indexedBySpace.get(space.slug) ?? 0) > 0

              const badge: TileBadge = isSyncing
                ? { label: 'Ingesting', indicator: 'info' }
                : synced
                  ? { label: 'Synced', indicator: 'success' }
                  : { label: 'Pending', indicator: 'warning' }

              return (
                <SpaceTile
                  key={space.slug}
                  title={space.name}
                  subtitle={space.slug}
                  badge={badge}
                  indexed={indexed}
                  total={total}
                  onOpenSpace={() => {}}
                  className="w-[336px] shrink-0"
                />
              )
            })}
          </div>
        )}

        {spacesList.length === 0 && !spacesOverview.isLoading && (
          <p className="mt-4 text-sm text-base-subtle-foreground-default">
            No spaces defined yet. Create one to start indexing documents.
          </p>
        )}
      </div>

      {/* Create Space Dialog */}
      <Dialog isOpen={dialogOpen} onOpenChange={setDialogOpen} title="New Space">
        <SpacesTile
          renderMode="bare"
          formOpen={dialogOpen}
          onFormClose={() => setDialogOpen(false)}
          hideAddButton
        />
      </Dialog>

      {/* ── Section 2: Embedding Model Banner ── */}
      {embeddingModel && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary-subtle-border-default bg-primary-subtle-background-default px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Database size={16} weight="regular" className="shrink-0 text-primary-foreground-default" />
            <span className="flex-1 text-xs text-base-subtle-foreground-default">
              <span className="font-medium text-base-foreground-default">Required embedding model:</span>
              {' '}{embeddingModel}
              {' — '}
              <Indicator variant={embeddingAvailable ? 'success' : 'error'} size="xs" className="inline-block align-middle" />
              {' '}
              <span className={embeddingAvailable ? 'text-success-foreground-default' : 'text-error-foreground-default'}>
                {embeddingAvailable ? 'Available' : 'Not available'}
              </span>
            </span>
            <Button
              variant="base-outline"
              size="sm"
              iconLeft={Info}
              onPress={() => setShowModelInfo(!showModelInfo)}
              className="shrink-0"
              aria-label="More info about embedding model"
              aria-expanded={showModelInfo}
            />
          </div>
          {showModelInfo && (
            <div className="rounded border border-primary-subtle-border-default bg-base-background-default px-3 py-2 text-xs leading-relaxed text-base-subtle-foreground-default">
              <p>
                The embedding model converts documents into numeric vectors for semantic search.
                <span className="font-medium text-base-foreground-default"> You must use the same model for ingesting and searching</span>
                {' '}— vectors from different models are mathematically incompatible.
              </p>
              <p className="mt-1.5">
                Currently this model is loaded locally by the RAG API via HuggingFace (SentenceTransformer).
                It is <span className="font-medium text-base-foreground-default">not</span> provided by LM Studio.
                Changing the model requires re-ingesting all documents in every space.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error — only for genuine unexpected failures (RAG claims healthy but call failed) */}
      {stream.phase === 'idle' && checkNew.error && !rag.isDown && !rag.isStarting && (
        <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
          Unable to load stats: {checkNew.error.message}
        </div>
      )}

      {/* ── Section 3: RAG Ingest Tool ── */}
      <PipelineTile
        title="RAG Ingest Tool"
        icon={Database}
        badge={toolBadge}
        progressValue={progressValue}
        progressTotal={progressTotal}
        actionLabel={buttonLabel}
        actionIcon={stream.isStreaming ? CircleNotch : isCompleted ? Check : Scribble}
        actionVariant={isCompleted ? 'base-outline' : 'primary-solid'}
        onAction={isCompleted ? handleAcknowledge : handleSync}
        actionDisabled={buttonDisabled}
        loading={loading}
        active={stream.phase !== 'idle'}
        docs={pipelineDocs}
        renderDoc={(doc) => (
          <DocumentTile
            title={doc.title}
            documentId={doc.id}
            spaceName={doc.spaces[0] ? (spacesList.find((s) => s.slug === doc.spaces[0])?.name ?? doc.spaces[0]) : undefined}
            syncStatus={doc.syncStatus}
            reason={doc.reason}
          />
        )}
        banner={<SyncBanner phase={stream.phase} stream={stream} />}
        onRefresh={handleManualCheck}
        refreshing={isCheckingNew}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sync feedback banner (shown between progress bar and pipeline)
// ---------------------------------------------------------------------------

function SyncBanner({
  phase,
  stream,
}: {
  phase: SyncPhase
  stream: { result: { indexed_count: number; failed_count: number; total_chunks: number } | null; error: string | null }
}) {
  if (phase !== 'completed') return null

  // Error banner
  if (stream.error) {
    return (
      <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
        Sync failed: {stream.error}
      </div>
    )
  }

  // Success / warning banner
  if (stream.result) {
    const hasFailures = stream.result.failed_count > 0
    return (
      <div
        role="status"
        className={`rounded-lg border p-3 text-sm ${
          hasFailures
            ? 'border-warning-subtle-border-default bg-warning-subtle-background-default text-warning-foreground-default'
            : 'border-success-subtle-border-default bg-success-subtle-background-default text-success-foreground-default'
        }`}
      >
        Sync complete — {stream.result.indexed_count} indexed, {stream.result.total_chunks} chunks
        {hasFailures && `, ${stream.result.failed_count} failed`}
      </div>
    )
  }

  return null
}

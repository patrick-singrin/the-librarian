import { useState, type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from './Button'
import type { ButtonVariant } from './Button'
import { ProgressBar } from './ProgressBar'
import { Tile } from './Tile'
import type { TileBadge } from './Tile'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal document shape — callers extend with extra fields for renderDoc. */
interface PipelineItem {
  id: number
}

interface PipelineTileProps<D extends PipelineItem = PipelineItem> {
  // ── Tile wrapper ──
  title: string
  icon: ComponentType<PhosphorIconProps>
  badge?: TileBadge
  updatedAt?: number | Date | null

  // ── Progress row ──
  progressValue: number
  progressTotal: number
  progressLabel?: string

  // ── Action button ──
  actionLabel: string
  actionIcon: ComponentType<PhosphorIconProps>
  actionVariant?: ButtonVariant
  onAction: () => void
  actionDisabled?: boolean

  // ── Pipeline ──
  loading?: boolean
  /**
   * When true the pipeline is actively processing (streaming / running).
   * All docs are shown in a scrollable container without a collapse toggle.
   * When false (queued / idle) the list is truncated to 10 with expand/collapse.
   */
  active?: boolean
  docs: D[]
  /** Render slot for each document. The component provides the `<li>` wrapper. */
  renderDoc: (doc: D) => ReactNode

  // ── Empty state ──
  emptyLabel?: string
  onRefresh?: () => void
  refreshing?: boolean

  // ── Slots ──
  /** Banner between the progress row and the pipeline container (e.g. SyncBanner, MetaBanner). */
  banner?: ReactNode
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREVIEW_LIMIT = 10

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PipelineTile — shared layout for document-processing pipelines.
 *
 * Encapsulates the recurring pattern used by both the RAG Ingest Tool and
 * the Meta Data Tool: a Tile wrapper with a progress row, an action button,
 * an optional feedback banner, and a collapsible document list with loading
 * and empty states.
 *
 * Each caller provides domain-specific data via props and the `renderDoc` slot.
 */
function PipelineTile<D extends PipelineItem>({
  // Tile
  title,
  icon,
  badge,
  updatedAt,
  // Progress
  progressValue,
  progressTotal,
  progressLabel = 'Processed',
  // Action
  actionLabel,
  actionIcon,
  actionVariant = 'primary-solid',
  onAction,
  actionDisabled = false,
  // Pipeline
  loading = false,
  active = false,
  docs,
  renderDoc,
  // Empty
  emptyLabel = 'There are no documents in the queue',
  onRefresh,
  refreshing = false,
  // Slots
  banner,
}: PipelineTileProps<D>) {
  const [expanded, setExpanded] = useState(false)

  const hasDocs = docs.length > 0
  const hiddenCount = docs.length - PREVIEW_LIMIT

  // When active (streaming/running): show all docs in scrollable container.
  // When queued (idle with docs): collapsible preview of first 10.
  const showAll = active || expanded
  const visibleDocs = showAll ? docs : docs.slice(0, PREVIEW_LIMIT)
  const collapsible = !active && hiddenCount > 0

  return (
    <Tile title={title} icon={icon} badge={badge} updatedAt={updatedAt}>
      <div className="flex flex-col gap-4">
        {/* ── Progress + Action row ── */}
        <div className="flex items-center gap-8">
          <ProgressBar
            label={progressLabel}
            value={progressValue}
            total={progressTotal}
            className="flex-1"
          />
          <Button
            variant={actionVariant}
            size="sm"
            iconLeft={actionIcon}
            onPress={onAction}
            isDisabled={actionDisabled}
          >
            {actionLabel}
          </Button>
        </div>

        {/* ── Banner slot ── */}
        {banner}

        {/* ── Pipeline container ── */}
        <div className="rounded-md bg-base-subtle-background-default p-4">
          {/* Loading */}
          {loading && !hasDocs && (
            <div className="flex items-center justify-center py-6">
              <p className="text-sm text-base-subtle-foreground-default">Loading…</p>
            </div>
          )}

          {/* Document list */}
          {hasDocs && (
            <div className="flex flex-col gap-2.5">
              <ul className={`flex flex-col gap-2.5 ${showAll ? 'max-h-[480px] overflow-y-auto' : ''}`}>
                {visibleDocs.map((doc) => (
                  <li key={doc.id}>
                    {renderDoc(doc)}
                  </li>
                ))}
              </ul>
              {collapsible && (
                <Button
                  variant="primary-ghost"
                  size="sm"
                  onPress={() => setExpanded((v) => !v)}
                  className="self-center"
                >
                  {expanded ? 'Show less' : `Show all ${docs.length} documents`}
                </Button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasDocs && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm font-medium text-base-foreground-default">
                {emptyLabel}
              </p>
              {onRefresh && (
                <Button
                  variant="base-outline"
                  size="sm"
                  iconLeft={ArrowsClockwise}
                  onPress={onRefresh}
                  isDisabled={refreshing}
                >
                  {refreshing ? 'Checking…' : 'Check for new documents'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Tile>
  )
}

export { PipelineTile }
export type { PipelineTileProps, PipelineItem }

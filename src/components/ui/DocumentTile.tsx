import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { FileText, Database, CircleNotch, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react'
import { Tile, type TileBadge } from './Tile'

export type DocSyncStatus = 'pending' | 'processing' | 'success' | 'skipped' | 'error'

interface DocumentTileProps {
  /** Document title */
  title: string
  /** Document ID shown as subtitle (e.g., "#1234") */
  documentId?: string | number
  /** Optional Phosphor icon (defaults to FileText) */
  icon?: ComponentType<PhosphorIconProps>
  /** Space slug displayed in the primary badge */
  spaceName?: string
  /** Live sync status — shows spinner/check/error icon when set */
  syncStatus?: DocSyncStatus
  /** Machine-readable reason for skip/failure from RAG API */
  reason?: string
  className?: string
}

const statusIcons: Record<DocSyncStatus, ComponentType<PhosphorIconProps> | null> = {
  pending: null,
  processing: CircleNotch,
  success: CheckCircle,
  skipped: WarningCircle,
  error: XCircle,
}

const statusClasses: Record<DocSyncStatus, string> = {
  pending: '',
  processing: 'text-primary-foreground-default animate-spin',
  success: 'text-success-foreground-default',
  skipped: 'text-warning-foreground-default',
  error: 'text-error-foreground-default',
}

const statusLabels: Record<DocSyncStatus, string> = {
  pending: 'Queued',
  processing: 'Indexing…',
  success: 'Indexed',
  skipped: 'Skipped',
  error: 'Failed',
}

const reasonLabels: Record<string, string> = {
  already_exists: 'Already indexed',
  no_spaces_assigned: 'No space assigned',
  no_text_extracted: 'No text could be extracted',
}

/**
 * DocumentTile — header-only card for displaying a document entry.
 *
 * Matches Figma `document-tile` component (node 3791:1585).
 *
 * Shows document icon + title + ID subtitle, with an optional primary-outline
 * badge displaying the space slug and a Database icon.
 *
 * When `syncStatus` is set, an additional status icon is shown after the title.
 */
export function DocumentTile({
  title,
  documentId,
  icon = FileText,
  spaceName,
  syncStatus,
  reason,
  className = '',
}: DocumentTileProps) {
  const subtitle = documentId != null ? `#${documentId}` : undefined

  const badge: TileBadge | undefined = spaceName
    ? {
        label: spaceName,
        variant: 'primary',
        type: 'outline',
        icon: Database,
      }
    : undefined

  const StatusIcon = syncStatus ? statusIcons[syncStatus] : null
  const reasonText = reason ? reasonLabels[reason] ?? reason : null

  return (
    <Tile title={title} subtitle={subtitle} icon={icon} badge={badge} className={className}>
      {syncStatus && (
        <div className="flex items-center gap-1.5 -mt-2">
          {StatusIcon && <StatusIcon size={14} weight="fill" className={statusClasses[syncStatus]} />}
          <span className={`text-xs ${syncStatus === 'error' ? 'text-error-foreground-default' : 'text-base-subtle-foreground-default'}`}>
            {statusLabels[syncStatus]}{reasonText ? ` \u2014 ${reasonText}` : ''}
          </span>
        </div>
      )}
    </Tile>
  )
}

export type { DocumentTileProps }

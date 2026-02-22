import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { CaretRight } from '@phosphor-icons/react'
import { Tile, type TileBadge } from './Tile'
import { ProgressBar } from './ProgressBar'
import { Button } from './Button'

interface SpaceTileProps {
  /** Space display name */
  title: string
  /** Slug shown as subtitle */
  subtitle?: string
  /** Optional Phosphor icon for the head row */
  icon?: ComponentType<PhosphorIconProps>
  /** Optional badge config for the head row */
  badge?: TileBadge
  /** Number of indexed documents */
  indexed: number
  /** Total documents in space */
  total: number
  /** Callback when "Open Space" is pressed */
  onOpenSpace?: () => void
  className?: string
}

/**
 * SpaceTile — Tile + progress bar + CTA footer.
 *
 * Matches Figma `space-tile` component (node 3778:3289).
 *
 * Shows a progress bar directly below the header, and an "Open Space"
 * button in a grey footer bar at the bottom edge of the card.
 */
export function SpaceTile({
  title,
  subtitle,
  icon,
  badge,
  indexed,
  total,
  onOpenSpace,
  className = '',
}: SpaceTileProps) {
  return (
    <Tile title={title} subtitle={subtitle} icon={icon} badge={badge} className={className}>
      {/* Progress bar — directly below header */}
      <ProgressBar label="Processed" value={indexed} total={total} />

      {/* CTA footer — grey bar at bottom edge of card */}
      {onOpenSpace && (
        <div className="-mx-4 -mb-4 mt-4 flex items-center justify-end rounded-b-md bg-base-subtle-background-default px-4 py-2">
          <Button variant="base-ghost" size="sm" iconLeft={CaretRight} onPress={onOpenSpace}>
            Open Space
          </Button>
        </div>
      )}
    </Tile>
  )
}

export type { SpaceTileProps }

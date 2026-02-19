import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { CaretRight } from '@phosphor-icons/react'
import { ProgressBar } from 'react-aria-components'
import { Tile, type TileBadge } from './Tile'
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
 * SpaceTile — Tile + .slot-element-space slot.
 *
 * Composes the base Tile (with optional subtitle) and a space sync-status slot
 * showing indexed/total fraction, a progress bar, and an action button.
 *
 * Matches Figma `space-tile` component (node 3778:3289).
 *
 * Progress bar color:
 *   - info (teal) when partially synced
 *   - success (green) when fully synced (indexed === total)
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
  const percent = total > 0 ? Math.round((indexed / total) * 100) : 0
  const isSynced = total > 0 && indexed >= total

  return (
    <Tile title={title} subtitle={subtitle} icon={icon} badge={badge} className={className}>
      {/* ── .slot-element-space ── */}
      <div className="flex flex-col gap-2 rounded-md bg-base-subtle-background-default p-2">
        {/* Value: indexed / total */}
        <div className="flex w-full items-center justify-center px-0 pt-6 pb-4">
          <span className="text-center text-[30px] leading-9 text-base-foreground-default">
            <span className="font-semibold">{indexed.toLocaleString('en-US')}</span>
            <span className="font-light">/</span>
            <span className="font-light">{total.toLocaleString('en-US')}</span>
          </span>
        </div>

        {/* Progress bar (React Aria) */}
        <ProgressBar
          value={percent}
          minValue={0}
          maxValue={100}
          aria-label="Indexing progress"
          className="flex flex-col gap-1"
        >
          {({ percentage, valueText }) => (
            <>
              <div className="flex justify-between text-xs text-base-subtle-foreground-default">
                <span>Indexed</span>
                <span>{valueText}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-background-default">
                <div
                  className={`h-full rounded-full transition-all ${
                    isSynced
                      ? 'bg-success-p-background-default'
                      : 'bg-info-p-background-default'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </>
          )}
        </ProgressBar>
      </div>

      {/* Action button */}
      {onOpenSpace && (
        <div className="mt-2 flex justify-end">
          <Button variant="base-outline" size="sm" iconRight={CaretRight} onPress={onOpenSpace}>
            Open Space
          </Button>
        </div>
      )}
    </Tile>
  )
}

export type { SpaceTileProps }

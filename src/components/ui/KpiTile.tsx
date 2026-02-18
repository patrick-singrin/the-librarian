import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Tile, type TileBadge } from './Tile'
import { formatRelativeTime } from '../../utils/relativeTime'

interface KpiTileProps {
  /** Tile heading */
  title: string
  /** Big number or text */
  value: number | string | null | undefined
  /** Loading state */
  loading?: boolean
  /** Optional Phosphor icon for the head row */
  icon?: ComponentType<PhosphorIconProps>
  /** Optional badge config for the head row */
  badge?: TileBadge
  /** Timestamp for "Last Updated" (epoch ms or Date) */
  updatedAt?: number | Date | null
  /** Optional description shown as a tooltip on the value */
  description?: string
  className?: string
}

function formatValue(value: number | string | null | undefined): string {
  if (value == null) return '\u2013'
  if (typeof value === 'number') return value.toLocaleString('en-US')
  return value
}

/**
 * KpiTile — Tile + .slot-element-kpi slot.
 *
 * Composes the base Tile with a centered KPI value display.
 * "Last Update" row lives inside the grey slot area (matching Figma).
 */
export function KpiTile({
  title,
  value,
  loading = false,
  icon,
  badge,
  updatedAt,
  description,
  className = '',
}: KpiTileProps) {
  return (
    <Tile title={title} icon={icon} badge={badge} className={className}>
      <div className="flex flex-col items-start gap-2 rounded-md bg-base-subtle-background-default p-2">
        {/* Value */}
        <div className="flex w-full items-center justify-center px-0 pt-6 pb-4">
          <span
            className="text-center text-[30px] font-semibold leading-9 text-base-foreground-default"
            title={description}
          >
            {loading && value == null ? '\u2026' : formatValue(value)}
          </span>
        </div>

        {/* Last Update row */}
        {updatedAt != null && (
          <div className="flex w-full items-center justify-center gap-1 text-xs text-base-subtle-foreground-default">
            <span className="font-light">Last Update:</span>
            <span className="font-medium">{formatRelativeTime(updatedAt)}</span>
          </div>
        )}
      </div>
    </Tile>
  )
}

export type { KpiTileProps }

import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Tile, type TileBadge } from './Tile'
import { formatRelativeTime } from '../../utils/relativeTime'
import { useTick } from '../../hooks/useTick'

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
 * Composes the base Tile with a centered KPI value display
 * and optional "Last Update" timestamp footer.
 */
export function KpiTile({
  title,
  value,
  loading = false,
  icon,
  badge,
  updatedAt,
  className = '',
}: KpiTileProps) {
  // Re-render every 60 s so the relative timestamp stays fresh
  useTick(60_000)

  return (
    <Tile title={title} icon={icon} badge={badge} className={className}>
      <div className="flex flex-col items-center rounded-lg bg-base-subtle-background-default px-2 py-2">
        <span className="pt-6 pb-4 text-[30px] font-semibold leading-9 text-base-foreground-default">
          {loading ? '\u2026' : formatValue(value)}
        </span>

        <footer className="flex items-center gap-1 pt-2 text-xs text-base-subtle-foreground-default">
          <span className="font-light">Last Update:</span>
          <span className="font-medium">{updatedAt != null ? formatRelativeTime(updatedAt) : 'None'}</span>
        </footer>
      </div>
    </Tile>
  )
}

export type { KpiTileProps }

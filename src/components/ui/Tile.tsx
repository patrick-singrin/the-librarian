import { type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Badge } from './Badge'
import { Icon } from './Icon'
import type { IndicatorVariant } from './Indicator'
import { formatRelativeTime } from '../../utils/relativeTime'

interface TileBadge {
  label: string
  indicator?: IndicatorVariant
  icon?: ComponentType<PhosphorIconProps>
}

interface TileProps {
  /** Tile heading */
  title: string
  /** Optional Phosphor icon for the head row */
  icon?: ComponentType<PhosphorIconProps>
  /** Optional badge config for the head row */
  badge?: TileBadge
  /** Slot content */
  children: ReactNode
  /** Optional "Last updated" timestamp (epoch ms or Date) shown at the bottom */
  updatedAt?: number | Date | null
  className?: string
}

/**
 * Tile — base container matching Figma `.tile` component.
 *
 * White card with slate border, 6 px radius, 16 px padding.
 * Head row: optional icon + title + optional badge.
 * Children fill the slot area below the head.
 */
export function Tile({
  title,
  icon: TileIcon,
  badge,
  children,
  updatedAt,
  className = '',
}: TileProps) {
  return (
    <article
      className={`rounded-md border border-base-subtle-border-default bg-base-background-default p-4 shadow-xs ${className}`}
    >
      {/* ── Head row ── */}
      <header className="flex h-6 items-center justify-between">
        <div className="flex items-center gap-2">
          {TileIcon && (
            <Icon icon={TileIcon} size="md" className="text-base-foreground-default" />
          )}
          <h3 className="text-sm font-medium text-base-foreground-default">{title}</h3>
        </div>
        {badge && (
          <Badge variant="base" type="outline" size="xs" indicator={badge.indicator} icon={badge.icon}>
            {badge.label}
          </Badge>
        )}
      </header>

      {/* ── Slot ── */}
      <div className="mt-4">
        {children}
      </div>

      {/* ── Footer: last updated ── */}
      {updatedAt != null && (
        <footer className="mt-3 flex items-center justify-end gap-1 text-xs text-base-subtle-foreground-default">
          <span className="font-light">Last updated:</span>
          <span className="font-medium">{formatRelativeTime(updatedAt)}</span>
        </footer>
      )}
    </article>
  )
}

export type { TileProps, TileBadge }

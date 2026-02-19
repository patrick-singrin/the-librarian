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
  /** Optional secondary line below the title (.tile-head Subline=true) */
  subtitle?: string
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
 * Head row (.tile-head): optional icon + title + optional subtitle + optional badge.
 * Two header modes:
 *   - Subline=false (no subtitle): single-line, h-6, items-center
 *   - Subline=true (with subtitle): two-line, icon aligned to top
 * Children fill the slot area below the head.
 */
export function Tile({
  title,
  subtitle,
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
      {/* ── Head row (.tile-head) ── */}
      <header className={`flex justify-between ${subtitle ? 'items-start' : 'h-6 items-center'}`}>
        <div className={`flex gap-2 ${subtitle ? 'items-start' : 'items-center'}`}>
          {TileIcon && (
            <Icon icon={TileIcon} size="md" className="mt-px text-base-foreground-default" />
          )}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium leading-5 text-base-foreground-default">{title}</h3>
            {subtitle && (
              <p className="text-sm font-light leading-5 text-base-foreground-default">{subtitle}</p>
            )}
          </div>
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

import { type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Indicator, type IndicatorVariant } from './Indicator'
import { Icon, type IconSize } from './Icon'

type BadgeVariant = 'base' | 'primary' | 'success' | 'warning' | 'error' | 'info'
type BadgeType = 'solid' | 'outline'
type BadgeSize = 'sm' | 'xs'

interface BadgeProps {
  /** Semantic color role */
  variant?: BadgeVariant
  /** Visual style — filled or bordered */
  type?: BadgeType
  /** Size preset */
  size?: BadgeSize
  /** Indicator dot variant (independent of badge variant) */
  indicator?: IndicatorVariant
  /** Optional Phosphor icon component */
  icon?: ComponentType<PhosphorIconProps>
  /** Text label */
  children: ReactNode
  className?: string
}

/*
 * Semantic token mapping — 6 roles × 2 visual types:
 *
 * solid   → {role}/p-background + {role}/p-foreground   (filled pill)
 * outline → {role}/subtle-background + {role}/subtle-border + {role}/foreground (bordered pill)
 */

const solidClasses: Record<BadgeVariant, string> = {
  base: 'bg-base-p-background-default text-base-p-foreground-default',
  primary: 'bg-primary-p-background-default text-primary-p-foreground-default',
  success: 'bg-success-p-background-default text-success-p-foreground-default',
  warning: 'bg-warning-p-background-default text-warning-p-foreground-default',
  error: 'bg-error-p-background-default text-error-p-foreground-default',
  info: 'bg-info-p-background-default text-info-p-foreground-default',
}

const outlineClasses: Record<BadgeVariant, string> = {
  base: 'bg-base-subtle-background-default border border-base-subtle-border-default text-base-foreground-default',
  primary: 'bg-primary-subtle-background-default border border-primary-subtle-border-default text-primary-foreground-default',
  success: 'bg-success-subtle-background-default border border-success-subtle-border-default text-success-foreground-default',
  warning: 'bg-warning-subtle-background-default border border-warning-subtle-border-default text-warning-foreground-default',
  error: 'bg-error-subtle-background-default border border-error-subtle-border-default text-error-foreground-default',
  info: 'bg-info-subtle-background-default border border-info-subtle-border-default text-info-foreground-default',
}

/*
 * Size specs from Figma (node 3711:2847):
 *
 *              sm (32 px)               xs (24 px)
 * ─────────────────────────────────────────────────────
 * height       32                       24
 * px           12 → px-3               8 → px-2
 * gap          8 → gap-2               6 → gap-1.5
 * items gap    4 → gap-1               1 → gap-px
 * indicator    20×20 frame, 12×12 dot  16×16 frame, 8×8 dot
 * icon         20×20                   16×16
 * font         16 medium (500)         14 light (300)
 * line-height  24                      20
 */

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-8 px-3 gap-2 text-base font-medium',
  xs: 'h-6 px-2 gap-1.5 text-sm font-light',
}

/** Inner gap between indicator and icon within the items frame */
const itemsGap: Record<BadgeSize, string> = {
  sm: 'gap-1',
  xs: 'gap-px',
}

/** Indicator centering frame — matches Figma .indicator instance bounds */
const indicatorFrame: Record<BadgeSize, string> = {
  sm: 'h-5 w-5',
  xs: 'h-4 w-4',
}

/** Map badge size → Icon component size preset */
const iconSizeMap: Record<BadgeSize, IconSize> = {
  sm: 'md',
  xs: 'sm',
}

/** Map badge size → Indicator size */
const indicatorSizes: Record<BadgeSize, 'sm' | 'xs'> = {
  sm: 'sm',
  xs: 'xs',
}

/**
 * Badge — a pill-shaped chip/tag with embedded indicator dot, optional icon, and text label.
 *
 * Matches Figma `badge` component (node 3711:2847).
 * 6 color roles × 2 visual types (solid/outline) × 2 sizes (sm/xs).
 * Indicator variant is independent of the badge color role.
 */
export function Badge({
  variant = 'base',
  type = 'solid',
  size = 'sm',
  indicator,
  icon: IconComponent,
  children,
  className = '',
}: BadgeProps) {
  const colorClasses = type === 'solid' ? solidClasses[variant] : outlineClasses[variant]

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${colorClasses} ${className}`}
    >
      {/* Items frame: indicator + optional icon */}
      {(indicator || IconComponent) && (
        <span className={`inline-flex items-center ${itemsGap[size]}`}>
          {indicator && (
            <span className={`flex items-center justify-center ${indicatorFrame[size]}`}>
              <Indicator variant={indicator} size={indicatorSizes[size]} />
            </span>
          )}
          {IconComponent && (
            <Icon icon={IconComponent} size={iconSizeMap[size]} />
          )}
        </span>
      )}
      {children}
    </span>
  )
}

export type { BadgeProps, BadgeVariant, BadgeType, BadgeSize }

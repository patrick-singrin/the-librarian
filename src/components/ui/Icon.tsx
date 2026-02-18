import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface IconProps {
  /** Any Phosphor icon component, e.g. `MagnifyingGlassIcon` */
  icon: ComponentType<PhosphorIconProps>
  /** Predefined size preset */
  size?: IconSize
  /** Override color (defaults to currentColor) */
  color?: string
  /** Accessible label — renders a <title> inside the SVG */
  alt?: string
  className?: string
}

const sizeConfig: Record<IconSize, { size: number; weight: PhosphorIconProps['weight'] }> = {
  xs: { size: 12, weight: 'regular' },
  sm: { size: 16, weight: 'regular' },
  md: { size: 20, weight: 'regular' },
  lg: { size: 24, weight: 'regular' },
  xl: { size: 32, weight: 'bold' },
}

export function Icon({
  icon: IconComponent,
  size = 'md',
  color,
  alt,
  className = '',
}: IconProps) {
  const { size: px, weight } = sizeConfig[size]

  return (
    <IconComponent
      size={px}
      weight={weight}
      color={color}
      alt={alt}
      className={`shrink-0 ${className}`}
      aria-hidden={alt ? undefined : true}
    />
  )
}

export type { IconProps, IconSize }

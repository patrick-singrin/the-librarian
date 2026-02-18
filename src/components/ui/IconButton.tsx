import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

/**
 * Tiny inline button for embedding inside other components
 * such as Label, TextField, or SearchField.
 *
 * NOT a general-purpose button — use `<Button>` for standalone actions.
 *
 * Figma: .tiny-button — Style=base, Type=ghost, Size=small
 *
 * Two modes:
 * - Icon-only (Text=false): 24×24, p-1 (4 px), rounded-lg (8 px)
 * - With text (Text=true):  h-6, px-2.5, gap-1, leading + label + trailing
 */

type IconButtonVariant = 'ghost'

interface IconButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  /** Leading Phosphor icon (left slot) */
  icon: ComponentType<PhosphorIconProps>
  /** Optional trailing Phosphor icon (right slot) */
  iconRight?: ComponentType<PhosphorIconProps>
  /** Optional text label — switches to text mode when provided */
  children?: ReactNode
  /** Visual style — currently only ghost */
  variant?: IconButtonVariant
  'aria-label': string
  className?: string
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: `bg-transparent text-base-foreground-default
    hover:bg-base-background-hover
    pressed:bg-base-background-active
    disabled:text-base-foreground-disabled disabled:bg-transparent`,
}

export function IconButton({
  icon: LeadingIcon,
  iconRight: TrailingIcon,
  children,
  variant = 'ghost',
  className = '',
  ...props
}: IconButtonProps) {
  const hasText = children != null

  return (
    <AriaButton
      className={`inline-flex h-6 cursor-pointer items-center justify-center rounded-lg outline-focus transition-[background-color,color]
        focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed
        ${hasText ? 'gap-1 px-2.5' : 'w-6 p-1'}
        ${variantClasses[variant]}
        ${className}`}
      {...props}
    >
      <LeadingIcon size={16} weight="regular" aria-hidden className="shrink-0" />
      {hasText && (
        <span className="text-sm font-normal leading-5">{children}</span>
      )}
      {TrailingIcon && (
        <TrailingIcon size={16} weight="regular" aria-hidden className="shrink-0" />
      )}
    </AriaButton>
  )
}

export type { IconButtonProps, IconButtonVariant }

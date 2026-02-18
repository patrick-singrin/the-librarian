import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

type ButtonVariant =
  | 'primary-solid'
  | 'primary-outline'
  | 'primary-ghost'
  | 'base-solid'
  | 'base-outline'
  | 'base-ghost'
  | 'destructive-solid'
  | 'destructive-outline'
  | 'destructive-ghost'

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps extends Omit<AriaButtonProps, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Phosphor icon component shown before children */
  iconLeft?: ComponentType<PhosphorIconProps>
  /** Phosphor icon component shown after children */
  iconRight?: ComponentType<PhosphorIconProps>
  className?: string
}

/** With text — aria-label optional (text content is the accessible name) */
interface ButtonWithText extends ButtonBaseProps {
  children: ReactNode
}

/** Icon-only — aria-label required (no text content to serve as accessible name) */
interface ButtonIconOnly extends ButtonBaseProps {
  children?: never
  'aria-label': string
}

type ButtonProps = ButtonWithText | ButtonIconOnly

/*
 * Semantic token mapping — 3 color roles × 3 visual styles:
 *
 * solid   → {role}/p-background + {role}/p-foreground   (filled)
 * outline → {role}/border + {role}/foreground + bg transparent (bordered)
 * ghost   → {role}/foreground → {role}/subtle-background on hover (minimal)
 *
 * Color roles:
 *   primary      → primary tokens
 *   base         → base tokens
 *   destructive  → error tokens
 */

const variantClasses: Record<ButtonVariant, string> = {
  /* ── primary ── */
  'primary-solid': `bg-primary-p-background-default text-primary-p-foreground-default
    hover:bg-primary-p-background-hover
    pressed:bg-primary-p-background-active
    disabled:bg-primary-p-background-disabled disabled:text-primary-p-foreground-disabled`,
  'primary-outline': `border border-primary-border-default bg-transparent text-primary-foreground-default
    hover:bg-primary-background-hover hover:border-primary-border-hover
    pressed:bg-primary-background-active pressed:border-primary-border-active
    disabled:text-primary-foreground-disabled disabled:border-primary-border-disabled`,
  'primary-ghost': `bg-transparent text-primary-foreground-default
    hover:bg-primary-background-hover
    pressed:bg-primary-background-active
    disabled:text-primary-foreground-disabled`,

  /* ── base ── */
  'base-solid': `bg-base-p-background-default text-base-p-foreground-default
    hover:bg-base-p-background-hover
    pressed:bg-base-p-background-active
    disabled:bg-base-p-background-disabled disabled:text-base-p-foreground-disabled`,
  'base-outline': `border border-base-border-default bg-base-background-default text-base-foreground-default
    hover:bg-base-background-hover hover:border-base-border-hover
    pressed:bg-base-background-active pressed:border-base-border-active
    disabled:bg-base-background-disabled disabled:text-base-foreground-disabled disabled:border-base-border-disabled`,
  'base-ghost': `bg-transparent text-base-foreground-default
    hover:bg-base-background-hover
    pressed:bg-base-background-active
    disabled:text-base-foreground-disabled`,

  /* ── destructive ── */
  'destructive-solid': `bg-error-p-background-default text-error-p-foreground-default
    hover:bg-error-p-background-hover
    pressed:bg-error-p-background-active
    disabled:bg-error-p-background-disabled disabled:text-error-p-foreground-disabled`,
  'destructive-outline': `border border-error-border-default bg-transparent text-error-foreground-default
    hover:bg-error-background-hover hover:border-error-border-hover
    pressed:bg-error-background-active pressed:border-error-border-active
    disabled:text-error-foreground-disabled disabled:border-error-border-disabled`,
  'destructive-ghost': `bg-transparent text-error-foreground-default
    hover:bg-error-background-hover
    pressed:bg-error-background-active
    disabled:text-error-foreground-disabled`,
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2.5',
  lg: 'px-5 py-2.5 text-lg gap-2',
}

const iconOnlyPadding: Record<ButtonSize, string> = {
  sm: 'p-1.5 leading-[0]',
  md: 'p-2.5 leading-[0]',
  lg: 'p-3 leading-[0]',
}

const iconSizes: Record<ButtonSize, number> = {
  sm: 18,
  md: 20,
  lg: 22,
}

export function Button({
  variant = 'primary-solid',
  size = 'md',
  iconLeft: IconLeft,
  iconRight: IconRight,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const iconOnly = !children && (IconLeft || IconRight)
  const iconPx = iconSizes[size]

  return (
    <AriaButton
      className={`inline-flex cursor-pointer items-center justify-center rounded-lg font-medium outline-focus transition-[background-color,border-color,color,box-shadow]
        focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed
        ${iconOnly ? iconOnlyPadding[size] : sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}`}
      {...props}
    >
      {IconLeft && (
        <IconLeft
          size={iconPx}
          weight="regular"
          aria-hidden
          className="shrink-0"
        />
      )}
      {children}
      {IconRight && (
        <IconRight
          size={iconPx}
          weight="regular"
          aria-hidden
          className="shrink-0"
        />
      )}
    </AriaButton>
  )
}

export type { ButtonProps, ButtonVariant, ButtonSize }

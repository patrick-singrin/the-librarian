import { type ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Link } from 'react-aria-components'
import { Icon } from './Icon'

interface NavItemProps {
  /** Route path */
  href: string
  /** Visible label (hidden when collapsed) */
  label: string
  /** Phosphor icon component */
  icon: ComponentType<PhosphorIconProps>
  /** Whether the item is the current page */
  active?: boolean
  /** Icon-only mode */
  collapsed?: boolean
  /** Disabled state */
  disabled?: boolean
  className?: string
}

/**
 * NavItem — sidebar navigation link matching Figma `nav-item`.
 *
 * 36 px tall, rounded-md. Expanded shows icon + label,
 * collapsed shows icon only in a 36 × 36 square.
 */
export function NavItem({
  href,
  label,
  icon: NavIcon,
  active = false,
  collapsed = false,
  disabled = false,
  className = '',
}: NavItemProps) {
  const textColor = disabled
    ? 'text-base-foreground-disabled'
    : 'text-base-foreground-default'

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      isDisabled={disabled}
      className={`flex h-9 items-center rounded-md ring-inset outline-focus transition-[background-color,box-shadow]
        ${collapsed ? 'w-9 justify-center' : 'gap-2 px-2'}
        ${disabled
          ? 'pointer-events-none ring-0 bg-base-background-default'
          : active
            ? 'ring-1 ring-base-border-active bg-base-background-default'
            : 'ring-0 bg-base-background-default hover:ring-1 hover:ring-base-border-hover hover:bg-base-subtle-background-default'
        }
        focus-visible:outline-2 focus-visible:outline-offset-2
        ${className}`}
    >
      <Icon icon={NavIcon} size="md" className={textColor} />
      {!collapsed && (
        <span className={`text-base font-normal leading-6 ${textColor}`}>
          {label}
        </span>
      )}
    </Link>
  )
}

export type { NavItemProps }

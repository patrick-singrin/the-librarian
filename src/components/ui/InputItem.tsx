import { type InputHTMLAttributes, forwardRef } from 'react'

/**
 * Low-level styled input (Figma `.input-item`).
 *
 * 40px height, border-radius 4px, 1px border.
 * Supports prefix/suffix text, error state, and all native input attributes.
 *
 * Use inside `<TextField>` for the full label + input + error composition,
 * or standalone when you only need the raw input box.
 */

interface InputItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /** Show error styling (red border, red hover) */
  error?: boolean
  /** Static text before the input value */
  prefix?: string
  /** Static text after the input value */
  suffix?: string
  className?: string
}

export const InputItem = forwardRef<HTMLInputElement, InputItemProps>(
  function InputItem({ error = false, prefix, suffix, className = '', ...props }, ref) {
    return (
      <div
        className={`group/input flex items-center rounded-sm border bg-base-background-default transition-[background-color,border-color]
          ${error
            ? 'border-error-subtle-border-default hover:border-error-border-hover hover:bg-error-background-hover'
            : 'border-base-border-default hover:border-base-border-hover hover:bg-base-background-hover'
          }
          has-[:focus]:outline-2 has-[:focus]:outline-offset-2 has-[:focus]:outline-focus
          has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50
          ${className}`}
      >
        {prefix && (
          <span className="shrink-0 pl-3 text-base text-base-subtle-foreground-default">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base font-medium text-base-foreground-default outline-none placeholder:font-light placeholder:text-base-subtle-foreground-default disabled:cursor-not-allowed"
          {...props}
        />

        {suffix && (
          <span className="shrink-0 pr-3 text-base text-base-subtle-foreground-default">
            {suffix}
          </span>
        )}
      </div>
    )
  }
)

export type { InputItemProps }

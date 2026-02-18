import { type ComponentType, type ReactNode } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Info } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'

interface LabelProps {
  /** Label text */
  children: ReactNode
  /** HTML `for` attribute — connects to the input's `id` */
  htmlFor?: string
  /** Show required asterisk (*) or "(Optional)" suffix */
  required?: boolean
  /** Tooltip content shown via the info icon button */
  infoTip?: ReactNode
  /** Helper / description text below the label */
  helperText?: ReactNode
  /** Override the info icon (defaults to Phosphor `Info`) */
  infoIcon?: ComponentType<PhosphorIconProps>
  className?: string
}

export function Label({
  children,
  htmlFor,
  required = true,
  infoTip,
  helperText,
  infoIcon: InfoIcon = Info,
  className = '',
}: LabelProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Label row */}
      <div className="flex items-center gap-1">
        <label
          htmlFor={htmlFor}
          className="text-base font-semibold text-base-foreground-default"
        >
          {children}
          {required && (
            <span className="ml-0.5 font-bold text-primary-foreground-default" aria-hidden="true">
              *
            </span>
          )}
          {!required && (
            <span className="ml-1.5 font-light text-base-subtle-foreground-default">
              (Optional)
            </span>
          )}
        </label>

        {infoTip && (
          <Tooltip content={infoTip} placement="top">
            <IconButton
              icon={InfoIcon}
              aria-label="More information"
            />
          </Tooltip>
        )}
      </div>

      {/* Helper text */}
      {helperText && (
        <p className="text-sm text-base-subtle-foreground-default">
          {helperText}
        </p>
      )}
    </div>
  )
}

export type { LabelProps }

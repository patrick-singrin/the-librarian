import { type ComponentType, type InputHTMLAttributes, forwardRef, useId } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { type ReactNode } from 'react'
import { Label } from './Label'
import { InputItem } from './InputItem'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'> {
  /** Label text */
  label: ReactNode
  /** Show required asterisk (*) or "(Optional)" suffix on label */
  required?: boolean
  /** Tooltip content shown via the info icon button in the label */
  infoTip?: ReactNode
  /** Helper / description text below the label */
  helperText?: ReactNode
  /** Override the info icon in the label */
  infoIcon?: ComponentType<PhosphorIconProps>
  /** Error message — shows red border + error text below input */
  errorText?: ReactNode
  /** Static text before the input value */
  prefix?: string
  /** Static text after the input value */
  suffix?: string
  className?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      required = true,
      infoTip,
      helperText,
      infoIcon,
      errorText,
      prefix,
      suffix,
      className = '',
      id: idProp,
      ...inputProps
    },
    ref
  ) {
    const autoId = useId()
    const id = idProp ?? autoId
    const errorId = errorText ? `${id}-error` : undefined

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <Label
          htmlFor={id}
          required={required}
          infoTip={infoTip}
          helperText={helperText}
          infoIcon={infoIcon}
        >
          {label}
        </Label>

        <InputItem
          ref={ref}
          id={id}
          error={!!errorText}
          prefix={prefix}
          suffix={suffix}
          aria-invalid={!!errorText}
          aria-describedby={errorId}
          {...inputProps}
        />

        {errorText && (
          <p id={errorId} className="text-sm font-medium text-error-foreground-default" role="alert">
            {errorText}
          </p>
        )}
      </div>
    )
  }
)

export type { TextFieldProps }

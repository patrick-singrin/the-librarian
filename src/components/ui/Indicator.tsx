type IndicatorVariant = 'success' | 'warning' | 'error' | 'info'
type IndicatorSize = 'xs' | 'sm'

interface IndicatorProps {
  variant: IndicatorVariant
  size?: IndicatorSize
  className?: string
}

const variantClasses: Record<IndicatorVariant, string> = {
  success: 'bg-success-p-background-default',
  warning: 'bg-warning-p-background-default',
  error: 'bg-error-p-background-default',
  info: 'bg-info-p-background-default',
}

const sizeClasses: Record<IndicatorSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
}

export function Indicator({ variant, size = 'sm', className = '' }: IndicatorProps) {
  return (
    <span
      className={`block rounded-full border-[1.25px] border-white shadow-sm ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  )
}

export type { IndicatorProps, IndicatorVariant, IndicatorSize }

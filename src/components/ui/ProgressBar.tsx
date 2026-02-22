import { ProgressBar as AriaProgressBar } from 'react-aria-components'

interface ProgressBarProps {
  /** Label shown on the left (e.g., "Processed") */
  label: string
  /** Current value (numerator) */
  value: number
  /** Maximum value (denominator) */
  total: number
  className?: string
}

/**
 * ProgressBar — reusable progress indicator matching Figma `progress-bar` component set
 * (node 3774:2277).
 *
 * Shows "{label} {value}/{total}" on the left, "{percent}%" on the right,
 * and a rounded track bar below.
 *
 * Bar color:
 *   - info (teal) when partially complete
 *   - success (green) when value >= total
 */
export function ProgressBar({
  label,
  value,
  total,
  className = '',
}: ProgressBarProps) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  const isSynced = total > 0 && value >= total

  return (
    <AriaProgressBar
      value={percent}
      minValue={0}
      maxValue={100}
      aria-label={`${label} progress`}
      className={`flex flex-col gap-0.5 ${className}`}
    >
      {({ percentage }) => (
        <>
          <div className="flex items-center justify-between text-xs text-base-subtle-foreground-default">
            <span className="flex items-center gap-1">
              <span>{label}</span>
              <span>
                <span className="font-semibold">{value.toLocaleString('en-US')}</span>
                <span>/{total.toLocaleString('en-US')}</span>
              </span>
            </span>
            <span>{percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-subtle-background-default">
            <div
              className={`h-full rounded-full transition-all ${
                isSynced
                  ? 'bg-success-p-background-default'
                  : 'bg-info-p-background-default'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      )}
    </AriaProgressBar>
  )
}

export type { ProgressBarProps }

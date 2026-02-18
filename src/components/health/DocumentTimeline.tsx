import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { ChartBar, FileArchive } from '@phosphor-icons/react'
import { useTimeline } from '../../hooks/useTimeline'
import { Button, Tile } from '../ui'
import type { TimelineRange, TimelineBucket } from '../../types/api'

const RANGES: { value: TimelineRange; label: string }[] = [
  { value: '30d', label: '30 D' },
  { value: '6m', label: '6 M' },
  { value: '12m', label: '12 M' },
]

/** Format axis tick labels based on the active range */
function formatTick(date: string, range: TimelineRange): string {
  if (range === '12m') {
    // "2025-03" → "Mar"
    const d = new Date(date + '-01')
    return d.toLocaleDateString('en-US', { month: 'short' })
  }
  if (range === '6m') {
    // "2025-01-06" → "Jan 6"
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  // 30d: "2025-01-20" → "Jan 20"
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format full date for tooltip */
function formatTooltipDate(date: string, range: TimelineRange): string {
  if (range === '12m') {
    const d = new Date(date + '-01')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (range === '6m') {
    const d = new Date(date)
    const end = new Date(d)
    end.setDate(end.getDate() + 6)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function CustomTooltip({
  active,
  payload,
  range,
}: TooltipProps<number, string> & { range: TimelineRange }) {
  if (!active || !payload?.length) return null
  const bucket = payload[0].payload as TimelineBucket
  const count = bucket.count
  return (
    <div className="rounded-md border border-base-subtle-border-default bg-base-background-default px-3 py-2 shadow-sm">
      <p className="text-xs text-base-subtle-foreground-default">
        {formatTooltipDate(bucket.date, range)}
      </p>
      <p className="text-sm font-semibold text-base-foreground-default">
        {count.toLocaleString('en-US')} {count === 1 ? 'document' : 'documents'}
      </p>
    </div>
  )
}

export function DocumentTimeline() {
  const [range, setRange] = useState<TimelineRange>('30d')
  const { data, isLoading, error } = useTimeline(range)

  const buckets = data?.buckets ?? []

  // Thin out tick labels so they don't overlap
  const tickInterval = range === '30d' ? 4 : range === '6m' ? 3 : 0

  return (
    <Tile
      title="Documents over Time"
      icon={ChartBar}
      badge={{ label: 'Paperless', icon: FileArchive }}
    >
      <div className="flex flex-col gap-4">
        {/* Range toggles */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={r.value === range ? 'primary-solid' : 'base-outline'}
              size="sm"
              onPress={() => setRange(r.value)}
              aria-pressed={r.value === range}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default"
          >
            Unable to load timeline: {error.message}
          </div>
        )}

        {/* Chart area */}
        <div className="h-52">
          {isLoading && buckets.length === 0 ? (
            <div className="flex h-full items-center justify-center text-base-subtle-foreground-default">
              …
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-base-subtle-border-default)"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatTick(d, range)}
                  interval={tickInterval}
                  tick={{ fontSize: 11, fill: 'var(--color-base-subtle-foreground-default)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-base-subtle-border-default)' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-base-subtle-foreground-default)' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={(props) => <CustomTooltip {...props} range={range} />}
                  cursor={{ fill: 'var(--color-base-subtle-background-default)' }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-primary-p-background-default)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={range === '12m' ? 40 : range === '6m' ? 14 : 8}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Tile>
  )
}

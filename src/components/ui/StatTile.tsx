import { Card } from './Card'

type StatAlign = 'left' | 'center'

interface StatTileProps {
  label: string
  value: number | string | null | undefined
  loading?: boolean
  align?: StatAlign
  className?: string
}

function formatValue(value: number | string | null | undefined): string {
  if (value == null) return '–'
  if (typeof value === 'number') return value.toLocaleString('en-US')
  return value
}

export function StatTile({ label, value, loading = false, align = 'left', className = '' }: StatTileProps) {
  return (
    <Card className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
      {align === 'center' ? (
        <>
          <p className="text-2xl font-bold text-base-foreground-default">
            {loading ? '…' : formatValue(value)}
          </p>
          <p className="mt-1 text-xs text-base-subtle-foreground-default">{label}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-base-subtle-foreground-default">{label}</p>
          <p className="mt-1 text-2xl font-bold text-base-foreground-default">
            {loading ? '…' : formatValue(value)}
          </p>
        </>
      )}
    </Card>
  )
}

export type { StatTileProps, StatAlign }

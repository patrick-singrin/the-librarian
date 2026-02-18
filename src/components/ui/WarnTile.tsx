interface WarnTileProps {
  label: string
  value: number
  className?: string
}

export function WarnTile({ label, value, className = '' }: WarnTileProps) {
  return (
    <div className={`rounded-xl border border-warning-subtle-border-default bg-warning-subtle-background-default p-5 shadow-sm ${className}`}>
      <p className="text-xs font-medium text-warning-subtle-foreground-default">{label}</p>
      <p className="mt-1 text-2xl font-bold text-warning-foreground-default">{value.toLocaleString('en-US')}</p>
    </div>
  )
}

export type { WarnTileProps }

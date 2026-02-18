/**
 * Format a timestamp as clock time (HH:MM) when today,
 * or "HH:MM; DD.MM.YYYY" when older than today.
 */
export function formatRelativeTime(date: Date | number): string {
  const then = typeof date === 'number' ? new Date(date) : date
  const now = new Date()

  const time = then.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const isToday =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()

  if (isToday) return time

  const day = then.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${time}; ${day}`
}

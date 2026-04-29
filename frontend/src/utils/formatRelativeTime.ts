const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelativeTime(dateString?: string | null) {
  if (!dateString) {
    return 'just now'
  }

  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) {
    return 'just now'
  }

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, secondsPerUnit] of ranges) {
    if (Math.abs(diffSeconds) >= secondsPerUnit) {
      return formatter.format(Math.round(diffSeconds / secondsPerUnit), unit)
    }
  }

  return formatter.format(diffSeconds, 'second')
}

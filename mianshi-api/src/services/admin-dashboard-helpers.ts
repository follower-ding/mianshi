type Dated = { createdAt: string | number }

export type AdminActivityItem = {
  id: string
  type: 'question' | 'report' | 'session' | 'user' | 'candidate'
  title: string
  subtitle?: string
  createdAt: string
  href?: string
}

export type AdminTrendMetric = {
  current: number
  previous: number
  delta: string
  up: boolean | undefined
}

function toMs(iso: string | number): number {
  return typeof iso === 'number' ? iso : new Date(iso).getTime()
}

export function countInRange(items: Dated[], startMs: number, endMs: number): number {
  return items.filter((i) => {
    const t = toMs(i.createdAt)
    return t >= startMs && t < endMs
  }).length
}

export function weekOverWeekTrend(items: Dated[]): AdminTrendMetric {
  const now = Date.now()
  const week = 7 * 86400000
  const current = countInRange(items, now - week, now)
  const previous = countInRange(items, now - week * 2, now - week)
  const delta = formatDelta(current, previous)
  return { current, previous, delta, up: current > previous ? true : current < previous ? false : undefined }
}

function formatDelta(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = Math.round(((current - previous) / previous) * 1000) / 10
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export function mergeRecentActivity(items: AdminActivityItem[], limit = 8): AdminActivityItem[] {
  return [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

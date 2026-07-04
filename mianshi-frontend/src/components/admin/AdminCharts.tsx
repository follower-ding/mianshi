import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/* ── KPI Tile ── */

type KpiTileProps = {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  trend?: { value: string; up?: boolean }
  /** @deprecated Shadcn Admin 风格忽略 accent，保留以兼容旧页面 */
  accent?: string
}

export function AdminKpiTile({ label, value, sub, icon: Icon, trend }: KpiTileProps) {
  return (
    <div className="admin-kpi-tile rounded-lg border border-admin-border bg-admin-surface">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-admin-muted">{label}</p>
        {Icon && <Icon className="size-4 text-admin-muted" strokeWidth={1.75} />}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-admin-text">{value}</p>
        {(sub || trend) && (
          <p className="text-xs text-admin-muted">
            {trend && (
              <span
                className={
                  trend.up === false ? 'text-rose-400' : trend.up === true ? 'text-emerald-400' : ''
                }
              >
                {trend.value}{' '}
              </span>
            )}
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Horizontal Bar Chart ── */

export type BarChartItem = { label: string; value: number; color?: string }

const BAR_PALETTE = ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a']

type BarChartProps = {
  items: BarChartItem[]
  total?: number
  showPct?: boolean
  icon?: LucideIcon
  title?: string
}

export function AdminBarChart({ items, total, showPct = true, icon: Icon, title }: BarChartProps) {
  const max = total ?? Math.max(...items.map((i) => i.value), 1)
  const sorted = [...items].sort((a, b) => b.value - a.value)

  return (
    <div>
      {title && (
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-admin-text">
          {Icon && <Icon className="h-4 w-4 text-admin-muted" strokeWidth={1.75} />}
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {sorted.map((item, i) => {
          const pct = max > 0 ? Math.round((item.value / max) * 100) : 0
          const color = item.color ?? BAR_PALETTE[i % BAR_PALETTE.length]
          return (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-[var(--color-admin-text-secondary)]">{item.label}</span>
                <span className="font-bold tabular-nums text-[var(--color-admin-text)]">
                  {item.value}
                  {showPct && max > 0 && (
                    <span className="ml-1 font-normal text-[var(--color-admin-muted)]">
                      ({Math.round((item.value / ((total ?? items.reduce((s, x) => s + x.value, 0)) || 1)) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-admin-surface-alt)]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Donut Chart ── */

export type DonutSegment = { label: string; value: number; color: string }

type DonutProps = {
  segments: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  size?: number
  title?: string
  icon?: LucideIcon
}

export function AdminDonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 140,
  title,
  icon: Icon,
}: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - 16) / 2
  const cx = size / 2
  const cy = size / 2
  const stroke = 14
  const circumference = 2 * Math.PI * r

  let offset = 0
  const arcs = segments.filter((s) => s.value > 0).map((seg) => {
    const pct = seg.value / total
    const dash = pct * circumference
    const arc = { ...seg, dash, gap: circumference - dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <div>
      {title && (
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-admin-text">
          {Icon && <Icon className="h-4 w-4 text-admin-muted" strokeWidth={1.75} />}
          {title}
        </h3>
      )}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-admin-surface-alt)" strokeWidth={stroke} />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            ))}
          </svg>
          {(centerValue !== undefined || centerLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {centerValue !== undefined && (
                <span className="text-xl font-bold tabular-nums text-[var(--color-admin-text)]">{centerValue}</span>
              )}
              {centerLabel && (
                <span className="text-[10px] font-medium text-[var(--color-admin-muted)]">{centerLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
              <span className="flex-1 text-[var(--color-admin-text-secondary)]">{seg.label}</span>
              <span className="font-bold tabular-nums text-[var(--color-admin-text)]">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Sparkline ── */

type SparklineProps = {
  data: number[]
  labels?: string[]
  height?: number
  color?: string
  title?: string
  icon?: LucideIcon
}

export function AdminSparkline({
  data,
  labels,
  height = 64,
  color = '#4f46e5',
  title,
  icon: Icon,
}: SparklineProps) {
  const max = Math.max(...data, 1)
  const w = 100
  const points = data.map((v, i) => {
    const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w
    const y = height - (v / max) * (height - 8) - 4
    return `${x},${y}`
  })

  return (
    <div>
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-admin-text)]">
          {Icon && <Icon className="h-4 w-4 text-[var(--color-admin-brand)]" strokeWidth={1.75} />}
          {title}
        </h3>
      )}
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <polygon
            points={`0,${height} ${points.join(' ')} ${w},${height}`}
            fill="url(#sparkFill)"
          />
        )}
        {data.length > 0 && (
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {data.map((v, i) => {
          const x = data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w
          const y = height - (v / max) * (height - 8) - 4
          return v > 0 ? (
            <circle key={i} cx={x} cy={y} r="2.5" fill={color} vectorEffect="non-scaling-stroke" />
          ) : null
        })}
      </svg>
      {labels && labels.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-admin-muted)]">
          <span>{labels[0]}</span>
          {labels.length > 1 && <span>{labels[labels.length - 1]}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Score Ring (inline in tables) ── */

type ScoreRingProps = { score: number; max?: number; size?: number }

export function AdminScoreRing({ score, max = 100, size = 40 }: ScoreRingProps) {
  const pct = Math.min(100, Math.round((score / max) * 100))
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-admin-surface-alt)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums text-[var(--color-admin-text)]">{score}</span>
    </div>
  )
}

/* ── Segment / Stacked Bar ── */

type SegmentBarProps = { segments: DonutSegment[]; height?: number }

export function AdminSegmentBar({ segments, height = 10 }: SegmentBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height }}>
      {segments.filter((s) => s.value > 0).map((seg) => (
        <div
          key={seg.label}
          className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
          title={`${seg.label}: ${seg.value}`}
        />
      ))}
    </div>
  )
}

/* ── Chart Card wrapper ── */

type ChartCardProps = { children: ReactNode; className?: string }

export function AdminChartCard({ children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`admin-chart-card rounded-lg border border-admin-border bg-admin-surface ${className}`}
    >
      {children}
    </div>
  )
}

/* ── Vertical Bar Chart (Shadcn Overview style) ── */

type VerticalBarProps = {
  items: BarChartItem[]
  title?: string
  description?: string
  icon?: LucideIcon
  height?: number
}

export function AdminVerticalBarChart({
  items,
  title,
  description,
  icon: Icon,
  height = 220,
}: VerticalBarProps) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, 8)

  return (
    <div className="p-6">
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="flex items-center gap-2 text-sm font-medium text-admin-text">
              {Icon && <Icon className="size-4 text-admin-muted" strokeWidth={1.75} />}
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-xs text-admin-muted">{description}</p>
          )}
        </div>
      )}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {sorted.map((item, i) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0
          const barH = Math.max(pct, item.value > 0 ? 4 : 0)
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-sm bg-admin-text transition-all duration-500"
                  style={{
                    height: `${barH}%`,
                    opacity: 1 - i * 0.08,
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-admin-muted">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Utilities ── */

export function groupCountByDay(items: { createdAt: string }[], days = 14): { labels: string[]; values: number[] } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const buckets: number[] = Array(days).fill(0)
  const labels: string[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(
      d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    )
    const dayStart = d.getTime()
    const dayEnd = dayStart + 86400000
    buckets[days - 1 - i] = items.filter((item) => {
      const t = new Date(item.createdAt).getTime()
      return t >= dayStart && t < dayEnd
    }).length
  }

  return { labels, values: buckets }
}

export function countByField<T>(items: T[], field: (item: T) => string): BarChartItem[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = field(item) || '未知'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }))
}

export const RATING_COLORS: Record<string, string> = {
  优秀: '#fafafa',
  良好: '#d4d4d8',
  合格: '#a1a1aa',
  待提升: '#71717a',
  需加强: '#52525b',
}

export const JOB_STATUS_COLORS: Record<string, string> = {
  applied: '#71717a',
  viewed: '#a1a1aa',
  interview_invited: '#d4d4d8',
  interview_done: '#fafafa',
  rejected: '#52525b',
  offer: '#fafafa',
}

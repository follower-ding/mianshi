import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  Trash2,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  Award,
  CalendarDays,
  BarChart3,
  Star,
  MessageSquare,
} from 'lucide-react'
import { api, type InterviewReportSummary } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminDataTable, type AdminColumnDef } from '../../components/admin/AdminDataTable'
import type { AdminFacetDef } from '../../components/admin/AdminFacetedFilter'
import { AdminIconButton, AdminToolbar, AdminFilterCard } from '../../components/admin/AdminToolbar'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import {
  AdminKpiTile,
  AdminBarChart,
  AdminDonutChart,
  AdminSparkline,
  AdminScoreRing,
  AdminChartCard,
  AdminSegmentBar,
  groupCountByDay,
  countByField,
  RATING_COLORS,
} from '../../components/admin/AdminCharts'
import { Badge } from '../../components/ui/Badge'
import { AdminButton } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ratingVariant(rating: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (rating.includes('优秀') || rating.includes('良好')) return 'success'
  if (rating.includes('合格')) return 'info'
  if (rating.includes('待提升')) return 'warning'
  if (rating.includes('需加强') || rating.includes('不足')) return 'danger'
  return 'default'
}

export function AdminReportsPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<InterviewReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const reportFacets: AdminFacetDef<InterviewReportSummary>[] = useMemo(
    () => [
      {
        id: 'rating',
        label: '评级',
        getValue: (r) => r.overallRating,
      },
      {
        id: 'position',
        label: '岗位',
        getValue: (r) => r.position,
      },
    ],
    [],
  )

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (r) =>
        r.position.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.overallRating.toLowerCase().includes(q),
    )
  }, [items, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listReports()
      setItems(res.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该报告？')) return
    await api.deleteReport(id)
    showToast('报告已删除', 'success')
    load()
  }

  const stats = useMemo(() => {
    if (items.length === 0) {
      return { avg: 0, max: 0, total: 0, weekCount: 0, totalAnswers: 0 }
    }
    const weekAgo = Date.now() - 7 * 86400000
    return {
      avg: Math.round(items.reduce((s, r) => s + r.totalScore, 0) / items.length),
      max: Math.max(...items.map((r) => r.totalScore)),
      total: items.length,
      weekCount: items.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length,
      totalAnswers: items.reduce((s, r) => s + r.answerCount, 0),
    }
  }, [items])

  const ratingSegments = useMemo(() => {
    const counts = countByField(items, (r) => r.overallRating)
    return counts.map((c) => ({
      label: c.label,
      value: c.value,
      color: RATING_COLORS[c.label] ?? '#94a3b8',
    }))
  }, [items])

  const positionBars = useMemo(
    () => countByField(items, (r) => r.position).slice(0, 6),
    [items],
  )

  const activity = useMemo(() => groupCountByDay(items, 14), [items])

  if (loading) return <Loading text="加载报告..." />

  const reportColumns: AdminColumnDef<InterviewReportSummary>[] = [
    {
      id: 'position',
      header: '岗位 / 摘要',
      sortValue: (r) => r.position,
      cell: (r) => (
        <div className="flex max-w-xs items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-admin-brand-light)]">
            <ClipboardList className="h-4 w-4 text-[var(--color-admin-brand)]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--color-admin-text)]">{r.position}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-admin-muted)]">
              {r.summary}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'score',
      header: '得分',
      sortValue: (r) => r.totalScore,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <AdminScoreRing score={r.totalScore} max={100} size={44} />
          <div>
            <p className="text-[11px] text-[var(--color-admin-muted)]">{r.answerCount} 题</p>
            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-admin-surface-alt)]">
              <div
                className="h-full rounded-full bg-[var(--color-admin-brand)] transition-all"
                style={{ width: `${Math.min(100, r.totalScore)}%` }}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'rating',
      header: '评级',
      sortValue: (r) => r.overallRating,
      cell: (r) => <Badge variant={ratingVariant(r.overallRating)}>{r.overallRating}</Badge>,
    },
    {
      id: 'createdAt',
      header: '时间',
      sortValue: (r) => r.createdAt,
      cell: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-admin-muted)]">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatDate(r.createdAt)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <AdminIconButton to={`/reports/${r.id}`} external title="查看报告">
            <ExternalLink className="h-3.5 w-3.5" />
          </AdminIconButton>
          <AdminIconButton danger onClick={() => handleDelete(r.id)} title="删除">
            <Trash2 className="h-3.5 w-3.5" />
          </AdminIconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <AdminButton variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </AdminButton>
        }
      />

      {items.length === 0 ? (
        <AdminEmptyState icon={ClipboardList} title="暂无报告" description="用户完成模拟面试后会生成报告" />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AdminKpiTile
              label="报告总数"
              value={stats.total}
              sub={`近 7 天 +${stats.weekCount}`}
              icon={ClipboardList}
            />
            <AdminKpiTile
              label="平均得分"
              value={stats.avg}
              sub={`最高 ${stats.max} 分`}
              icon={TrendingUp}
            />
            <AdminKpiTile
              label="答题总量"
              value={stats.totalAnswers}
              sub={`均 ${stats.total > 0 ? Math.round(stats.totalAnswers / stats.total) : 0} 题/场`}
              icon={MessageSquare}
            />
            <AdminKpiTile
              label="本周新增"
              value={stats.weekCount}
              sub="近 7 天完成面试"
              icon={CalendarDays}
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-3">
            <AdminChartCard className="lg:col-span-1">
              <AdminDonutChart
                title="评级分布"
                icon={Award}
                segments={ratingSegments.length > 0 ? ratingSegments : [{ label: '暂无', value: 1, color: '#52525b' }]}
                centerValue={stats.total}
                centerLabel="总计"
              />
              {ratingSegments.length > 0 && (
                <div className="mt-4">
                  <AdminSegmentBar segments={ratingSegments} height={8} />
                </div>
              )}
            </AdminChartCard>

            <AdminChartCard className="lg:col-span-1">
              <AdminSparkline
                title="近 14 天趋势"
                icon={BarChart3}
                data={activity.values}
                labels={activity.labels}
                height={80}
                color="#fafafa"
              />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {activity.values.slice(-3).map((v, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--color-admin-border-light)] bg-[var(--color-admin-surface-alt)] px-2 py-1.5 text-center"
                  >
                    <p className="text-sm font-bold tabular-nums text-[var(--color-admin-text)]">{v}</p>
                    <p className="text-[10px] text-[var(--color-admin-muted)]">
                      {activity.labels[activity.labels.length - 3 + i]}
                    </p>
                  </div>
                ))}
              </div>
            </AdminChartCard>

            <AdminChartCard className="lg:col-span-1">
              <AdminBarChart
                title="岗位分布"
                icon={Star}
                items={positionBars.length > 0 ? positionBars : [{ label: '暂无', value: 0 }]}
                showPct
              />
            </AdminChartCard>
          </div>

          <AdminFilterCard>
            <AdminToolbar
              variant="elevated"
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索岗位、摘要、评级…"
            />
          </AdminFilterCard>

          <AdminDataTable
            columns={reportColumns}
            data={searchFiltered}
            facets={reportFacets}
            getRowKey={(r) => r.id}
            variant="elevated"
            empty={
              <p className="py-12 text-center text-[var(--color-admin-muted)]">
                无匹配报告，试试调整筛选条件
              </p>
            }
          />
        </>
      )}
    </div>
  )
}

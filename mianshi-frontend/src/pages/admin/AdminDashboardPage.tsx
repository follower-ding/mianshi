import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Clock, Database,
  ArrowRight, ClipboardList, Activity, TrendingUp,
  Sparkles, FileText, Target, Cpu, Award,
} from 'lucide-react'
import { api, type AdminDashboard } from '../../api/client'
import { QUESTION_STATUS_LABEL } from '../../components/admin/adminTheme'
import { Loading } from '../../components/ui/Loading'
import { AdminButtonLink } from '../../components/admin/AdminButton'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminRecentActivity } from '../../components/admin/AdminRecentActivity'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminChartCard,
  AdminVerticalBarChart,
} from '../../components/admin/AdminCharts'

/** Shadcn Admin 单色语义 — 不用彩虹条 */
const STATUS_COLORS: Record<string, string> = {
  draft: '#52525b',
  review: '#a1a1aa',
  published: '#fafafa',
  archived: '#71717a',
}

type DashTab = 'overview' | 'quality' | 'gateway'

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [stats, setStats] = useState<{ total: number; byCategory: Record<string, number> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DashTab>('overview')

  useEffect(() => {
    Promise.all([api.getAdminDashboard(), api.getQuestionStats()])
      .then(([dash, s]) => { setData(dash); setStats(s) })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [])

  const categoryBars = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }, [stats])

  const statusSegments = useMemo(() => {
    if (!data) return []
    return Object.entries(data.questionsByStatus).map(([status, value]) => ({
      label: QUESTION_STATUS_LABEL[status] ?? status,
      value,
      color: STATUS_COLORS[status] ?? '#71717a',
    }))
  }, [data])

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6">
        <p className="font-medium text-red-300">{error}</p>
        <p className="mt-1 text-sm text-red-400/80">请确认 API 已启动且 PostgreSQL 管理员账号已创建</p>
      </div>
    )
  }

  if (!data || !stats) return <Loading text="加载看板..." />

  const pendingReview = data.questionsByStatus.review ?? 0
  const published = data.questionsByStatus.published ?? 0
  const trends = data.trends

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <>
            <AdminButtonLink to="/admin/import" variant="secondary" size="sm">
              <Sparkles className="size-3.5" />
              智能导入
            </AdminButtonLink>
            <AdminButtonLink to="/admin/manage" size="sm">
              <Database className="size-3.5" />
              题库管理
            </AdminButtonLink>
          </>
        }
      />

      <AdminTabs
        tabs={[
          { value: 'overview', label: '概览' },
          { value: 'quality', label: '质量' },
          { value: 'gateway', label: 'Gateway' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiTile
              label="题库总量"
              value={stats.total}
              sub="较上周"
              trend={trends ? { value: trends.questions.delta, up: trends.questions.up } : undefined}
              icon={BookOpen}
            />
            <AdminKpiTile
              label="待审核"
              value={pendingReview}
              sub={pendingReview > 0 ? '来自面经生成' : '暂无待审题'}
              icon={Clock}
            />
            <AdminKpiTile
              label="面试报告"
              value={data.quality.totalReports}
              sub="较上周"
              trend={trends ? { value: trends.reports.delta, up: trends.reports.up } : undefined}
              icon={ClipboardList}
            />
            <AdminKpiTile
              label="模拟面试"
              value={trends?.sessions.current ?? 0}
              sub="近 7 天"
              trend={trends ? { value: trends.sessions.delta, up: trends.sessions.up } : undefined}
              icon={Activity}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-7">
            <AdminChartCard className="lg:col-span-4">
              <AdminVerticalBarChart
                title="题目方向分布"
                description={`${stats.total} 题 · ${Object.keys(stats.byCategory).length} 个方向 · 已发布 ${published}`}
                icon={Database}
                items={categoryBars}
              />
            </AdminChartCard>

            <div className="lg:col-span-3">
              <AdminRecentActivity items={data.recentActivity ?? []} className="h-full" />
            </div>
          </div>

          <AdminChartCard>
            <div className="p-6">
              <AdminDonutChart
                title="题目状态"
                icon={FileText}
                segments={statusSegments}
                centerValue={stats.total}
                centerLabel="总题数"
                size={120}
              />
              <div className="mt-4 space-y-2 border-t border-admin-border pt-4">
                {statusSegments.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-admin-muted">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: seg.color }}
                      />
                      {seg.label}
                    </span>
                    <span className="font-medium tabular-nums text-admin-text">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AdminChartCard>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: '/admin/manage', label: '题库管理', icon: Database },
              { to: '/admin/reports', label: '面试报告', icon: ClipboardList },
              { to: '/admin/users', label: '用户管理', icon: Activity },
              { to: '/admin/system', label: '系统监控', icon: Cpu },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-lg border border-admin-border px-4 py-3 transition-colors hover:bg-admin-surface-alt"
              >
                <Icon className="size-4 text-admin-muted" strokeWidth={1.75} />
                <span className="text-sm font-medium text-admin-text-secondary">{label}</span>
                <ArrowRight className="ml-auto size-3.5 text-admin-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </>
      )}

      {tab === 'quality' && (
        <AdminChartCard>
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-admin-text">
              <TrendingUp className="size-4 text-admin-muted" strokeWidth={1.75} />
              质量指标
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: '平均考点覆盖', value: data.quality.avgTypeCoverage, icon: Target },
                { label: '平均面试分数', value: data.quality.avgInterviewScore, icon: Award },
                { label: '报告总数', value: data.quality.totalReports, icon: ClipboardList },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-lg border border-admin-border bg-admin-surface-alt p-4 text-center"
                >
                  <Icon className="mx-auto mb-2 size-4 text-admin-muted" strokeWidth={1.75} />
                  <p className="text-2xl font-bold tabular-nums text-admin-text">{value}</p>
                  <p className="mt-1 text-xs text-admin-muted">{label}</p>
                </div>
              ))}
            </div>
            {data.quality.pendingReviewQuestions > 0 && (
              <Link
                to="/admin/candidates"
                className="mt-4 flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface-alt px-3 py-2 text-xs font-medium text-admin-text-secondary transition-colors hover:bg-admin-sidebar-hover"
              >
                <Clock className="size-3.5 text-admin-muted" />
                {data.quality.pendingReviewQuestions} 道候选题待审核
                <ArrowRight className="ml-auto size-3 text-admin-muted" />
              </Link>
            )}
          </div>
        </AdminChartCard>
      )}

      {tab === 'gateway' && (
        <AdminChartCard>
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-admin-text">
              <Cpu className="size-4 text-admin-muted" strokeWidth={1.75} />
              LLM Gateway
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: '缓存命中', value: data.gateway.hits },
                { label: '缓存未中', value: data.gateway.misses },
                { label: '命中率', value: `${data.gateway.hitRate}%` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-admin-border p-4 text-center"
                >
                  <p className="text-2xl font-bold tabular-nums text-admin-text">{value}</p>
                  <p className="mt-1 text-xs text-admin-muted">{label}</p>
                </div>
              ))}
            </div>
            {Object.keys(data.gateway.variantUsage).length > 0 && (
              <div className="mt-6 border-t border-admin-border pt-4">
                <p className="mb-2 text-xs font-medium text-admin-muted">Prompt A/B 变体</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.gateway.variantUsage).map(([name, count]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-md border border-admin-border bg-admin-surface-alt px-2.5 py-1 text-xs text-admin-text-secondary"
                    >
                      {name}: <span className="font-medium text-admin-text">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AdminChartCard>
      )}
    </div>
  )
}

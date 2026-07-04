import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, Sparkles, RefreshCw, ShieldCheck, AlertTriangle, Clock, Link2 } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, type CandidateQuestion } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import {
  AdminKpiTile,
  AdminBarChart,
  AdminDonutChart,
  AdminChartCard,
  AdminSegmentBar,
  countByField,
} from '../../components/admin/AdminCharts'
import { AdminCardGrid, AdminContentCard } from '../../components/admin/AdminViewToggle'
import { adminAlertCx, adminZincColor } from '../../components/admin/adminChartColors'
import { Badge } from '../../components/ui/Badge'
import { AdminButton, AdminButtonLink } from '../../components/admin/AdminButton'
import { Loading, EmptyState } from '../../components/ui/Loading'

type OutletCtx = { refreshBadges?: () => void }

function isQualityOk(q: CandidateQuestion) {
  return q.keyPoints.length >= 1 && Boolean(q.referenceAnswer?.trim())
}

export function AdminCandidatesPage() {
  const { refreshBadges } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const [items, setItems] = useState<CandidateQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listCandidates('review')
      setItems(res.items)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    let complete = 0
    for (const q of items) if (isQualityOk(q)) complete++
    return { total: items.length, complete, incomplete: items.length - complete }
  }, [items])

  const categoryBars = useMemo(
    () => countByField(items, (q) => q.category).map((item, i) => ({ ...item, color: adminZincColor(i) })),
    [items],
  )
  const qualitySegments = useMemo(
    () => [
      { label: '可入库', value: stats.complete, color: '#fafafa' },
      { label: '待补全', value: stats.incomplete, color: '#71717a' },
    ],
    [stats],
  )

  const review = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.reviewCandidate(id, action)
      showToast(action === 'approve' ? '已入库发布' : '已拒绝', 'success')
      refreshBadges?.()
      load()
      return res
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  const bulkReview = async (action: 'approve' | 'reject') => {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`确定批量${action === 'approve' ? '通过' : '拒绝'} ${ids.length} 道题？`)) return
    let ok = 0
    for (const id of ids) {
      try {
        await api.reviewCandidate(id, action)
        ok++
      } catch {
        /* continue */
      }
    }
    showToast(`已处理 ${ok}/${ids.length} 道`, ok > 0 ? 'success' : 'error')
    refreshBadges?.()
    load()
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderCard = (q: CandidateQuestion, compact?: boolean) => {
    const qualityOk = isQualityOk(q)
    return (
      <AdminContentCard key={q.id}>
        {!compact && (
          <input
            type="checkbox"
            checked={selected.has(q.id)}
            onChange={() => toggleSelect(q.id)}
            className="mb-2 h-4 w-4 rounded border-[var(--color-admin-border)]"
          />
        )}
        <div className="mb-2 flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-admin-brand)]" />
          <h3 className="text-sm font-semibold leading-snug text-[var(--color-admin-text)]">{q.title}</h3>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          <Badge>{q.category}</Badge>
          <Badge variant="info">{q.difficulty}</Badge>
          <Badge>{q.type}</Badge>
          {!qualityOk && <Badge variant="warning">待补全</Badge>}
        </div>
        <p className="line-clamp-3 text-sm text-[var(--color-admin-text-secondary)]">{q.content}</p>
        {q.experienceId && (
          <Link
            to="/admin/experiences"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-admin-brand)] hover:underline"
          >
            <Link2 className="h-3 w-3" />
            来源面经
          </Link>
        )}
        <div className="mt-4 flex gap-1.5 border-t border-[var(--color-admin-border-light)] pt-3">
          <AdminButton size="sm" className="flex-1" onClick={() => review(q.id, 'approve')}>
            <Check className="h-3.5 w-3.5" />
            入库
          </AdminButton>
          <AdminButton size="sm" variant="secondary" className="flex-1" onClick={() => review(q.id, 'reject')}>
            <X className="h-3.5 w-3.5" />
            拒绝
          </AdminButton>
        </div>
      </AdminContentCard>
    )
  }

  if (loading) return <Loading text="加载候选题..." />

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <AdminButton variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </AdminButton>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="✨"
          title="暂无候选题"
          description="在面经管理页点击「抽题」生成候选题"
          action={
            <AdminButtonLink to="/admin/experiences" size="sm">前往面经管理</AdminButtonLink>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <AdminKpiTile label="待审核" value={stats.total} icon={Clock} />
            <AdminKpiTile label="可入库" value={stats.complete} icon={ShieldCheck} />
            <AdminKpiTile label="待补全" value={stats.incomplete} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminChartCard>
              <AdminDonutChart
                title="质量分布"
                icon={ShieldCheck}
                segments={qualitySegments}
                centerValue={stats.total}
                centerLabel="候选"
              />
              <div className="mt-4">
                <AdminSegmentBar segments={qualitySegments} height={8} />
              </div>
            </AdminChartCard>
            <AdminChartCard>
              <AdminBarChart title="方向分布" icon={Sparkles} items={categoryBars} showPct />
            </AdminChartCard>
          </div>

          {selected.size > 0 && (
            <div className={`flex flex-wrap items-center gap-2 px-4 py-3 ${adminAlertCx.info}`}>
              <span className="text-sm font-medium text-admin-text">已选 {selected.size} 项</span>
              <AdminButton size="sm" onClick={() => bulkReview('approve')}>批量入库</AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => bulkReview('reject')}>批量拒绝</AdminButton>
              <button type="button" className="ml-auto text-xs text-[var(--color-admin-muted)]" onClick={() => setSelected(new Set())}>
                取消
              </button>
            </div>
          )}

          <AdminCardGrid>
            {items.map((q) => renderCard(q))}
          </AdminCardGrid>
        </>
      )}
    </div>
  )
}

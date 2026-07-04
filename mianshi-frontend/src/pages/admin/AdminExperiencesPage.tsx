import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Trash2, Eye, RefreshCw, Plus, Pencil, BookOpen,
  Clock, CheckCircle2, XCircle, Building2, Search, Users, Award,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type Experience } from '../../api/client'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import { AdminIconButton, AdminToolbar, AdminFilterCard, AdminFilterPills } from '../../components/admin/AdminToolbar'
import { ExperienceFormModal } from '../../components/admin/ExperienceFormModal'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminBarChart,
  AdminChartCard,
  AdminSegmentBar,
  countByField,
} from '../../components/admin/AdminCharts'
import { useToast } from '../../contexts/ToastContext'
import { useAdminViewMode } from '../../components/admin/useAdminViewMode'
import {
  AdminViewToggle,
  AdminCardGrid,
  AdminContentCard,
} from '../../components/admin/AdminViewToggle'
import { Badge } from '../../components/ui/Badge'
import { AdminButton } from '../../components/admin/AdminButton'
import { Modal } from '../../components/ui/Modal'
import { Loading } from '../../components/ui/Loading'

const RESULT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  通过: 'success',
  待定: 'warning',
  未通过: 'danger',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  published: 'success',
  pending: 'warning',
  rejected: 'danger',
}

import { ADMIN_STATUS_CHART, ADMIN_RESULT_CHART, adminZincColor } from '../../components/admin/adminChartColors'

const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  pending: '待审核',
  rejected: '已驳回',
}

const STATUS_FILTERS = ['全部', 'pending', 'published', 'rejected'] as const

function ExperienceActions({
  exp,
  generatingId,
  onView,
  onEdit,
  onReview,
  onGenerate,
  onDelete,
  compact,
}: {
  exp: Experience
  generatingId: string | null
  onView: () => void
  onEdit: () => void
  onReview: (action: 'approve' | 'reject') => void
  onGenerate: () => void
  onDelete: () => void
  compact?: boolean
}) {
  return (
    <div className={`flex flex-wrap items-center ${compact ? 'gap-1' : 'justify-end gap-0.5'}`}>
      <AdminIconButton onClick={onView} title="查看">
        <Eye className="h-3.5 w-3.5" />
      </AdminIconButton>
      <AdminIconButton onClick={onEdit} title="编辑">
        <Pencil className="h-3.5 w-3.5" />
      </AdminIconButton>
      {exp.status === 'pending' && (
        <>
          <AdminButton size="sm" onClick={() => onReview('approve')}>通过</AdminButton>
          <AdminButton size="sm" variant="secondary" onClick={() => onReview('reject')}>驳回</AdminButton>
        </>
      )}
      <AdminButton
        size="sm"
        variant="secondary"
        disabled={generatingId === exp.id}
        onClick={onGenerate}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {generatingId === exp.id ? '生成中...' : '抽题'}
      </AdminButton>
      <AdminIconButton danger onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </AdminIconButton>
    </div>
  )
}

export function AdminExperiencesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [items, setItems] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [viewItem, setViewItem] = useState<Experience | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Experience | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('全部')
  const [viewMode, setViewMode] = useAdminViewMode('admin-experiences', 'table')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listExperiences()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((e) => e.status === 'pending').length,
    published: items.filter((e) => (e.status ?? 'published') === 'published').length,
    rejected: items.filter((e) => e.status === 'rejected').length,
  }), [items])

  const statusSegments = useMemo(
    () => [
      { label: '已发布', value: stats.published, color: ADMIN_STATUS_CHART.published ?? '#fafafa' },
      { label: '待审核', value: stats.pending, color: ADMIN_STATUS_CHART.pending ?? '#a1a1aa' },
      { label: '已驳回', value: stats.rejected, color: ADMIN_STATUS_CHART.rejected ?? '#71717a' },
    ],
    [stats],
  )

  const resultBars = useMemo(() => {
    const counts = countByField(items, (e) => e.result)
    return counts.map((c) => ({
      ...c,
      color: ADMIN_RESULT_CHART[c.label] ?? adminZincColor(3),
    }))
  }, [items])

  const companyBars = useMemo(
    () => countByField(items, (e) => e.company).slice(0, 6).map((c, i) => ({ ...c, color: adminZincColor(i) })),
    [items],
  )

  const filtered = useMemo(() => {
    return items.filter((exp) => {
      if (statusFilter !== '全部' && exp.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        exp.company.toLowerCase().includes(q) ||
        exp.position.toLowerCase().includes(q) ||
        exp.author.toLowerCase().includes(q) ||
        exp.summary.toLowerCase().includes(q)
      )
    })
  }, [items, search, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (exp: Experience) => {
    setEditing(exp)
    setFormOpen(true)
  }

  const handleGenerate = async (id: string) => {
    setGeneratingId(id)
    try {
      const res = await api.generateQuestionsFromExperience(id)
      showToast(`已生成 ${res.items.length} 道候选题`, 'success')
      navigate('/admin/candidates')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '生成失败', 'error')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该面经？')) return
    await api.deleteExperience(id)
    load()
  }

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    await api.reviewExperience(id, action)
    load()
  }

  if (loading) return <Loading text="加载面经..." />

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminViewToggle value={viewMode} onChange={setViewMode} />
            <AdminButton variant="secondary" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </AdminButton>
            <AdminButton size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              录入面经
            </AdminButton>
          </div>
        }
      />

      {items.length === 0 ? (
        <AdminEmptyState
          icon={BookOpen}
          title="暂无面经"
          description="点击「录入面经」添加，或等待用户端投稿"
          action={
            <AdminButton size="sm" onClick={openCreate}>
              录入面经
            </AdminButton>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AdminKpiTile label="面经总数" value={stats.total} icon={BookOpen} />
            <AdminKpiTile
              label="待审核"
              value={stats.pending}
              sub={stats.pending > 0 ? '需尽快处理' : '暂无待审'}
              icon={Clock}
            />
            <AdminKpiTile label="已发布" value={stats.published} icon={CheckCircle2} />
            <AdminKpiTile label="已驳回" value={stats.rejected} icon={XCircle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <AdminChartCard>
              <AdminDonutChart
                title="审核状态"
                icon={CheckCircle2}
                segments={statusSegments}
                centerValue={stats.total}
                centerLabel="面经"
              />
              <div className="mt-4">
                <AdminSegmentBar segments={statusSegments} height={8} />
              </div>
            </AdminChartCard>

            <AdminChartCard>
              <AdminBarChart title="面试结果" icon={Award} items={resultBars} showPct />
            </AdminChartCard>

            <AdminChartCard>
              <AdminBarChart title="公司分布 Top6" icon={Building2} items={companyBars} showPct={false} />
            </AdminChartCard>
          </div>

          <AdminFilterCard>
            <AdminToolbar
              variant="elevated"
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索公司、岗位、作者…"
            />
            <div className="mt-4">
              <AdminFilterPills
                variant="tabs"
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
                label={(s) => (s === '全部' ? '全部状态' : STATUS_LABEL[s])}
                count={(s) => (s === '全部' ? undefined : items.filter((e) => e.status === s).length)}
              />
            </div>
          </AdminFilterCard>

          {filtered.length === 0 ? (
            <AdminEmptyState icon={Search} title="无匹配面经" description="调整搜索或筛选条件" />
          ) : viewMode === 'table' ? (
            <AdminTable variant="elevated" minWidth="640px">
              <AdminTableHead variant="elevated">
                <AdminTh variant="elevated">公司 / 岗位</AdminTh>
                <AdminTh variant="elevated">结果</AdminTh>
                <AdminTh variant="elevated">状态</AdminTh>
                <AdminTh variant="elevated">轮次</AdminTh>
                <AdminTh variant="elevated">作者</AdminTh>
                <AdminTh variant="elevated" className="text-right">操作</AdminTh>
              </AdminTableHead>
              <tbody>
                {filtered.map((exp) => (
                  <AdminTr key={exp.id} variant="elevated">
                    <AdminTd dense>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-brand-light">
                          <Building2 className="h-4 w-4 text-admin-brand" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-admin-text">{exp.company}</p>
                          <p className="truncate text-xs text-admin-muted">{exp.position}</p>
                        </div>
                      </div>
                    </AdminTd>
                    <AdminTd dense>
                      <Badge variant={RESULT_VARIANT[exp.result] ?? 'default'}>{exp.result}</Badge>
                    </AdminTd>
                    <AdminTd dense>
                      <Badge variant={STATUS_VARIANT[exp.status ?? 'published'] ?? 'default'}>
                        {STATUS_LABEL[exp.status ?? 'published'] ?? exp.status}
                      </Badge>
                    </AdminTd>
                    <AdminTd dense>{exp.rounds} 轮</AdminTd>
                    <AdminTd dense>
                      <div className="flex items-center gap-1.5 text-admin-muted">
                        <Users className="h-3.5 w-3.5" />
                        {exp.author}
                      </div>
                    </AdminTd>
                    <AdminTd dense>
                      <ExperienceActions
                        exp={exp}
                        generatingId={generatingId}
                        onView={() => setViewItem(exp)}
                        onEdit={() => openEdit(exp)}
                        onReview={(a) => handleReview(exp.id, a)}
                        onGenerate={() => handleGenerate(exp.id)}
                        onDelete={() => handleDelete(exp.id)}
                      />
                    </AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTable>
          ) : (
            <AdminCardGrid>
              {filtered.map((exp) => (
                <AdminContentCard key={exp.id}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-brand-light">
                        <Building2 className="h-5 w-5 text-admin-brand" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[var(--color-admin-text)]">{exp.company}</p>
                        <p className="truncate text-xs text-[var(--color-admin-muted)]">{exp.position}</p>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[exp.status ?? 'published'] ?? 'default'}>
                      {STATUS_LABEL[exp.status ?? 'published'] ?? exp.status}
                    </Badge>
                  </div>

                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--color-admin-text-secondary)]">
                    {exp.summary}
                  </p>

                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant={RESULT_VARIANT[exp.result] ?? 'default'}>{exp.result}</Badge>
                    <span className="text-[11px] text-[var(--color-admin-muted)]">{exp.rounds} 轮</span>
                    <span className="flex items-center gap-1 text-[11px] text-[var(--color-admin-muted)]">
                      <Users className="h-3 w-3" />
                      {exp.author}
                    </span>
                  </div>

                  <ExperienceActions
                    exp={exp}
                    generatingId={generatingId}
                    compact
                    onView={() => setViewItem(exp)}
                    onEdit={() => openEdit(exp)}
                    onReview={(a) => handleReview(exp.id, a)}
                    onGenerate={() => handleGenerate(exp.id)}
                    onDelete={() => handleDelete(exp.id)}
                  />
                </AdminContentCard>
              ))}
            </AdminCardGrid>
          )}

          <p className="text-center text-[11px] text-[var(--color-admin-muted)]">
            显示 {filtered.length} / {items.length} 条面经
          </p>
        </>
      )}

      <ExperienceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        editing={editing}
      />

      <Modal open={Boolean(viewItem)} onClose={() => setViewItem(null)} title={viewItem?.company ?? '面经详情'}>
        {viewItem && (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
            <p><span className="text-[var(--color-admin-muted)]">岗位：</span>{viewItem.position}</p>
            <p><span className="text-[var(--color-admin-muted)]">摘要：</span>{viewItem.summary}</p>
            <div className="rounded-lg bg-[var(--color-admin-surface-alt)] p-3 leading-relaxed whitespace-pre-wrap text-[var(--color-admin-text-secondary)]">
              {viewItem.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

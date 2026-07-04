import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, Archive, Pencil, RefreshCw, FileQuestion, ShieldCheck, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { api, type Question } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { QuestionAdminPreview } from '../../components/admin/QuestionAdminPreview'
import { getQuestionQualityMeta } from '../../components/admin/questionAdminUtils'
import {
  AdminKpiTile,
  AdminBarChart,
  AdminDonutChart,
  AdminChartCard,
  AdminSegmentBar,
  countByField,
} from '../../components/admin/AdminCharts'
import {
  AdminViewToggle,
  AdminCardGrid,
  AdminContentCard,
} from '../../components/admin/AdminViewToggle'
import { useAdminViewMode } from '../../components/admin/useAdminViewMode'
import { AdminCategoryTag, AdminDifficultyTag, AdminQualityPill } from '../../components/admin/AdminBadges'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import { AdminIconButton } from '../../components/admin/AdminToolbar'
import { AdminButton, AdminButtonLink } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

type OutletCtx = { refreshBadges?: () => void }

import { adminZincColor } from '../../components/admin/adminChartColors'

const TABLE_VARIANT = 'elevated' as const

export function AdminQuestionsPage() {
  const { refreshBadges } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const [items, setItems] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useAdminViewMode('admin-questions', 'table')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listReviewQuestions('review')
      setItems(res.items)
      setExpandedId((prev) => prev ?? res.items[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    let complete = 0
    for (const q of items) {
      if (getQuestionQualityMeta(q).complete) complete++
    }
    return { total: items.length, complete, incomplete: items.length - complete }
  }, [items])

  const categoryBars = useMemo(
    () =>
      countByField(items, (q) => q.category).map((c, i) => ({
        ...c,
        color: adminZincColor(i),
      })),
    [items],
  )

  const qualitySegments = useMemo(
    () => [
      { label: '质量完整', value: stats.complete, color: '#fafafa' },
      { label: '待补全', value: stats.incomplete, color: '#71717a' },
    ],
    [stats],
  )

  const review = async (id: string, action: 'approve' | 'reject' | 'archive') => {
    try {
      await api.reviewQuestion(id, action)
      const labels = { approve: '已发布', reject: '已退回草稿', archive: '已归档' }
      showToast(labels[action], 'success')
      refreshBadges?.()
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (loading) return <Loading text="加载审核队列..." />

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
          </div>
        }
      />

      {items.length === 0 ? (
        <AdminEmptyState
          icon={ShieldCheck}
          title="暂无待审核题目"
          description="在「题库管理」中选择「提交审核」后，题目会出现在这里"
          action={
            <AdminButtonLink to="/admin/manage" size="sm" variant="secondary">前往题库管理</AdminButtonLink>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <AdminKpiTile label="待审核" value={stats.total} icon={Clock} />
            <AdminKpiTile label="质量完整" value={stats.complete} icon={ShieldCheck} />
            <AdminKpiTile label="待补全" value={stats.incomplete} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminChartCard>
              <AdminDonutChart
                title="质量分布"
                icon={ShieldCheck}
                segments={qualitySegments}
                centerValue={stats.total}
                centerLabel="待审"
              />
              <div className="mt-4">
                <AdminSegmentBar segments={qualitySegments} height={8} />
              </div>
            </AdminChartCard>
            <AdminChartCard>
              <AdminBarChart title="方向分布" icon={FileQuestion} items={categoryBars} showPct />
            </AdminChartCard>
          </div>

          {viewMode === 'table' ? (
            <AdminTable variant={TABLE_VARIANT} footer={`共 ${items.length} 条待审核`} minWidth="880px">
              <AdminTableHead variant={TABLE_VARIANT}>
                <AdminTh variant={TABLE_VARIANT} className="w-8" />
                <AdminTh variant={TABLE_VARIANT}>题目</AdminTh>
                <AdminTh variant={TABLE_VARIANT}>方向</AdminTh>
                <AdminTh variant={TABLE_VARIANT}>难度</AdminTh>
                <AdminTh variant={TABLE_VARIANT}>质量</AdminTh>
                <AdminTh variant={TABLE_VARIANT} className="text-right">操作</AdminTh>
              </AdminTableHead>
              <tbody>
                {items.map((q) => {
                  const expanded = expandedId === q.id
                  const meta = getQuestionQualityMeta(q)
                  return (
                    <Fragment key={q.id}>
                      <AdminTr variant={TABLE_VARIANT}>
                        <AdminTd dense>
                          <button
                            type="button"
                            onClick={() => toggleExpand(q.id)}
                            className="rounded-lg p-1 text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text"
                            aria-label={expanded ? '收起预览' : '展开预览'}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </AdminTd>
                        <AdminTd dense className="max-w-[320px]">
                          <button
                            type="button"
                            onClick={() => toggleExpand(q.id)}
                            className="text-left text-sm font-medium text-admin-text hover:text-admin-brand"
                          >
                            {q.title}
                          </button>
                        </AdminTd>
                        <AdminTd dense>
                          <AdminCategoryTag>{q.category}</AdminCategoryTag>
                        </AdminTd>
                        <AdminTd dense>
                          <AdminDifficultyTag difficulty={q.difficulty} />
                        </AdminTd>
                        <AdminTd dense>
                          <AdminQualityPill complete={meta.complete} missing={meta.missing} />
                        </AdminTd>
                        <AdminTd dense>
                          <div className="flex justify-end gap-1">
                            <AdminIconButton to={`/admin/manage/${q.id}`} title="编辑">
                              <Pencil className="h-4 w-4" strokeWidth={1.75} />
                            </AdminIconButton>
                            <AdminIconButton
                              title="发布"
                              onClick={() => review(q.id, 'approve')}
                            >
                              <Check className="h-4 w-4" strokeWidth={1.75} />
                            </AdminIconButton>
                            <AdminIconButton
                              title="退回草稿"
                              onClick={() => review(q.id, 'reject')}
                            >
                              <X className="h-4 w-4" strokeWidth={1.75} />
                            </AdminIconButton>
                            <AdminIconButton
                              danger
                              title="归档"
                              onClick={() => review(q.id, 'archive')}
                            >
                              <Archive className="h-4 w-4" strokeWidth={1.75} />
                            </AdminIconButton>
                          </div>
                        </AdminTd>
                      </AdminTr>
                      {expanded && (
                        <AdminTr variant={TABLE_VARIANT}>
                          <AdminTd colSpan={6} className="!py-4 bg-admin-surface-alt/40">
                            <QuestionAdminPreview question={q} compact />
                          </AdminTd>
                        </AdminTr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </AdminTable>
          ) : (
            <AdminCardGrid>
              {items.map((q) => {
                const meta = getQuestionQualityMeta(q)
                return (
                  <AdminContentCard key={q.id}>
                    <h3 className="line-clamp-2 font-bold text-[var(--color-admin-text)]">{q.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <AdminCategoryTag>{q.category}</AdminCategoryTag>
                      <AdminDifficultyTag difficulty={q.difficulty} />
                      <AdminQualityPill complete={meta.complete} missing={meta.missing} />
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs text-[var(--color-admin-muted)]">{q.content}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--color-admin-border-light)] pt-3">
                      <AdminButtonLink to={`/admin/manage/${q.id}`} size="sm" variant="secondary">编辑</AdminButtonLink>
                      <AdminButton size="sm" onClick={() => review(q.id, 'approve')}>发布</AdminButton>
                      <AdminButton size="sm" variant="secondary" onClick={() => review(q.id, 'reject')}>退回</AdminButton>
                    </div>
                  </AdminContentCard>
                )
              })}
            </AdminCardGrid>
          )}
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { categoryToSlug } from '../../components/question-bank/bankCatalog'
import {
  Plus, Pencil, Trash2, ExternalLink, BookOpen, CheckCircle2,
  Clock, Archive, ShieldCheck, Layers, FileQuestion,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type Question, type AdminQuestionOverview } from '../../api/client'
import {
  AdminCategoryTag,
  AdminDifficultyTag,
  AdminQualityPill,
  AdminStatusPill,
} from '../../components/admin/AdminBadges'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import {
  AdminToolbar,
  AdminFilterPills,
  AdminIconButton,
  AdminBulkBar,
  AdminFilterCard,
  AdminSelect,
} from '../../components/admin/AdminToolbar'
import {
  AdminKpiTile,
  AdminBarChart,
  AdminDonutChart,
  AdminChartCard,
  AdminSegmentBar,
} from '../../components/admin/AdminCharts'
import {
  AdminViewToggle,
  AdminCardGrid,
  AdminContentCard,
} from '../../components/admin/AdminViewToggle'
import { useAdminViewMode } from '../../components/admin/useAdminViewMode'
import { useAdminManageTab } from '../../components/admin/useAdminManageTab'
import { ADMIN_PAGE_SIZE_OPTIONS, useAdminPageSize } from '../../components/admin/useAdminPageSize'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminTabs } from '../../components/admin/AdminTabs'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { useToast } from '../../contexts/ToastContext'
import {
  ADMIN_CATEGORIES,
  QUESTION_STATUS_LABEL,
  adminLayout,
} from '../../components/admin/adminTheme'
import { QUESTION_STATUSES } from '../../components/admin/questionFormUtils'
import { ADMIN_STATUS_CHART, ADMIN_DIFFICULTY_CHART, adminZincColor } from '../../components/admin/adminChartColors'
import { AdminButton, AdminButtonLink } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

const STATUS_OPTIONS = ['全部', ...QUESTION_STATUSES] as const
const TABLE_VARIANT = 'elevated' as const

type GlobalStats = AdminQuestionOverview

function QuestionRowActions({
  q,
  onDelete,
}: {
  q: Question
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
      {q.status === 'published' && (() => {
        const slug = categoryToSlug(q.category) ?? 'java'
        return (
          <Link to={`/questions/${slug}?id=${q.id}`} target="_blank" title="预览">
            <AdminIconButton title="预览">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
            </AdminIconButton>
          </Link>
        )
      })()}
      <Link to={`/admin/manage/${q.id}`}>
        <AdminIconButton variant="edit" title="编辑">
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </AdminIconButton>
      </Link>
      <AdminIconButton variant="danger" title="删除" onClick={onDelete}>
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </AdminIconButton>
    </div>
  )
}

export function AdminQuestionManagePage() {
  const { showToast } = useToast()
  const [tab, setTab] = useAdminManageTab('list')
  const [items, setItems] = useState<Question[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({})
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('全部')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useAdminPageSize('admin-manage', 12)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [viewMode, setViewMode] = useAdminViewMode('admin-manage', 'card')

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      setGlobalStats(await api.getAdminQuestionOverview())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    if (tab !== 'list') return
    setLoading(true)
    try {
      const res = await api.listQuestions({
        search: search || undefined,
        status: statusFilter === '全部' ? undefined : statusFilter,
        category: categoryFilter === '全部' ? undefined : categoryFilter,
        page,
        pageSize,
      })
      setItems(res.items)
      setListTotal(res.total ?? res.items.length)
      setCountsByStatus(res.countsByStatus ?? {})
      if (res.page && res.page !== page) setPage(res.page)
    } finally {
      setLoading(false)
    }
  }, [tab, search, statusFilter, categoryFilter, page, pageSize])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [search, statusFilter, categoryFilter, tab, pageSize])

  const filteredTotal = useMemo(() => {
    if (statusFilter === '全部') {
      return Object.values(countsByStatus).reduce((sum, n) => sum + n, 0)
    }
    return listTotal
  }, [countsByStatus, listTotal, statusFilter])

  const categoryBars = useMemo(() => {
    if (!globalStats) return []
    return Object.entries(globalStats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: adminZincColor(i),
      }))
  }, [globalStats])

  const difficultyBars = useMemo(() => {
    if (!globalStats) return []
    return Object.entries(globalStats.byDifficulty).map(([label, value]) => ({
      label,
      value,
      color: ADMIN_DIFFICULTY_CHART[label] ?? '#71717a',
    }))
  }, [globalStats])

  const statusSegments = useMemo(() => {
    if (!globalStats) return []
    return Object.entries(globalStats.byStatus).map(([status, value]) => ({
      label: QUESTION_STATUS_LABEL[status] ?? status,
      value,
      color: ADMIN_STATUS_CHART[status] ?? '#71717a',
    }))
  }, [globalStats])

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这道题目吗？此操作不可恢复。')) return
    await api.deleteQuestion(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    load()
    loadStats()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    const pageIds = items.map((q) => q.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  const handleBulkStatus = async (status: string) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`确定将 ${ids.length} 道题设为「${QUESTION_STATUS_LABEL[status] ?? status}」？`)) return
    setBulkLoading(true)
    try {
      const res = await api.bulkUpdateQuestionStatus(ids, status)
      showToast(`已更新 ${res.updated} 道题`, 'success')
      setSelectedIds(new Set())
      load()
      loadStats()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '批量更新失败', 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  const qualityPct = globalStats && globalStats.total > 0
    ? Math.round((globalStats.qualityComplete / globalStats.total) * 100)
    : 0

  const pageAllSelected =
    items.length > 0 && items.every((q) => selectedIds.has(q.id))

  const handlePageSizeChange = (next: number) => {
    setPageSize(next as typeof pageSize)
    setPage(1)
  }

  return (
    <div className={adminLayout.stackGap}>
      <AdminPageToolbar />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTabs
          tabs={[
            { value: 'overview', label: '数据看板' },
            { value: 'list', label: '题目列表', count: globalStats?.total ?? listTotal },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'list' && <AdminViewToggle value={viewMode} onChange={setViewMode} />}
          <AdminButtonLink to="/admin/import" variant="secondary" size="sm">智能导入</AdminButtonLink>
          <AdminButtonLink to="/admin/manage/new" size="sm">
            <Plus className="h-4 w-4" />
            新增题目
          </AdminButtonLink>
        </div>
      </div>

      {tab === 'overview' && (
        statsLoading ? (
          <Loading text="加载看板..." />
        ) : globalStats ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <AdminKpiTile
                label="题库总量"
                value={globalStats.total}
                sub={`已发布 ${globalStats.byStatus.published ?? 0}`}
                icon={BookOpen}
              />
              <AdminKpiTile
                label="待审核"
                value={globalStats.byStatus.review ?? 0}
                icon={Clock}
              />
              <AdminKpiTile
                label="质量完整"
                value={`${qualityPct}%`}
                sub={`${globalStats.qualityComplete} 题含参考答案`}
                icon={ShieldCheck}
              />
              <AdminKpiTile
                label="已归档"
                value={globalStats.byStatus.archived ?? 0}
                icon={Archive}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AdminChartCard className="lg:col-span-2">
                <div className="p-6">
                  <AdminBarChart
                    title="方向分布"
                    icon={Layers}
                    items={categoryBars}
                    total={globalStats.total}
                  />
                </div>
              </AdminChartCard>

              <AdminChartCard>
                <div className="p-6">
                  <AdminDonutChart
                    title="状态分布"
                    icon={CheckCircle2}
                    segments={statusSegments}
                    centerValue={globalStats.total}
                    centerLabel="总题数"
                  />
                  <div className="mt-4">
                    <AdminSegmentBar segments={statusSegments} height={8} />
                  </div>
                </div>
              </AdminChartCard>
            </div>

            {difficultyBars.length > 0 && (
              <AdminChartCard>
                <div className="p-6">
                  <AdminBarChart title="难度分布" icon={BookOpen} items={difficultyBars} showPct />
                </div>
              </AdminChartCard>
            )}
          </>
        ) : null
      )}

      {tab === 'list' && (
        <>
          <AdminFilterCard>
            <AdminToolbar
              variant="elevated"
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索标题或内容..."
            >
              <AdminSelect compact value={categoryFilter} onChange={setCategoryFilter}>
                <option value="全部">全部方向</option>
                {ADMIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </AdminSelect>
            </AdminToolbar>

            <div className="mt-4">
              <AdminFilterPills
                variant="tabs"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                label={(s) => (s === '全部' ? '全部状态' : QUESTION_STATUS_LABEL[s])}
                count={(s) => (s === '全部' ? filteredTotal : countsByStatus[s] ?? 0)}
              />
            </div>
          </AdminFilterCard>

          <AdminBulkBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
            <AdminButton size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkStatus('review')}>
              提交审核
            </AdminButton>
            <AdminButton size="sm" disabled={bulkLoading} onClick={() => handleBulkStatus('published')}>
              批量发布
            </AdminButton>
            <AdminButton size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkStatus('archived')}>
              归档
            </AdminButton>
          </AdminBulkBar>

          {loading ? (
            <Loading text="加载题目..." />
          ) : items.length === 0 ? (
            <AdminEmptyState
              icon={FileQuestion}
              title="暂无题目"
              description="调整筛选条件，或新增一道题目开始录入"
              action={
                <AdminButtonLink to="/admin/manage/new" size="sm">新增题目</AdminButtonLink>
              }
            />
          ) : viewMode === 'table' ? (
            <>
              <AdminTable variant={TABLE_VARIANT} minWidth="800px">
                <AdminTableHead variant={TABLE_VARIANT}>
                  <AdminTh variant={TABLE_VARIANT} className="w-10">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 rounded border-admin-border text-admin-brand focus:ring-admin-brand/30"
                    />
                  </AdminTh>
                  <AdminTh variant={TABLE_VARIANT}>题目</AdminTh>
                  <AdminTh variant={TABLE_VARIANT}>方向</AdminTh>
                  <AdminTh variant={TABLE_VARIANT}>难度</AdminTh>
                  <AdminTh variant={TABLE_VARIANT}>状态</AdminTh>
                  <AdminTh variant={TABLE_VARIANT}>质量</AdminTh>
                  <AdminTh variant={TABLE_VARIANT} className="text-right">操作</AdminTh>
                </AdminTableHead>
                <tbody>
                  {items.map((q) => {
                    const qualityOk = Boolean(q.keyPoints?.length) && Boolean(q.referenceAnswer?.trim())
                    return (
                      <AdminTr key={q.id} selected={selectedIds.has(q.id)} variant={TABLE_VARIANT}>
                        <AdminTd>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleSelect(q.id)}
                            className="h-4 w-4 rounded border-admin-border text-admin-brand focus:ring-admin-brand/30"
                          />
                        </AdminTd>
                        <AdminTd className="max-w-[280px]">
                          <Link
                            to={`/admin/manage/${q.id}`}
                            className="block truncate font-semibold text-admin-text hover:text-admin-brand"
                          >
                            {q.title}
                          </Link>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-admin-muted">{q.id}</p>
                        </AdminTd>
                        <AdminTd><AdminCategoryTag>{q.category}</AdminCategoryTag></AdminTd>
                        <AdminTd><AdminDifficultyTag difficulty={q.difficulty} /></AdminTd>
                        <AdminTd><AdminStatusPill status={q.status ?? 'draft'} /></AdminTd>
                        <AdminTd><AdminQualityPill complete={qualityOk} /></AdminTd>
                        <AdminTd>
                          <QuestionRowActions q={q} onDelete={() => handleDelete(q.id)} />
                        </AdminTd>
                      </AdminTr>
                    )
                  })}
                </tbody>
              </AdminTable>
              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={listTotal}
                onPageChange={setPage}
                pageSizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
                onPageSizeChange={handlePageSizeChange}
                className="mt-4"
              />
            </>
          ) : (
            <>
              <AdminCardGrid>
                {items.map((q) => {
                  const qualityOk = Boolean(q.keyPoints?.length) && Boolean(q.referenceAnswer?.trim())
                  return (
                    <AdminContentCard key={q.id}>
                      <div className="mb-3 flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-admin-border text-admin-brand focus:ring-admin-brand/30"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/admin/manage/${q.id}`}
                            className="line-clamp-2 font-bold text-admin-text hover:text-admin-brand"
                          >
                            {q.title}
                          </Link>
                          <p className="mt-1 font-mono text-[10px] text-admin-muted">{q.id}</p>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <AdminCategoryTag>{q.category}</AdminCategoryTag>
                        <AdminDifficultyTag difficulty={q.difficulty} />
                        <AdminStatusPill status={q.status ?? 'draft'} />
                        <AdminQualityPill complete={qualityOk} />
                      </div>

                      {q.tags.length > 0 && (
                        <p className="mb-3 line-clamp-1 text-[11px] text-admin-muted">
                          {q.tags.join(' · ')}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 border-t border-admin-border pt-3">
                        <QuestionRowActions q={q} onDelete={() => handleDelete(q.id)} />
                      </div>
                    </AdminContentCard>
                  )
                })}
              </AdminCardGrid>
              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={listTotal}
                onPageChange={setPage}
                pageSizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
                onPageSizeChange={handlePageSizeChange}
                className="mt-4"
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

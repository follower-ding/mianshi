import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Briefcase, RefreshCw, Building2, Send, CheckCircle2, Target,
  FileText, User, Plus, Pencil, Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type JobApplication, type JobPosting } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { JobFormModal } from '../../components/admin/JobFormModal'
import { AdminIconButton, AdminToolbar, AdminFilterCard } from '../../components/admin/AdminToolbar'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminDataTable, type AdminColumnDef } from '../../components/admin/AdminDataTable'
import type { AdminFacetDef } from '../../components/admin/AdminFacetedFilter'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminChartCard,
  AdminSegmentBar,
  countByField,
  JOB_STATUS_COLORS,
} from '../../components/admin/AdminCharts'
import { Badge } from '../../components/ui/Badge'
import { AdminButton } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

const STATUS_LABEL: Record<string, string> = {
  applied: '已投递',
  viewed: 'HR 已查看',
  interview_invited: '面试邀请',
  interview_done: '面试完成',
  rejected: '未通过',
  offer: '已发 Offer',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  applied: 'default',
  viewed: 'warning',
  interview_invited: 'success',
  interview_done: 'success',
  rejected: 'danger',
  offer: 'success',
}

export function AdminJobsPage() {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.listJobs(),
        api.getAdminJobApplications(),
      ])
      setJobs(jobsRes.items)
      setApplications(appsRes.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const published = jobs.filter((j) => j.status === 'published').length
    const interviewDone = applications.filter((a) => a.status === 'interview_done').length
    const offer = applications.filter((a) => a.status === 'offer').length
    return { published, totalApps: applications.length, interviewDone, offer }
  }, [jobs, applications])

  const statusSegments = useMemo(() => {
    const counts = countByField(applications, (a) => a.status)
    return counts.map((c) => ({
      label: STATUS_LABEL[c.label] ?? c.label,
      value: c.value,
      color: JOB_STATUS_COLORS[c.label] ?? '#94a3b8',
    }))
  }, [applications])

  const appFacets: AdminFacetDef<JobApplication>[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        getValue: (a) => a.status,
        labelFor: (v) => STATUS_LABEL[v] ?? v,
      },
      {
        id: 'company',
        label: '公司',
        getValue: (a) => a.job?.company ?? '未知',
      },
    ],
    [],
  )

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return applications
    const q = search.toLowerCase()
    return applications.filter(
      (app) =>
        (app.job?.title ?? '').toLowerCase().includes(q) ||
        (app.job?.company ?? '').toLowerCase().includes(q) ||
        app.userId.toLowerCase().includes(q),
    )
  }, [applications, search])

  const internalJobs = useMemo(() => jobs.filter((j) => j.source !== 'boss'), [jobs])

  const openCreate = () => {
    setEditingJob(null)
    setFormOpen(true)
  }

  const openEdit = (job: JobPosting) => {
    setEditingJob(job)
    setFormOpen(true)
  }

  const handleDeleteJob = async (job: JobPosting) => {
    if (!window.confirm(`确定删除岗位「${job.title}」？`)) return
    try {
      await api.deleteAdminJob(job.id)
      showToast('岗位已删除', 'success')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败', 'error')
    }
  }

  if (loading) return <Loading text="加载职位数据..." />

  const appColumns: AdminColumnDef<JobApplication>[] = [
    {
      id: 'job',
      header: '岗位',
      sortValue: (a) => a.job?.title ?? a.jobId,
      cell: (app) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-brand-light">
            <Briefcase className="h-4 w-4 text-admin-brand" strokeWidth={1.75} />
          </div>
          <span className="font-medium text-admin-text">{app.job?.title ?? app.jobId}</span>
        </div>
      ),
    },
    {
      id: 'company',
      header: '公司',
      sortValue: (a) => a.job?.company ?? '',
      cell: (app) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-admin-muted" />
          {app.job?.company ?? '—'}
        </div>
      ),
    },
    {
      id: 'user',
      header: '用户',
      sortValue: (a) => a.userId,
      cell: (app) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <User className="h-3.5 w-3.5 text-admin-muted" />
          {app.userId.slice(0, 8)}…
        </div>
      ),
    },
    {
      id: 'status',
      header: '状态',
      sortValue: (a) => a.status,
      cell: (app) => (
        <Badge variant={STATUS_VARIANT[app.status] ?? 'default'}>
          {STATUS_LABEL[app.status] ?? app.status}
        </Badge>
      ),
    },
    {
      id: 'appliedAt',
      header: '投递时间',
      sortValue: (a) => a.appliedAt,
      cell: (app) => (
        <span className="text-xs text-admin-muted">
          {new Date(app.appliedAt).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      id: 'report',
      header: '报告',
      cell: (app) =>
        app.reportId ? (
          <Link
            to={`/reports/${app.reportId}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-admin-brand)] hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            查看
          </Link>
        ) : (
          <span className="text-xs text-[var(--color-admin-muted)]">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <div className="flex gap-2">
            <AdminButton size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              发布岗位
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </AdminButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminKpiTile label="在招岗位" value={stats.published} sub={`共 ${jobs.length} 个岗位`} icon={Building2} />
        <AdminKpiTile label="总投递数" value={stats.totalApps} icon={Send} />
        <AdminKpiTile label="模拟面试完成" value={stats.interviewDone} icon={CheckCircle2} />
        <AdminKpiTile label="Offer" value={stats.offer} icon={Target} />
      </div>

      {applications.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminChartCard>
            <AdminDonutChart
              title="投递状态分布"
              icon={Briefcase}
              segments={statusSegments}
              centerValue={stats.totalApps}
              centerLabel="投递"
            />
            <div className="mt-4">
              <AdminSegmentBar segments={statusSegments} height={10} />
            </div>
          </AdminChartCard>

          <AdminChartCard>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--color-admin-text)]">
              <Briefcase className="h-4 w-4 text-[var(--color-admin-brand)]" strokeWidth={1.75} />
              投递漏斗
            </h3>
            <div className="space-y-3">
              {['applied', 'viewed', 'interview_invited', 'interview_done', 'offer'].map((status, i) => {
                const count = applications.filter((a) => a.status === status).length
                const pct = stats.totalApps > 0 ? Math.round((count / stats.totalApps) * 100) : 0
                const color = JOB_STATUS_COLORS[status] ?? '#94a3b8'
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs font-medium text-[var(--color-admin-text-secondary)]">
                      {STATUS_LABEL[status]}
                    </span>
                    <div className="flex-1">
                      <div className="h-7 overflow-hidden rounded-lg bg-[var(--color-admin-surface-alt)]">
                        <div
                          className="flex h-full items-center rounded-lg px-2 text-[10px] font-bold text-white transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, count > 0 ? 12 : 0)}%`,
                            background: color,
                            opacity: 1 - i * 0.08,
                          }}
                        >
                          {count > 0 && count}
                        </div>
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--color-admin-muted)]">
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </AdminChartCard>
        </div>
      )}

      <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-admin-text)]">
        <Building2 className="h-5 w-5 text-[var(--color-admin-brand)]" />
        内部岗位
        <span className="text-sm font-normal text-[var(--color-admin-muted)]">({internalJobs.length})</span>
      </h2>

      {internalJobs.length === 0 ? (
        <AdminEmptyState
          icon={Briefcase}
          title="暂无内部岗位"
          description="点击「发布岗位」创建可编辑的在招岗位"
          action={<AdminButton size="sm" onClick={openCreate}>发布岗位</AdminButton>}
        />
      ) : (
        <AdminTable variant="elevated">
          <AdminTableHead variant="elevated">
            <AdminTh variant="elevated">岗位</AdminTh>
            <AdminTh variant="elevated">公司</AdminTh>
            <AdminTh variant="elevated">城市</AdminTh>
            <AdminTh variant="elevated">状态</AdminTh>
            <AdminTh variant="elevated" className="text-right">操作</AdminTh>
          </AdminTableHead>
          <tbody>
            {internalJobs.map((job) => (
              <AdminTr key={job.id} variant="elevated">
                <AdminTd dense className="font-medium">{job.title}</AdminTd>
                <AdminTd dense>{job.company}</AdminTd>
                <AdminTd dense>{job.city || '—'}</AdminTd>
                <AdminTd dense>
                  <Badge variant={job.status === 'published' ? 'success' : job.status === 'closed' ? 'default' : 'warning'}>
                    {job.status === 'published' ? '已发布' : job.status === 'closed' ? '已关闭' : '草稿'}
                  </Badge>
                </AdminTd>
                <AdminTd dense>
                  <div className="flex justify-end gap-1">
                    <AdminIconButton title="编辑" onClick={() => openEdit(job)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </AdminIconButton>
                    <AdminIconButton danger title="删除" onClick={() => handleDeleteJob(job)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </AdminIconButton>
                  </div>
                </AdminTd>
              </AdminTr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <AdminFilterCard>
        <AdminToolbar
          variant="elevated"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜索岗位、公司、用户…"
        />
      </AdminFilterCard>

      <h2 className="flex items-center gap-2 text-base font-semibold text-admin-text">
        <Briefcase className="h-5 w-5 text-[var(--color-admin-brand)]" />
        投递记录
        <span className="text-sm font-normal text-[var(--color-admin-muted)]">
          ({searchFiltered.length} 条)
        </span>
      </h2>

      {applications.length === 0 ? (
        <AdminEmptyState
          icon={Send}
          title="暂无投递记录"
          description="用户在前台「智能投递」投递后会出现在这里"
        />
      ) : (
        <AdminDataTable
          columns={appColumns}
          data={searchFiltered}
          facets={appFacets}
          getRowKey={(a) => a.id}
          variant="elevated"
        />
      )}

      <JobFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          showToast(editingJob ? '岗位已更新' : '岗位已发布', 'success')
          load()
        }}
        editing={editingJob}
      />
    </div>
  )
}

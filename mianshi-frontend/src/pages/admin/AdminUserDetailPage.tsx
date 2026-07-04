import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, CalendarDays, ClipboardList, FileText, Briefcase,
} from 'lucide-react'
import { api, type AdminUserDetail } from '../../api/client'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminKpiTile } from '../../components/admin/AdminCharts'
import { AdminCardGrid, AdminContentCard } from '../../components/admin/AdminViewToggle'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import { Badge } from '../../components/ui/Badge'
import { AdminButtonLink } from '../../components/admin/AdminButton'
import { Loading, EmptyState } from '../../components/ui/Loading'

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getAdminUser(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  if (error) {
    return (
      <EmptyState title="加载失败" description={error} action={<AdminButtonLink to="/admin/users">返回列表</AdminButtonLink>} />
    )
  }

  if (!data) return <Loading text="加载用户详情..." />

  const { user, stats, recentReports, resumes } = data

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        actions={
          <AdminButtonLink to="/admin/users" variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" />
              返回</AdminButtonLink>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-admin-border-light)] bg-[var(--color-admin-surface)] p-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
            user.role === 'admin' ? 'bg-admin-surface-alt text-admin-text ring-1 ring-admin-border' : 'bg-admin-surface-alt text-admin-text ring-1 ring-admin-border'
          }`}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="flex items-center gap-2 font-semibold text-[var(--color-admin-text)]">
            {user.name}
            {user.role === 'admin' && (
              <Badge variant="warning">管理员</Badge>
            )}
          </p>
          <p className="flex items-center gap-1 text-sm text-[var(--color-admin-muted)]">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </p>
          <p className="flex items-center gap-1 text-xs text-[var(--color-admin-muted)]">
            <CalendarDays className="h-3.5 w-3.5" />
            注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminKpiTile label="面试报告" value={stats.reports} icon={ClipboardList} />
        <AdminKpiTile label="简历数量" value={stats.resumes} icon={FileText} />
        <AdminKpiTile label="职位投递" value={stats.applications} icon={Briefcase} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-admin-text)]">
            <ClipboardList className="h-4 w-4" />
            最近面试报告
          </h2>
          {recentReports.length === 0 ? (
            <p className="text-sm text-[var(--color-admin-muted)]">暂无报告</p>
          ) : (
            <AdminTable variant="elevated">
              <AdminTableHead variant="elevated">
                <AdminTh variant="elevated">岗位</AdminTh>
                <AdminTh variant="elevated">得分</AdminTh>
                <AdminTh variant="elevated">时间</AdminTh>
              </AdminTableHead>
              <tbody>
                {recentReports.map((r) => (
                  <AdminTr key={r.id} variant="elevated">
                    <AdminTd>{r.position}</AdminTd>
                    <AdminTd className="font-bold tabular-nums text-[var(--color-admin-brand)]">{r.totalScore}</AdminTd>
                    <AdminTd className="text-xs text-[var(--color-admin-muted)]">
                      {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-admin-text)]">
            <FileText className="h-4 w-4" />
            简历列表
          </h2>
          {resumes.length === 0 ? (
            <p className="text-sm text-[var(--color-admin-muted)]">暂无简历</p>
          ) : (
            <AdminCardGrid>
              {resumes.map((r) => (
                <AdminContentCard key={r.id}>
                  <p className="font-semibold text-[var(--color-admin-text)]">{r.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-admin-muted)]">
                    更新 {new Date(r.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </AdminContentCard>
              ))}
            </AdminCardGrid>
          )}
        </div>
      </div>
    </div>
  )
}

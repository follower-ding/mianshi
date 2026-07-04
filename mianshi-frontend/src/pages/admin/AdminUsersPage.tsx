import { useEffect, useMemo, useState } from 'react'
import {
  Users, Shield, UserPlus, RefreshCw, Mail, CalendarDays, Crown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type AdminUser } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminDataTable, type AdminColumnDef } from '../../components/admin/AdminDataTable'
import type { AdminFacetDef } from '../../components/admin/AdminFacetedFilter'
import { AdminToolbar, AdminFilterCard, AdminSelect } from '../../components/admin/AdminToolbar'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminSparkline,
  AdminChartCard,
  groupCountByDay,
} from '../../components/admin/AdminCharts'
import { adminAlertCx } from '../../components/admin/adminChartColors'
import { Badge } from '../../components/ui/Badge'
import { AdminButton } from '../../components/admin/AdminButton'
import { Loading } from '../../components/ui/Loading'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN')
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    api
      .listAdminUsers()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleRoleChange = async (target: AdminUser, role: 'user' | 'admin') => {
    if (target.role === role) return
    if (!window.confirm(`确定将 ${target.name} 设为${role === 'admin' ? '管理员' : '普通用户'}？`)) return

    setUpdatingId(target.id)
    try {
      await api.updateAdminUserRole(target.id, role)
      setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, role } : u)))
      showToast(`已设为${role === 'admin' ? '管理员' : '普通用户'}`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '更新失败', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    return {
      total: items.length,
      admins: items.filter((u) => u.role === 'admin').length,
      weekNew: items.filter((u) => new Date(u.createdAt).getTime() >= weekAgo).length,
    }
  }, [items])

  const roleSegments = useMemo(
    () => [
      { label: '普通用户', value: stats.total - stats.admins, color: '#a1a1aa' },
      { label: '管理员', value: stats.admins, color: '#fafafa' },
    ],
    [stats],
  )

  const registrationTrend = useMemo(
    () => groupCountByDay(items.map((u) => ({ createdAt: u.createdAt })), 14),
    [items],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [items, search])

  const userFacets: AdminFacetDef<AdminUser>[] = useMemo(
    () => [
      {
        id: 'role',
        label: '角色',
        getValue: (u) => u.role,
        labelFor: (v) => (v === 'admin' ? '管理员' : '普通用户'),
      },
    ],
    [],
  )

  const columns: AdminColumnDef<AdminUser>[] = useMemo(
    () => [
      {
        id: 'name',
        header: '用户',
        sortValue: (u) => u.name,
        cell: (u) => (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                u.role === 'admin'
                  ? 'bg-admin-surface-alt text-admin-text ring-1 ring-admin-border'
                  : 'bg-[var(--color-admin-brand-light)] text-[var(--color-admin-brand)]'
              }`}
            >
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="font-semibold text-[var(--color-admin-text)]">
                <Link to={`/admin/users/${u.id}`} className="hover:text-[var(--color-admin-brand)]">
                  {u.name}
                </Link>
                {u.id === currentUser?.id && (
                  <span className="ml-1 text-[11px] font-normal text-[var(--color-admin-muted)]">（我）</span>
                )}
              </span>
              {u.role === 'admin' && (
                <p className="flex items-center gap-0.5 text-[10px] text-admin-muted">
                  <Crown className="h-3 w-3" />
                  管理员
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'email',
        header: '邮箱',
        sortValue: (u) => u.email,
        cell: (u) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-[var(--color-admin-muted)]" />
            {u.email}
          </div>
        ),
      },
      {
        id: 'role',
        header: '角色',
        sortValue: (u) => u.role,
        cell: (u) =>
          u.id === currentUser?.id ? (
            u.role === 'admin' ? (
              <Badge variant="warning">管理员</Badge>
            ) : (
              <Badge>普通用户</Badge>
            )
          ) : (
            <AdminSelect
              compact
              className="max-w-[140px]"
              value={u.role}
              disabled={updatingId === u.id}
              onChange={(v) => handleRoleChange(u, v as 'user' | 'admin')}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </AdminSelect>
          ),
      },
      {
        id: 'createdAt',
        header: '注册时间',
        sortValue: (u) => u.createdAt,
        cell: (u) => (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-admin-muted)]">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(u.createdAt)}
          </div>
        ),
      },
    ],
    [currentUser?.id, updatingId],
  )

  if (loading) return <Loading text="加载用户..." />

  if (error) {
    return (
      <div className={`p-3 text-sm ${adminAlertCx.error}`}>
        {error}
        <p className="mt-1 text-xs opacity-80">用户列表需 PostgreSQL 模式；JSON 降级模式无用户表。</p>
      </div>
    )
  }

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
        <AdminEmptyState icon={Users} title="暂无用户" description="用户注册后会出现在此列表" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <AdminKpiTile label="注册用户" value={stats.total} icon={Users} />
            <AdminKpiTile label="管理员" value={stats.admins} sub="拥有后台权限" icon={Shield} />
            <AdminKpiTile label="近 7 天新增" value={stats.weekNew} icon={UserPlus} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminChartCard>
              <AdminDonutChart
                title="角色分布"
                icon={Crown}
                segments={roleSegments}
                centerValue={stats.total}
                centerLabel="用户"
              />
            </AdminChartCard>
            <AdminChartCard>
              <AdminSparkline
                title="近 14 天注册趋势"
                icon={UserPlus}
                data={registrationTrend.values}
                labels={registrationTrend.labels}
                height={80}
                color="#fafafa"
              />
            </AdminChartCard>
          </div>

          <AdminFilterCard>
            <AdminToolbar
              variant="elevated"
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="搜索姓名或邮箱…"
            />
          </AdminFilterCard>

          <AdminDataTable
            columns={columns}
            data={filtered}
            facets={userFacets}
            getRowKey={(u) => u.id}
            variant="elevated"
          />
        </>
      )}
    </div>
  )
}

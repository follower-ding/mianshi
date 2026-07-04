import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Link2Off, RefreshCw, Share2, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { api, type ResumeShareAdminItem } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import {
  AdminKpiTile,
  AdminDonutChart,
  AdminChartCard,
  AdminSegmentBar,
} from '../../components/admin/AdminCharts'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from '../../components/admin/AdminCard'
import { AdminIconButton } from '../../components/admin/AdminToolbar'
import { Badge } from '../../components/ui/Badge'
import { AdminButton } from '../../components/admin/AdminButton'
import { Loading, EmptyState } from '../../components/ui/Loading'

export function AdminResumeSharesPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<ResumeShareAdminItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listAdminResumeShares()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const active = items.filter((s) => !s.expired).length
    return { total: items.length, active, expired: items.length - active }
  }, [items])

  const segments = useMemo(
    () => [
      { label: '有效', value: stats.active, color: '#fafafa' },
      { label: '已过期', value: stats.expired, color: '#71717a' },
    ],
    [stats],
  )

  const revoke = async (token: string) => {
    if (!window.confirm('确定下架该分享链接？访客将无法再访问。')) return
    try {
      await api.revokeAdminResumeShare(token)
      showToast('已下架分享链接', 'success')
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  if (loading) return <Loading text="加载分享链接..." />

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminKpiTile label="分享总数" value={stats.total} icon={Share2} />
        <AdminKpiTile label="有效链接" value={stats.active} icon={CheckCircle2} />
        <AdminKpiTile label="已过期" value={stats.expired} icon={XCircle} />
      </div>

      {items.length > 0 && (
        <AdminChartCard className="max-w-sm">
          <AdminDonutChart title="链接状态" icon={Share2} segments={segments} centerValue={stats.total} centerLabel="链接" />
          <div className="mt-4">
            <AdminSegmentBar segments={segments} height={8} />
          </div>
        </AdminChartCard>
      )}

      {items.length === 0 ? (
        <EmptyState title="暂无公开分享" description="用户创建简历分享链接后会出现在这里" />
      ) : (
        <AdminTable variant="elevated">
          <AdminTableHead variant="elevated">
            <AdminTh variant="elevated">简历</AdminTh>
            <AdminTh variant="elevated">用户</AdminTh>
            <AdminTh variant="elevated">状态</AdminTh>
            <AdminTh variant="elevated">创建 / 过期</AdminTh>
            <AdminTh variant="elevated" className="text-right">操作</AdminTh>
          </AdminTableHead>
          <tbody>
            {items.map((s) => (
              <AdminTr key={s.token} variant="elevated">
                <AdminTd className="font-medium">{s.title}</AdminTd>
                <AdminTd className="font-mono text-xs">{s.userId.slice(0, 8)}…</AdminTd>
                <AdminTd>
                  <Badge variant={s.expired ? 'default' : 'success'}>{s.expired ? '已过期' : '有效'}</Badge>
                </AdminTd>
                <AdminTd className="text-xs text-[var(--color-admin-muted)]">
                  <p>{new Date(s.createdAt).toLocaleString('zh-CN')}</p>
                  {s.expiresAt && (
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.expiresAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center justify-end gap-1">
                    {!s.expired && (
                      <AdminIconButton to={`/r/${s.token}`} external title="打开">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </AdminIconButton>
                    )}
                    <AdminIconButton danger title="下架" onClick={() => revoke(s.token)}>
                      <Link2Off className="h-3.5 w-3.5" />
                    </AdminIconButton>
                  </div>
                </AdminTd>
              </AdminTr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  )
}

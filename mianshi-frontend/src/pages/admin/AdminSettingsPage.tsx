import { Link } from 'react-router-dom'
import { ArrowLeft, Monitor, Palette } from 'lucide-react'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { AdminButtonLink } from '../../components/admin/AdminButton'
import { AdminThemeToggle } from '../../components/admin/AdminThemeToggle'
import { useAdminShell } from '../../components/admin/AdminShellContext'
import { getAdminTeam } from '../../components/admin/adminTeams'

export function AdminSettingsPage() {
  const { colorMode, teamId } = useAdminShell()
  const team = getAdminTeam(teamId)

  return (
    <div className="space-y-6">
      <AdminPageToolbar />

      <div className="max-w-2xl space-y-4">
        <section className="rounded-lg border border-admin-border bg-admin-surface p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-admin-muted" />
              <h2 className="text-sm font-semibold text-admin-text">外观</h2>
            </div>
            <AdminThemeToggle />
          </div>
          <p className="text-sm text-admin-muted">
            当前：<strong className="font-medium text-admin-text">{colorMode === 'dark' ? '深色' : '浅色'}</strong>
            （Shadcn Admin zinc 色阶）。与用户端主题独立，仅作用于管理后台。
          </p>
          <p className="mt-2 text-xs text-admin-muted">
            也可点击顶栏太阳/月亮图标快速切换。
          </p>
        </section>

        <section className="rounded-lg border border-admin-border bg-admin-surface p-6">
          <h2 className="mb-2 text-sm font-semibold text-admin-text">工作区</h2>
          <p className="text-sm text-admin-muted">
            当前工作区：<strong className="text-admin-text">{team.name}</strong>（{team.plan}）
          </p>
          <p className="mt-1 text-xs text-admin-muted">在侧栏顶部 Team 切换器中更改（Demo 数据）。</p>
        </section>

        <section className="rounded-lg border border-admin-border bg-admin-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="size-4 text-admin-muted" />
            <h2 className="text-sm font-semibold text-admin-text">设计规范</h2>
          </div>
          <p className="mb-4 text-sm text-admin-muted">
            查看后台 Token、组件清单与禁止项，便于新页面保持一致风格。
          </p>
          <AdminButtonLink to="/design/admin" variant="secondary" size="sm">
            打开设计对比页
          </AdminButtonLink>
        </section>

        <Link
          to="/admin/system"
          className="inline-flex items-center gap-1.5 text-sm text-admin-muted transition hover:text-admin-text"
        >
          <ArrowLeft className="size-3.5" />
          系统监控
        </Link>
      </div>
    </div>
  )
}

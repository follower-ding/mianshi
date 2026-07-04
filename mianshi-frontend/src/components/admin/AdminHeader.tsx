import { NavLink } from 'react-router-dom'
import { Menu, Palette, Search, Settings } from 'lucide-react'
import { useAdminShell } from './AdminShellContext'
import { AdminUserMenu } from './AdminUserMenu'
import { AdminThemeToggle } from './AdminThemeToggle'
import { AdminNotificationsBell } from './AdminNotificationsBell'

const HEADER_NAV = [
  { to: '/admin', label: '概览', end: true },
  { to: '/admin/manage', label: '内容' },
  { to: '/admin/reports', label: '运营' },
  { to: '/admin/system', label: '系统' },
] as const

export function AdminHeader() {
  const { setCommandOpen, setMobileNavOpen } = useAdminShell()

  return (
    <header className="admin-header flex h-14 shrink-0 items-center gap-2 border-b border-admin-border px-3 lg:gap-4 lg:px-6">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text lg:hidden"
        aria-label="打开菜单"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="size-5" />
      </button>

      <nav className="hidden min-w-0 items-center gap-1 md:flex">
        {HEADER_NAV.map(({ to, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : false}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-admin-text'
                  : 'text-admin-muted hover:text-admin-text-secondary'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="relative hidden h-8 items-center rounded-md border border-admin-border bg-admin-surface-alt pl-8 pr-12 text-left text-sm text-admin-muted transition hover:border-admin-text/20 md:inline-flex md:w-44 lg:w-52"
        >
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <span>Search…</span>
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-admin-border bg-admin-surface px-1 font-mono text-[10px] lg:inline">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="inline-flex size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text md:hidden"
          aria-label="搜索"
        >
          <Search className="size-4" />
        </button>

        <AdminThemeToggle />

        <AdminNotificationsBell />

        <NavLink
          to="/design/admin"
          className="hidden size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text sm:inline-flex"
          title="设计规范"
        >
          <Palette className="size-4" />
        </NavLink>

        <NavLink
          to="/admin/settings"
          className="inline-flex size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text"
          title="设置"
        >
          <Settings className="size-4" />
        </NavLink>

        <AdminUserMenu />
      </div>
    </header>
  )
}

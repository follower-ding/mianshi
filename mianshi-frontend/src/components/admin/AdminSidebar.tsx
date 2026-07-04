import { Link, NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  ExternalLink,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ADMIN_NAV_GROUPS } from './adminNavConfig'
import { useAdminShell } from './AdminShellContext'
import { AdminTeamSwitcher } from './AdminTeamSwitcher'

type Props = {
  pendingReview?: number
  pendingCandidates?: number
  mobile?: boolean
  onNavigate?: () => void
}

function badgeFor(key: 'review' | 'candidates' | undefined, pendingReview: number, pendingCandidates: number) {
  if (key === 'review') return pendingReview
  if (key === 'candidates') return pendingCandidates
  return 0
}

export function AdminSidebarNav({
  pendingReview = 0,
  pendingCandidates = 0,
  mobile = false,
  onNavigate,
}: Props) {
  const { user } = useAuth()
  const { sidebarCollapsed, toggleSidebarCollapsed } = useAdminShell()
  const collapsed = !mobile && sidebarCollapsed

  return (
    <>
      <AdminTeamSwitcher collapsed={collapsed} onNavigate={onNavigate} />

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-xs font-medium text-admin-muted">{group.title}</p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, end, badgeKey }) => {
                const badge = badgeFor(badgeKey, pendingReview, pendingCandidates)
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    onClick={onNavigate}
                    className={`admin-nav-item flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium ${
                      collapsed ? 'justify-center px-0' : ''
                    }`}
                  >
                    <Icon className="admin-nav-icon size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {badge > 0 && (
                          <span className="admin-nav-badge rounded-md bg-admin-surface-alt px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-admin-text">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-admin-border p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-admin-border px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-admin-surface-alt text-xs font-medium text-admin-text">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 grid text-left text-sm leading-tight">
              <span className="truncate font-medium text-admin-text">
                {user?.name || user?.email?.split('@')[0]}
              </span>
              <span className="truncate text-xs text-admin-muted">{user?.email}</span>
            </div>
          </div>
        )}
        {!mobile && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="admin-nav-item mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium"
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-3.5 opacity-70" />
            ) : (
              <>
                <PanelLeftClose className="size-3.5 opacity-70" />
                收起侧栏
              </>
            )}
          </button>
        )}
        <FooterLink to="/" icon={ChevronLeft} label="返回用户端" collapsed={collapsed} onClick={onNavigate} />
        <FooterLink
          to="/design/admin"
          icon={Palette}
          label="设计规范"
          collapsed={collapsed}
          onClick={onNavigate}
        />
        <a
          href="/api/metrics?detailed=1"
          target="_blank"
          rel="noreferrer"
          className={`admin-nav-item flex h-8 items-center gap-2 rounded-md px-2 text-xs text-admin-muted ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Metrics API"
        >
          <FileText className="size-3.5" />
          {!collapsed && (
            <>
              Metrics API
              <ExternalLink className="ml-auto size-3 opacity-40" />
            </>
          )}
        </a>
      </div>
    </>
  )
}

export function AdminSidebar(props: Props) {
  return (
    <aside className="admin-sidebar hidden h-full w-[var(--admin-sidebar-width,240px)] shrink-0 flex-col border-r border-admin-border lg:flex">
      <div className="flex h-full min-h-0 flex-col">
        <AdminSidebarNav {...props} />
      </div>
    </aside>
  )
}

export function AdminMobileNav({ pendingReview = 0, pendingCandidates = 0 }: Props) {
  const { mobileNavOpen, setMobileNavOpen } = useAdminShell()
  if (!mobileNavOpen) return null

  const close = () => setMobileNavOpen(false)

  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <aside className="admin-sidebar absolute inset-y-0 left-0 flex w-[min(280px,85vw)] flex-col border-r border-admin-border bg-admin-sidebar-bg shadow-xl animate-slide-up">
        <div className="flex items-center justify-end border-b border-admin-border p-2">
          <button
            type="button"
            onClick={close}
            className="inline-flex size-8 items-center justify-center rounded-md text-admin-muted hover:bg-admin-surface-alt"
            aria-label="关闭菜单"
          >
            <X className="size-5" />
          </button>
        </div>
        <AdminSidebarNav
          pendingReview={pendingReview}
          pendingCandidates={pendingCandidates}
          mobile
          onNavigate={close}
        />
      </aside>
    </div>
  )
}

function FooterLink({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
}: {
  to: string
  icon: LucideIcon
  label: string
  collapsed?: boolean
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`admin-nav-item flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <Icon className="size-3.5 opacity-70" />
      {!collapsed && label}
    </Link>
  )
}

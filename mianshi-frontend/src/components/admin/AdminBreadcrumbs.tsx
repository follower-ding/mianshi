import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { ADMIN_NAV_GROUPS, adminPageTitle } from './adminNavConfig'

type Crumb = { label: string; to?: string }

function buildCrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Admin', to: '/admin' }]

  if (pathname === '/admin' || pathname === '/admin/') return crumbs

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        crumbs.push({ label: group.title })
        crumbs.push({ label: item.label, to: item.to })
        if (pathname !== item.to) {
          crumbs.push({ label: adminPageTitle(pathname) })
        }
        return crumbs
      }
    }
  }

  crumbs.push({ label: adminPageTitle(pathname) })
  return crumbs
}

export function AdminBreadcrumbs() {
  const { pathname } = useLocation()
  const crumbs = buildCrumbs(pathname)

  return (
    <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1 text-sm">
      <Link
        to="/admin"
        className="inline-flex shrink-0 items-center text-admin-muted transition hover:text-admin-text"
        title="数据看板"
      >
        <Home className="size-3.5" />
      </Link>
      {crumbs.slice(1).map((crumb, i) => {
        const isLast = i === crumbs.length - 2
        return (
          <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 text-admin-muted" />
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="truncate text-admin-muted transition hover:text-admin-text"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={`truncate ${isLast ? 'font-medium text-admin-text' : 'text-admin-muted'}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

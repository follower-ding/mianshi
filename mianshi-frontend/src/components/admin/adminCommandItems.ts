import type { LucideIcon } from 'lucide-react'
import { Home, LogOut, Plus, Search } from 'lucide-react'
import { ADMIN_NAV_GROUPS } from './adminNavConfig'

export type AdminCommandItem = {
  id: string
  label: string
  keywords?: string
  to?: string
  href?: string
  icon?: LucideIcon
  action?: 'logout'
}

export function buildAdminCommandItems(): AdminCommandItem[] {
  const items: AdminCommandItem[] = []

  for (const group of ADMIN_NAV_GROUPS) {
    for (const nav of group.items) {
      items.push({
        id: nav.to,
        label: nav.label,
        keywords: `${group.title} ${nav.label}`,
        to: nav.to,
        icon: nav.icon,
      })
    }
  }

  items.push(
    { id: 'new-question', label: '新增题目', keywords: '创建 录入', to: '/admin/manage/new', icon: Plus },
    { id: 'user-home', label: '返回用户端', keywords: '首页', to: '/', icon: Home },
    { id: 'logout', label: '退出登录', keywords: '登出 sign out', icon: LogOut, action: 'logout' },
  )

  return items
}

export function filterCommandItems(items: AdminCommandItem[], query: string): AdminCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords?.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q),
  )
}

export const COMMAND_SEARCH_ICON = Search

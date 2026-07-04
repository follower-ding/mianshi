import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BookOpen,
  Briefcase,
  ClipboardList,
  Download,
  FileQuestion,
  LayoutDashboard,
  Settings2,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'

export type AdminNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badgeKey?: 'review' | 'candidates'
}

export type AdminNavGroup = {
  id: string
  title: string
  items: AdminNavItem[]
  defaultOpen?: boolean
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview',
    title: '概览',
    defaultOpen: true,
    items: [{ to: '/admin', label: '数据看板', icon: LayoutDashboard, end: true }],
  },
  {
    id: 'content',
    title: '内容管理',
    defaultOpen: true,
    items: [
      { to: '/admin/manage', label: '题库管理', icon: Settings2 },
      { to: '/admin/import', label: '智能导入', icon: Download },
      { to: '/admin/questions', label: '审核队列', icon: FileQuestion, badgeKey: 'review' },
      { to: '/admin/candidates', label: '候选题', icon: Sparkles, badgeKey: 'candidates' },
      { to: '/admin/experiences', label: '面经管理', icon: BookOpen },
    ],
  },
  {
    id: 'ops',
    title: '运营数据',
    defaultOpen: true,
    items: [
      { to: '/admin/jobs', label: '职位投递', icon: Briefcase },
      { to: '/admin/reports', label: '面试报告', icon: ClipboardList },
      { to: '/admin/resume-shares', label: '分享治理', icon: Share2 },
      { to: '/admin/users', label: '用户管理', icon: Users },
    ],
  },
  {
    id: 'system',
    title: '系统',
    defaultOpen: true,
    items: [
      { to: '/admin/system', label: '系统监控', icon: Activity },
      { to: '/admin/settings', label: '设置', icon: Settings2 },
    ],
  },
]

export const ADMIN_ROUTE_TITLES: Record<string, string> = {
  '/admin': '数据看板',
  '/admin/manage': '题库管理',
  '/admin/import': '智能导入',
  '/admin/questions': '审核队列',
  '/admin/candidates': '候选题',
  '/admin/experiences': '面经管理',
  '/admin/jobs': '职位投递',
  '/admin/reports': '面试报告',
  '/admin/resume-shares': '分享治理',
  '/admin/users': '用户管理',
  '/admin/system': '系统监控',
  '/admin/settings': '设置',
}

export function adminPageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/manage/')) {
    return pathname.endsWith('/new') || pathname.endsWith('new') ? '新增题目' : '编辑题目'
  }
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) return '用户详情'
  if (pathname === '/admin/settings') return '设置'
  for (const [prefix, title] of Object.entries(ADMIN_ROUTE_TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title
  }
  return '管理后台'
}

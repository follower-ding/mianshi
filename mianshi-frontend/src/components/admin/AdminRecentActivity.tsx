import { Link } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  FileQuestion,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { AdminActivityItem } from '../../api/client'

const TYPE_META: Record<
  AdminActivityItem['type'],
  { icon: LucideIcon; label: string }
> = {
  question: { icon: FileQuestion, label: '题目' },
  report: { icon: ClipboardList, label: '报告' },
  session: { icon: BookOpen, label: '面试' },
  user: { icon: User, label: '用户' },
  candidate: { icon: Sparkles, label: '候选题' },
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  items: AdminActivityItem[]
  title?: string
  className?: string
}

export function AdminRecentActivity({ items, title = '最近动态', className = '' }: Props) {
  return (
    <div className={`rounded-lg border border-admin-border bg-admin-surface ${className}`}>
      <div className="border-b border-admin-border px-4 py-3">
        <h3 className="text-sm font-medium text-admin-text">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-admin-muted">暂无最近活动</p>
      ) : (
        <ul className="divide-y divide-admin-border">
          {items.map((item) => {
            const meta = TYPE_META[item.type]
            const Icon = meta.icon
            const inner = (
              <>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-admin-surface-alt">
                  <Icon className="size-4 text-admin-muted" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-text">{item.title}</p>
                  <p className="truncate text-xs text-admin-muted">
                    {item.subtitle ?? meta.label} · {formatWhen(item.createdAt)}
                  </p>
                </div>
              </>
            )
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-surface-alt"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

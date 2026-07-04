import type { ReactNode } from 'react'
import { LayoutGrid, List } from 'lucide-react'

export type AdminViewMode = 'table' | 'card'

type Props = {
  value: AdminViewMode
  onChange: (mode: AdminViewMode) => void
  className?: string
}

export function AdminViewToggle({ value, onChange, className = '' }: Props) {
  return (
    <div
      className={`inline-flex h-9 items-center gap-1 rounded-lg border border-admin-border bg-admin-surface-alt p-1 ${className}`}
      role="group"
      aria-label="视图切换"
    >
      {(
        [
          { mode: 'table' as const, icon: List, label: '表格' },
          { mode: 'card' as const, icon: LayoutGrid, label: '卡片' },
        ] as const
      ).map(({ mode, icon: Icon, label }) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            title={label}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-admin-surface text-admin-text shadow-sm'
                : 'text-admin-muted hover:text-admin-text-secondary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** 卡片网格容器 */
export function AdminCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  )
}

/** 通用内容卡片 — Shadcn border-only */
export function AdminContentCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group rounded-lg border border-admin-border bg-admin-surface p-4 text-left transition-colors hover:bg-admin-surface-alt ${className}`}
    >
      {children}
    </Tag>
  )
}

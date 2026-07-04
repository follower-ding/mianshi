import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { adminCx } from './adminTheme'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/** 后台空状态 — Lucide 图标，不用 emoji */
export function AdminEmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-14 ${adminCx.surfaceElevated}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-admin-brand-light">
        <Icon className="h-6 w-6 text-admin-brand" strokeWidth={1.5} />
      </div>
      <p className="font-semibold text-admin-text">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-center text-sm text-admin-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

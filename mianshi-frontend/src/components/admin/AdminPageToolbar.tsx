import type { ReactNode } from 'react'
import { AdminBreadcrumbs } from './AdminBreadcrumbs'

type Props = {
  actions?: ReactNode
}

/** 紧凑页头：面包屑 + 右侧操作（替代大标题 AdminPageHeader） */
export function AdminPageToolbar({ actions }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <AdminBreadcrumbs />
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

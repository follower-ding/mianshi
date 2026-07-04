import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  /** @deprecated Shadcn 风格忽略 accent */
  accent?: string
}

/** 紧凑 KPI 卡 — Shadcn border-only */
export function AdminStatCard({ label, value, hint, icon: Icon }: Props) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-admin-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-admin-text">
            {value}
          </p>
          {hint && <p className="mt-0.5 truncate text-[10px] text-admin-muted">{hint}</p>}
        </div>
        {Icon && (
          <Icon className="size-4 shrink-0 text-admin-muted" strokeWidth={1.75} />
        )}
      </div>
    </div>
  )
}

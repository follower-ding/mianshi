/** Shadcn Admin 风格分段 Tab — 用于状态筛选、Dashboard 子视图 */
type Tab<T extends string> = {
  value: T
  label: string
  count?: number
}

type Props<T extends string> = {
  tabs: Tab<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export function AdminTabs<T extends string>({ tabs, value, onChange, className = '' }: Props<T>) {
  return (
    <div
      className={`inline-flex h-9 flex-wrap items-center gap-1 rounded-lg bg-admin-surface-alt p-1 text-admin-muted ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all ${
              active
                ? 'bg-admin-surface text-admin-text shadow-sm'
                : 'hover:text-admin-text-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs ${active ? 'text-admin-muted' : 'opacity-70'}`}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

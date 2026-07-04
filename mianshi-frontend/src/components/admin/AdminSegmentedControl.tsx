type Option<T extends string> = T | { value: T; label: string }

function normalize<T extends string>(options: readonly Option<T>[]) {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
}

type Props<T extends string> = {
  value: T
  onChange: (v: T) => void
  options: readonly Option<T>[]
  /** 可选前缀标签，如「难度」 */
  label?: string
  className?: string
}

/** 无原生 select 的分段选择器 — 与录入页工具栏视觉统一 */
export function AdminSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className = '',
}: Props<T>) {
  const opts = normalize(options)

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg bg-admin-surface-alt/80 p-0.5 ring-1 ring-admin-border/70 ${className}`}
      role="group"
      aria-label={label}
    >
      {label && (
        <span className="hidden pl-2 text-[10px] font-medium uppercase tracking-wide text-admin-muted sm:inline">
          {label}
        </span>
      )}
      {opts.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
              active
                ? 'bg-admin-surface text-admin-text shadow-sm ring-1 ring-admin-border/50'
                : 'text-admin-muted hover:bg-admin-surface/60 hover:text-admin-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

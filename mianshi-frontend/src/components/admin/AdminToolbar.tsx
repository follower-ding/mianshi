import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { adminCx, adminLayout } from './adminTheme'

type ToolbarProps = {
  children?: ReactNode
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  /** elevated：更大输入框，用于筛选卡片内 */
  variant?: 'compact' | 'elevated'
}

export function AdminToolbar({
  children,
  search,
  onSearchChange,
  searchPlaceholder = '搜索...',
  variant = 'compact',
}: ToolbarProps) {
  const elevated = variant === 'elevated'

  return (
    <div
      className={`flex flex-wrap items-center ${elevated ? 'gap-3' : 'gap-2'} ${
        elevated ? '' : adminLayout.sectionGap
      }`}
    >
      {onSearchChange !== undefined && (
        <div
          className={`flex min-w-[240px] flex-1 items-center gap-2.5 ${adminCx.input} ${
            elevated ? 'py-2.5' : ''
          }`}
        >
          <Search className="h-4 w-4 shrink-0 text-admin-muted" strokeWidth={1.75} />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-admin-muted"
          />
        </div>
      )}
      {children}
    </div>
  )
}

/** 带 Chevron 的下拉外观 */
export function AdminSelect({
  value,
  onChange,
  children,
  className = '',
  compact,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
  /** 工具栏内联筛选：固定最小宽度 */
  compact?: boolean
  disabled?: boolean
}) {
  return (
    <div className={`relative ${compact ? 'min-w-[140px]' : ''} ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${adminCx.select} w-full appearance-none pr-9 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'py-2.5' : ''}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted"
        strokeWidth={1.75}
      />
    </div>
  )
}

type FilterProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label?: (v: T) => string
  count?: (v: T) => number | undefined
  variant?: 'pills' | 'tabs'
}

/** 状态筛选 — pills 或带底部 indicator 的 tabs */
export function AdminFilterPills<T extends string>({
  options,
  value,
  onChange,
  label = (v) => v,
  count,
  variant = 'pills',
}: FilterProps<T>) {
  if (variant === 'tabs') {
    return (
      <div className="flex flex-wrap gap-1 border-b border-admin-border/80">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'text-admin-brand'
                  : 'text-admin-muted hover:bg-admin-surface-alt/80 hover:text-admin-text-secondary'
              }`}
            >
              {label(opt)}
              {count?.(opt) !== undefined && (
                <span className={`ml-1.5 text-xs ${active ? 'text-admin-brand/70' : 'text-admin-muted'}`}>
                  ({count(opt)})
                </span>
              )}
              <span
                className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-admin-brand transition-all duration-200 ${
                  active ? 'opacity-100' : 'opacity-0 scale-x-0'
                }`}
              />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`${adminLayout.sectionGap} flex flex-wrap gap-1.5`}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
            value === opt ? adminCx.filterActive : adminCx.filterIdle
          }`}
        >
          {label(opt)}
          {count?.(opt) !== undefined && (
            <span className="ml-1 opacity-70">({count(opt)})</span>
          )}
        </button>
      ))}
    </div>
  )
}

export type AdminActionVariant = 'default' | 'edit' | 'danger'

export function AdminIconButton({
  onClick,
  to,
  external,
  children,
  title,
  variant = 'default',
  danger,
  disabled,
}: {
  onClick?: () => void
  /** 路由链接（避免 Link 嵌套 button） */
  to?: string
  external?: boolean
  children: ReactNode
  title?: string
  variant?: AdminActionVariant
  danger?: boolean
  disabled?: boolean
}) {
  const v = danger ? 'danger' : variant
  const cls =
    v === 'danger'
      ? adminCx.iconBtnDanger
      : v === 'edit'
        ? adminCx.iconBtnEdit
        : adminCx.iconBtn

  const disabledCls = disabled ? 'pointer-events-none opacity-40' : ''

  if (to && !disabled) {
    if (external) {
      return (
        <a
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          className={cls}
        >
          {children}
        </a>
      )
    }
    return (
      <Link to={to} title={title} className={`${cls} ${disabledCls}`}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${cls} ${disabledCls}`}
    >
      {children}
    </button>
  )
}

export function AdminBulkBar({
  count,
  children,
  onClear,
}: {
  count: number
  children: ReactNode
  onClear: () => void
}) {
  if (count <= 0) return null
  return (
    <div className={`${adminLayout.sectionGap} ${adminCx.bulkBar}`}>
      <span className="text-sm font-medium text-admin-brand">已选 {count} 项</span>
      {children}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs text-admin-muted transition-colors hover:text-admin-brand"
      >
        取消选择
      </button>
    </div>
  )
}

/** 筛选区白色卡片 — 搜索 + 插槽 + 状态 tabs */
export function AdminFilterCard({ children }: { children: ReactNode }) {
  return (
    <div className={`${adminCx.surfaceElevated} p-4 lg:p-5`}>{children}</div>
  )
}

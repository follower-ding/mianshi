import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import { adminCategoryClass, adminPillBase } from './adminTheme'
import type { CategoryBankOption } from './useQuestionCategories'

type Props = {
  value: string
  onChange: (value: string) => void
  banks: CategoryBankOption[]
  disabled?: boolean
}

function BankRow({
  bank,
  active,
  onPick,
}: {
  bank: CategoryBankOption
  active: boolean
  onPick: () => void
}) {
  const Icon = bank.icon
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
        active
          ? 'bg-admin-brand-light text-admin-brand'
          : 'text-admin-text hover:bg-admin-surface-alt/80'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          active ? 'bg-admin-brand/15' : 'bg-admin-surface-alt ring-1 ring-admin-border/60'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{bank.title}</span>
        {bank.subtitle && bank.title !== bank.category && (
          <span className="block truncate text-[10px] text-admin-muted">{bank.category}</span>
        )}
        {bank.title === bank.category && bank.subtitle && (
          <span className="block truncate text-[10px] text-admin-muted">{bank.subtitle}</span>
        )}
      </span>
      <span
        className={`shrink-0 tabular-nums text-[10px] ${
          bank.count > 0 ? 'text-admin-muted' : 'text-admin-muted/60'
        }`}
      >
        {bank.count > 0 ? `${bank.count} 题` : '暂无题'}
      </span>
    </button>
  )
}

/** 方向选择：展示官方 + 已有题库，支持搜索与新建 */
export function CategoryCombobox({ value, onChange, banks, disabled }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const current = useMemo(
    () => banks.find((b) => b.category === value),
    [banks, value],
  )

  const normalizedQuery = query.trim()
  const filtered = useMemo(() => {
    if (!normalizedQuery) return banks
    const q = normalizedQuery.toLowerCase()
    return banks.filter(
      (b) =>
        b.category.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.subtitle?.toLowerCase().includes(q),
    )
  }, [banks, normalizedQuery])

  const curated = filtered.filter((b) => b.curated)
  const custom = filtered.filter((b) => !b.curated)
  const exactMatch = banks.some((b) => b.category.toLowerCase() === normalizedQuery.toLowerCase())
  const canCreate =
    normalizedQuery.length > 0 &&
    !exactMatch &&
    !banks.some((b) => b.category === normalizedQuery)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (category: string) => {
    onChange(category)
    setQuery('')
    setOpen(false)
  }

  const openPanel = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const CurrentIcon = current?.icon

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="inline-flex min-w-[148px] max-w-[220px] items-center gap-1.5 rounded-lg bg-admin-surface-alt/80 py-0.5 pl-0.5 pr-2 ring-1 ring-admin-border/70 transition hover:ring-admin-border disabled:opacity-50 sm:min-w-[168px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`${adminPillBase} ${adminCategoryClass()} !px-2 !py-0.5 shrink-0 text-[10px]`}>
          方向
        </span>
        {CurrentIcon && (
          <CurrentIcon className="h-3.5 w-3.5 shrink-0 text-admin-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-admin-text">
          {value || '选择方向'}
        </span>
        {current && current.count > 0 && (
          <span className="hidden shrink-0 tabular-nums text-[10px] text-admin-muted sm:inline">
            {current.count}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-admin-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[200] w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-admin-border/80 bg-admin-surface shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
          role="listbox"
          aria-label="选择方向题库"
        >
          <div className="border-b border-admin-border/50 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-admin-surface-alt/80 px-2.5 py-1.5 ring-1 ring-admin-border/60">
              <Search className="h-3.5 w-3.5 shrink-0 text-admin-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canCreate) {
                    e.preventDefault()
                    pick(normalizedQuery)
                  }
                }}
                placeholder="搜索或输入新方向…"
                className="min-w-0 flex-1 border-0 bg-transparent text-xs text-admin-text outline-none placeholder:text-admin-muted"
              />
            </div>
          </div>

          <div className="max-h-[min(320px,50vh)] overflow-y-auto p-1.5">
            {curated.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-admin-muted">
                  官方题库
                </p>
                {curated.map((bank) => (
                  <BankRow
                    key={bank.category}
                    bank={bank}
                    active={bank.category === value}
                    onPick={() => pick(bank.category)}
                  />
                ))}
              </div>
            )}

            {custom.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-admin-muted">
                  已有题库
                </p>
                {custom.map((bank) => (
                  <BankRow
                    key={bank.category}
                    bank={bank}
                    active={bank.category === value}
                    onPick={() => pick(bank.category)}
                  />
                ))}
              </div>
            )}

            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-6 text-center text-xs text-admin-muted">没有匹配的方向</p>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={() => pick(normalizedQuery)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-admin-border px-2.5 py-2 text-left text-xs text-admin-brand transition hover:bg-admin-brand-light/40"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                创建「{normalizedQuery}」题库
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

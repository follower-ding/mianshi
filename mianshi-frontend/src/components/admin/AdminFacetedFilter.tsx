import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

export type FacetOption = {
  value: string
  label: string
  count: number
}

type Props = {
  label: string
  options: FacetOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function AdminFacetedFilter({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const activeCount = selected.length

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
          activeCount > 0
            ? 'border-admin-text/30 bg-admin-surface-alt text-admin-text'
            : 'border-admin-border text-admin-muted hover:bg-admin-surface-alt hover:text-admin-text'
        }`}
      >
        <Plus className={`size-3.5 transition ${open ? 'rotate-45' : ''}`} />
        {label}
        {activeCount > 0 && (
          <span className="rounded bg-admin-brand px-1.5 py-0.5 text-[10px] font-semibold text-admin-on-brand">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-admin-border bg-admin-surface p-2 shadow-lg animate-scale-in">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-admin-text">{label}</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-admin-muted hover:text-admin-text"
              >
                清除
              </button>
            )}
          </div>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {options.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-admin-muted">无选项</li>
            ) : (
              options.map((opt) => {
                const checked = selected.includes(opt.value)
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                        checked ? 'bg-admin-surface-alt text-admin-text' : 'text-admin-text-secondary hover:bg-admin-surface-alt'
                      }`}
                    >
                      <span
                        className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-admin-text bg-admin-text' : 'border-admin-border'
                        }`}
                      >
                        {checked && <span className="size-1.5 rounded-sm bg-admin-on-brand" />}
                      </span>
                      <span className="flex-1 truncate">{opt.label}</span>
                      <span className="tabular-nums text-admin-muted">{opt.count}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {activeCount > 0 && (
        <span className="sr-only">{activeCount} 个筛选项</span>
      )}
    </div>
  )
}

export type AdminFacetDef<T> = {
  id: string
  label: string
  getValue: (row: T) => string | string[]
  labelFor?: (value: string) => string
}

export function computeFacetOptions<T>(
  data: T[],
  facetId: string,
  facets: AdminFacetDef<T>[],
  activeFilters: Record<string, string[]>,
): FacetOption[] {
  const facet = facets.find((f) => f.id === facetId)
  if (!facet) return []

  const filtered = data.filter((row) => {
    for (const f of facets) {
      if (f.id === facetId) continue
      const sel = activeFilters[f.id]
      if (!sel?.length) continue
      const raw = f.getValue(row)
      const vals = Array.isArray(raw) ? raw : [raw]
      if (!vals.some((v) => sel.includes(v))) return false
    }
    return true
  })

  const counts = new Map<string, number>()
  for (const row of filtered) {
    const raw = facet.getValue(row)
    const vals = Array.isArray(raw) ? raw : [raw]
    for (const v of vals) {
      if (!v) continue
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      label: facet.labelFor?.(value) ?? value,
      count,
    }))
}

export function applyFacetFilters<T>(
  data: T[],
  facets: AdminFacetDef<T>[],
  activeFilters: Record<string, string[]>,
): T[] {
  return data.filter((row) => {
    for (const f of facets) {
      const sel = activeFilters[f.id]
      if (!sel?.length) continue
      const raw = f.getValue(row)
      const vals = Array.isArray(raw) ? raw : [raw]
      if (!vals.some((v) => sel.includes(v))) return false
    }
    return true
  })
}

export function useFacetFilterState(initial: Record<string, string[]> = {}) {
  const [filters, setFilters] = useState(initial)
  const setFacet = (id: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [id]: values }))
  }
  const clearAll = () => setFilters({})
  const hasActive = useMemo(() => Object.values(filters).some((v) => v.length > 0), [filters])
  return { filters, setFacet, clearAll, hasActive, setFilters }
}

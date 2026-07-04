import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (size: number) => void
  className?: string
}

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  className = '',
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showNav = total > pageSize

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = pageRange(page, totalPages)

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-admin-muted">
          {total === 0 ? '暂无数据' : `显示 ${from}–${to}，共 ${total} 条`}
        </p>
        {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-admin-muted">
            每页
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-admin-border bg-admin-surface px-2 py-1 text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-brand/30"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            条
          </label>
        )}
      </div>
      {showNav && (
        <nav className="flex items-center gap-1" aria-label="分页">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border border-admin-border text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text disabled:pointer-events-none disabled:opacity-40"
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-1 text-sm text-admin-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-sm font-medium transition ${
                p === page
                  ? 'bg-admin-surface text-admin-text shadow-sm ring-1 ring-admin-border'
                  : 'text-admin-muted hover:bg-admin-surface-alt hover:text-admin-text'
              }`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex size-8 items-center justify-center rounded-md border border-admin-border text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text disabled:pointer-events-none disabled:opacity-40"
          aria-label="下一页"
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
      )}
    </div>
  )
}

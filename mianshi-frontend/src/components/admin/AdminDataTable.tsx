import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react'
import {
  AdminFacetedFilter,
  applyFacetFilters,
  computeFacetOptions,
  type AdminFacetDef,
} from './AdminFacetedFilter'
import {
  AdminTable,
  AdminTableHead,
  AdminTh,
  AdminTd,
  AdminTr,
} from './AdminCard'
import { AdminPagination } from './AdminPagination'
import { ADMIN_PAGE_SIZE_OPTIONS } from './useAdminPageSize'

export type AdminColumnDef<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  defaultVisible?: boolean
}

type SortState = { id: string; dir: 'asc' | 'desc' } | null

type Props<T> = {
  columns: AdminColumnDef<T>[]
  data: T[]
  getRowKey: (row: T) => string
  variant?: 'compact' | 'elevated'
  pageSize?: number
  pageSizeOptions?: readonly number[]
  empty?: ReactNode
  toolbarExtra?: ReactNode
  facets?: AdminFacetDef<T>[]
  facetFilters?: Record<string, string[]>
  onFacetFiltersChange?: (filters: Record<string, string[]>) => void
}

export function AdminDataTable<T>({
  columns,
  data,
  getRowKey,
  variant = 'elevated',
  pageSize: defaultPageSize = 12,
  pageSizeOptions = ADMIN_PAGE_SIZE_OPTIONS,
  empty,
  toolbarExtra,
  facets,
  facetFilters: facetFiltersProp,
  onFacetFiltersChange,
}: Props<T>) {
  const [internalFacetFilters, setInternalFacetFilters] = useState<Record<string, string[]>>({})
  const facetFilters = facetFiltersProp ?? internalFacetFilters
  const visibleDefaults = useMemo(
    () =>
      Object.fromEntries(
        columns.map((c) => [c.id, c.defaultVisible !== false]),
      ) as Record<string, boolean>,
    [columns],
  )

  const [visible, setVisible] = useState(visibleDefaults)
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [columnsOpen, setColumnsOpen] = useState(false)

  const setFacetFilter = (id: string, values: string[]) => {
    const next = { ...facetFilters, [id]: values }
    if (onFacetFiltersChange) onFacetFiltersChange(next)
    else setInternalFacetFilters(next)
    setPage(1)
  }

  const facetFiltered = useMemo(
    () => (facets?.length ? applyFacetFilters(data, facets, facetFilters) : data),
    [data, facets, facetFilters],
  )

  const visibleColumns = columns.filter((c) => visible[c.id] !== false)

  const sorted = useMemo(() => {
    if (!sort) return facetFiltered
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sortValue) return facetFiltered
    const copy = [...facetFiltered]
    copy.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [facetFiltered, sort, columns])

  const total = sorted.length
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (col: AdminColumnDef<T>) => {
    if (!col.sortValue) return
    setSort((prev) => {
      if (prev?.id !== col.id) return { id: col.id, dir: 'asc' }
      if (prev.dir === 'asc') return { id: col.id, dir: 'desc' }
      return null
    })
    setPage(1)
  }

  if (facetFiltered.length === 0 && empty) return <>{empty}</>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {facets?.map((f) => (
            <AdminFacetedFilter
              key={f.id}
              label={f.label}
              options={computeFacetOptions(data, f.id, facets, facetFilters)}
              selected={facetFilters[f.id] ?? []}
              onChange={(vals) => setFacetFilter(f.id, vals)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {toolbarExtra}
        <div className="relative">
          <button
            type="button"
            onClick={() => setColumnsOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-2.5 py-1.5 text-xs font-medium text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text"
          >
            <Columns3 className="size-3.5" />
            列
          </button>
          {columnsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setColumnsOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-admin-border bg-admin-surface p-2 shadow-lg">
                {columns.map((col) => (
                  <label
                    key={col.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-admin-text-secondary hover:bg-admin-surface-alt"
                  >
                    <input
                      type="checkbox"
                      checked={visible[col.id] !== false}
                      onChange={() =>
                        setVisible((v) => ({ ...v, [col.id]: !(v[col.id] !== false) }))
                      }
                      className="rounded border-admin-border"
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      <AdminTable variant={variant}>
        <AdminTableHead variant={variant}>
          {visibleColumns.map((col) => {
            const active = sort?.id === col.id
            return (
              <AdminTh key={col.id} variant={variant} className={col.className}>
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col)}
                    className="inline-flex items-center gap-1 text-inherit hover:text-admin-text"
                  >
                    {col.header}
                    {active ? (
                      sort!.dir === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </AdminTh>
            )
          })}
        </AdminTableHead>
        <tbody>
          {pageItems.map((row) => (
            <AdminTr key={getRowKey(row)} variant={variant}>
              {visibleColumns.map((col) => (
                <AdminTd key={col.id} className={col.className}>
                  {col.cell(row)}
                </AdminTd>
              ))}
            </AdminTr>
          ))}
        </tbody>
      </AdminTable>

      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
      />
    </div>
  )
}

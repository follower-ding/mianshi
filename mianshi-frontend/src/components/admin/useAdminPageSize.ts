import { useCallback, useState } from 'react'

const STORAGE_PREFIX = 'mianshi-admin-page-size:'

export const ADMIN_PAGE_SIZE_OPTIONS = [12, 24, 48] as const
export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number]

function readStored(page: string, fallback: AdminPageSize): AdminPageSize {
  try {
    const v = Number(localStorage.getItem(`${STORAGE_PREFIX}${page}`))
    if (ADMIN_PAGE_SIZE_OPTIONS.includes(v as AdminPageSize)) return v as AdminPageSize
  } catch {
    /* ignore */
  }
  return fallback
}

export function useAdminPageSize(page: string, defaultSize: AdminPageSize = 12) {
  const [pageSize, setPageSizeState] = useState<AdminPageSize>(() => readStored(page, defaultSize))

  const setPageSize = useCallback(
    (next: AdminPageSize) => {
      setPageSizeState(next)
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${page}`, String(next))
      } catch {
        /* ignore */
      }
    },
    [page],
  )

  return [pageSize, setPageSize] as const
}

import { useCallback, useState } from 'react'
import type { AdminViewMode } from './AdminViewToggle'

const STORAGE_PREFIX = 'mianshi-admin-view:'

function readStored(page: string, fallback: AdminViewMode): AdminViewMode {
  try {
    const v = localStorage.getItem(`${STORAGE_PREFIX}${page}`)
    if (v === 'table' || v === 'card') return v
  } catch {
    /* ignore */
  }
  return fallback
}

export function useAdminViewMode(page: string, defaultMode: AdminViewMode = 'table') {
  const [mode, setModeState] = useState<AdminViewMode>(() => readStored(page, defaultMode))

  const setMode = useCallback(
    (next: AdminViewMode) => {
      setModeState(next)
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${page}`, next)
      } catch {
        /* ignore */
      }
    },
    [page],
  )

  return [mode, setMode] as const
}

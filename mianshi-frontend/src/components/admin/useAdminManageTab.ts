import { useCallback, useState } from 'react'

export type AdminManageTab = 'overview' | 'list'

const STORAGE_KEY = 'mianshi-admin-manage-tab'

function readStored(): AdminManageTab {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'overview' || v === 'list') return v
  } catch {
    /* ignore */
  }
  return 'list'
}

export function useAdminManageTab(defaultTab: AdminManageTab = 'list') {
  const [tab, setTabState] = useState<AdminManageTab>(() => readStored() || defaultTab)

  const setTab = useCallback((next: AdminManageTab) => {
    setTabState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  return [tab, setTab] as const
}

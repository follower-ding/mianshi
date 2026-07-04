import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  readAdminColorMode,
  storeAdminColorMode,
  type AdminColorMode,
} from './adminColorMode'
import { readAdminTeamId, storeAdminTeamId } from './adminTeams'

const SIDEBAR_KEY = 'mianshi-admin-sidebar-collapsed'
const NOTIF_READ_KEY = 'mianshi-admin-notifications-read'

type AdminShellContextValue = {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebarCollapsed: () => void
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void
  commandOpen: boolean
  setCommandOpen: (v: boolean) => void
  colorMode: AdminColorMode
  setColorMode: (mode: AdminColorMode) => void
  teamId: string
  setTeamId: (id: string) => void
  readNotificationIds: Set<string>
  markNotificationsRead: (ids: string[]) => void
  markAllNotificationsRead: (ids: string[]) => void
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null)

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function readNotificationReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function persistNotificationReadSet(set: Set<string>) {
  try {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...set].slice(-200)))
  } catch {
    /* ignore */
  }
}

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(readCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [colorMode, setColorModeState] = useState<AdminColorMode>(readAdminColorMode)
  const [teamId, setTeamIdState] = useState(readAdminTeamId)
  const [readNotificationIds, setReadNotificationIds] = useState(readNotificationReadSet)

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v)
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed)
  }, [sidebarCollapsed, setSidebarCollapsed])

  const setColorMode = useCallback((mode: AdminColorMode) => {
    setColorModeState(mode)
    storeAdminColorMode(mode)
  }, [])

  const setTeamId = useCallback((id: string) => {
    setTeamIdState(id)
    storeAdminTeamId(id)
  }, [])

  const markNotificationsRead = useCallback((ids: string[]) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      persistNotificationReadSet(next)
      return next
    })
  }, [])

  const markAllNotificationsRead = useCallback((ids: string[]) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      persistNotificationReadSet(next)
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--admin-sidebar-width',
      sidebarCollapsed ? '56px' : '240px',
    )
  }, [sidebarCollapsed])

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      commandOpen,
      setCommandOpen,
      colorMode,
      setColorMode,
      teamId,
      setTeamId,
      readNotificationIds,
      markNotificationsRead,
      markAllNotificationsRead,
    }),
    [
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      mobileNavOpen,
      commandOpen,
      colorMode,
      setColorMode,
      teamId,
      setTeamId,
      readNotificationIds,
      markNotificationsRead,
      markAllNotificationsRead,
    ],
  )

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>
}

export function useAdminShell() {
  const ctx = useContext(AdminShellContext)
  if (!ctx) throw new Error('useAdminShell must be used within AdminShellProvider')
  return ctx
}

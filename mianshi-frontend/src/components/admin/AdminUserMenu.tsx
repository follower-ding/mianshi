import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function AdminUserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'A'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-admin-surface-alt py-0.5 pl-0.5 pr-2 text-admin-text ring-1 ring-admin-border transition hover:bg-admin-sidebar-hover"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full text-xs font-medium">
          {initial}
        </span>
        <ChevronDown className={`size-3.5 text-admin-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-admin-border bg-admin-surface py-1 shadow-lg animate-scale-in"
        >
          <div className="border-b border-admin-border px-3 py-2">
            <p className="truncate text-sm font-medium text-admin-text">
              {user?.name || user?.email?.split('@')[0]}
            </p>
            <p className="truncate text-xs text-admin-muted">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-admin-text-secondary hover:bg-admin-surface-alt hover:text-admin-text"
            onClick={() => setOpen(false)}
          >
            <User className="size-4 text-admin-muted" />
            个人资料
          </Link>
          <Link
            to="/admin/settings"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-admin-text-secondary hover:bg-admin-surface-alt hover:text-admin-text"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4 text-admin-muted" />
            设置
          </Link>
          <Link
            to="/"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-admin-text-secondary hover:bg-admin-surface-alt hover:text-admin-text"
            onClick={() => setOpen(false)}
          >
            返回用户端
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-400 hover:bg-admin-surface-alt"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { api, type AdminNotification } from '../../api/client'
import { useAdminShell } from './AdminShellContext'

function formatWhen(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function AdminNotificationsBell() {
  const { readNotificationIds, markNotificationsRead, markAllNotificationsRead } = useAdminShell()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AdminNotification[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  const load = () => {
    api.getAdminNotifications().then((res) => setItems(res.items)).catch(() => setItems([]))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const unread = items.filter((n) => !readNotificationIds.has(n.id)).length

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          if (!open) load()
        }}
        className="relative inline-flex size-8 items-center justify-center rounded-md text-admin-muted transition hover:bg-admin-surface-alt hover:text-admin-text"
        aria-label="通知"
        aria-expanded={open}
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-lg animate-scale-in">
          <div className="flex items-center justify-between border-b border-admin-border px-3 py-2">
            <p className="text-sm font-medium text-admin-text">通知</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(items.map((n) => n.id))}
                className="inline-flex items-center gap-1 text-xs text-admin-muted hover:text-admin-text"
              >
                <CheckCheck className="size-3.5" />
                全部已读
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-admin-muted">暂无通知</li>
            ) : (
              items.map((n) => {
                const isUnread = !readNotificationIds.has(n.id)
                const inner = (
                  <>
                    <p className={`text-sm ${isUnread ? 'font-semibold text-admin-text' : 'text-admin-text-secondary'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-admin-muted">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-admin-muted">{formatWhen(n.createdAt)}</p>
                  </>
                )
                return (
                  <li key={n.id} className="border-b border-admin-border last:border-0">
                    {n.href ? (
                      <Link
                        to={n.href}
                        onClick={() => {
                          markNotificationsRead([n.id])
                          setOpen(false)
                        }}
                        className={`block px-3 py-2.5 transition hover:bg-admin-surface-alt ${isUnread ? 'bg-admin-brand-soft' : ''}`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markNotificationsRead([n.id])}
                        className={`block w-full px-3 py-2.5 text-left transition hover:bg-admin-surface-alt ${isUnread ? 'bg-admin-brand-soft' : ''}`}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

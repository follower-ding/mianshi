import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminShell } from './AdminShellContext'
import { buildAdminCommandItems, filterCommandItems } from './adminCommandItems'

export function AdminCommandPalette() {
  const { commandOpen, setCommandOpen } = useAdminShell()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems = useMemo(() => buildAdminCommandItems(), [])
  const filtered = useMemo(() => filterCommandItems(allItems, query), [allItems, query])

  useEffect(() => {
    if (commandOpen) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [commandOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!commandOpen) return null

  const run = (index: number) => {
    const item = filtered[index]
    if (!item) return
    setCommandOpen(false)
    if (item.action === 'logout') {
      logout()
      navigate('/login')
      return
    }
    if (item.to) navigate(item.to)
    else if (item.href) window.location.href = item.href
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      run(activeIndex)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-admin-border px-3">
          <Search className="size-4 shrink-0 text-admin-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面或操作…"
            className="h-11 flex-1 bg-transparent text-sm text-admin-text outline-none placeholder:text-admin-muted"
          />
          <kbd className="hidden rounded border border-admin-border px-1.5 py-0.5 font-mono text-[10px] text-admin-muted sm:inline">
            ESC
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-admin-muted">无匹配结果</li>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      i === activeIndex
                        ? 'bg-admin-surface-alt text-admin-text'
                        : 'text-admin-text-secondary hover:bg-admin-surface-alt'
                    }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => run(i)}
                  >
                    {Icon && <Icon className="size-4 shrink-0 text-admin-muted" strokeWidth={1.75} />}
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}

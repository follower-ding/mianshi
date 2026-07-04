import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Shield,
  Palette,
} from 'lucide-react'
import { NAV_ITEMS, MORE_MENU_ITEMS, USER_MENU_ITEMS } from '../../lib/data'
import { BRAND } from '../../lib/brand'
import { useAuth } from '../../contexts/AuthContext'
import { StyleSwitcher } from './StyleSwitcher'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [urlSearchParams] = useSearchParams()
  const { user, logout, authEnabled } = useAuth()

  useEffect(() => {
    const q = urlSearchParams.get('q')
    if (q) setSearchQuery(q)
  }, [urlSearchParams])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  const navLinkClass = (isActive: boolean) =>
    `rounded-lg px-3 py-2 text-[13px] leading-none whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-brand/12 font-semibold text-brand'
        : 'font-medium text-text-secondary hover:bg-bg-subtle hover:text-text'
    }`

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/questions?q=${encodeURIComponent(q)}`)
  }

  const hasMoreMenu = MORE_MENU_ITEMS.length > 0

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-elevated/95 backdrop-blur-xl">
      <div className="mx-auto grid h-[3.5rem] max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 lg:gap-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-bg-subtle hover:text-text lg:hidden"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </button>
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-sm font-bold text-brand"
              aria-hidden
            >
              i
            </div>
            <span className="hidden text-base font-bold tracking-tight text-text sm:inline">
              {BRAND.displayName}
            </span>
          </NavLink>
        </div>

        <nav className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
          {hasMoreMenu && (
            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text"
              >
                更多
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-70 transition ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-panel py-1 shadow-lg animate-scale-in">
                  {MORE_MENU_ITEMS.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                    >
                      {item.label}
                      {'badge' in item && item.badge && (
                        <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5">
          <form
            onSubmit={handleSearch}
            className="hidden items-center gap-2 rounded-full border border-border/80 bg-bg-subtle/80 px-3 py-1.5 transition-colors focus-within:border-brand/40 sm:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索题目…"
              aria-label="搜索题目"
              className="w-28 bg-transparent text-sm text-text outline-none placeholder:text-muted md:w-36 lg:w-44"
            />
          </form>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-transparent py-0.5 pl-0.5 pr-1.5 transition hover:border-border/60 hover:bg-bg-subtle"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-sm font-bold text-brand"
                aria-hidden
              >
                {(user?.name ?? BRAND.guestInitial).slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden max-w-[5.5rem] truncate text-sm text-text-secondary md:inline">
                {user?.name ?? '游客'}
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 shrink-0 text-muted transition md:block ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-panel shadow-lg animate-scale-in">
                {authEnabled && !user && (
                  <>
                    <NavLink
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                    >
                      登录
                    </NavLink>
                    <NavLink
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                    >
                      注册
                    </NavLink>
                    <div className="my-1 border-t border-border" />
                  </>
                )}
                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                  >
                    <Shield className="h-4 w-4" />
                    运营后台
                  </NavLink>
                )}
                {USER_MENU_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                  >
                    {item.label}
                  </NavLink>
                ))}
                <div className="my-1 border-t border-border" />
                <div className="px-3 py-2">
                  <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                    <Palette className="h-3.5 w-3.5" />
                    界面风格
                  </p>
                  <StyleSwitcher variant="menu" />
                </div>
                <div className="border-t border-border" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    navigate('/')
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-text-secondary transition hover:bg-bg-subtle hover:text-text"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="fixed left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-elevated shadow-xl animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <NavLink
                to="/"
                className="flex items-center gap-2"
                onClick={() => setMobileNavOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-sm font-bold text-brand">
                  i
                </div>
                <span className="font-bold text-text">{BRAND.displayName}</span>
              </NavLink>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-text-secondary hover:bg-bg-subtle"
                aria-label="关闭菜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                handleSearch(e)
                setMobileNavOpen(false)
              }}
              className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border bg-bg-subtle/80 px-3 py-2"
            >
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索题目…"
                aria-label="搜索题目"
                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
              />
            </form>
            <nav className="flex flex-col gap-0.5 px-3 py-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
              {hasMoreMenu && (
                <>
                  <p className="px-3 pt-3 text-xs font-medium text-muted">更多</p>
                  {MORE_MENU_ITEMS.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileNavOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-subtle"
                    >
                      {item.label}
                      {'badge' in item && item.badge && (
                        <span className="text-[10px] text-muted">{item.badge}</span>
                      )}
                    </NavLink>
                  ))}
                </>
              )}
            </nav>
            <div className="mt-auto border-t border-border px-3 py-4">
              <p className="mb-2 px-3 text-xs font-medium text-muted">界面风格</p>
              <StyleSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

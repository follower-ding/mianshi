import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { ADMIN_TEAMS, getAdminTeam } from './adminTeams'
import { useAdminShell } from './AdminShellContext'

type Props = {
  collapsed?: boolean
  onNavigate?: () => void
}

export function AdminTeamSwitcher({ collapsed, onNavigate }: Props) {
  const { teamId, setTeamId } = useAdminShell()
  const team = getAdminTeam(teamId)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const Icon = team.icon

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} className="relative p-2 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border border-admin-border px-2 py-2 text-left transition-colors hover:bg-admin-surface-alt ${
          collapsed ? 'justify-center px-1.5' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-admin-surface-alt">
          <Icon className="size-4 text-admin-text" strokeWidth={1.75} />
        </div>
        {!collapsed && (
          <>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-admin-text">{team.name}</span>
              <span className="truncate text-xs text-admin-muted">{team.plan}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-admin-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-lg animate-scale-in ${
            collapsed ? 'left-full top-0 ml-2 w-56' : 'left-2 right-2'
          }`}
        >
          <div className="p-1">
            {ADMIN_TEAMS.map((t) => {
              const TIcon = t.icon
              const active = t.id === teamId
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setTeamId(t.id)
                    setOpen(false)
                    onNavigate?.()
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                    active ? 'bg-admin-surface-alt text-admin-text' : 'text-admin-text-secondary hover:bg-admin-surface-alt'
                  }`}
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-admin-surface-alt">
                    <TIcon className="size-3.5 text-admin-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="truncate text-xs text-admin-muted">{t.plan}</p>
                  </div>
                  {active && <Check className="size-4 shrink-0 text-admin-text" />}
                </button>
              )
            })}
          </div>
          <div className="border-t border-admin-border p-1">
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm text-admin-muted opacity-60"
              title="Demo 功能"
            >
              <Plus className="size-4" />
              创建工作区
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

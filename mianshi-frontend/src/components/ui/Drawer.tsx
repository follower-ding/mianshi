import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  headerActions?: ReactNode
  children: ReactNode
}

export function Drawer({ open, onClose, title, subtitle, headerActions, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(50vw,600px)] min-w-[420px] flex-col border-l border-gray-800/60 bg-[#0d1117] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || headerActions) && (
          <div className="shrink-0 border-b border-gray-800/60 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {title && <div className="text-base font-bold text-text">{title}</div>}
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary">{subtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-gray-800/60 hover:text-text"
                  aria-label="关闭抽屉"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </>
  )
}

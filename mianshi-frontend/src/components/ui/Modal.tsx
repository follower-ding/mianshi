import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
  variant?: 'default' | 'admin'
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  variant = 'default',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const isAdmin = variant === 'admin'

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

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return
      const nodes = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm animate-fade-in sm:pt-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} max-h-[min(90vh,calc(100dvh-5rem))] overflow-y-auto rounded-xl p-6 shadow-modal animate-scale-in ${
          isAdmin
            ? 'border border-admin-border/80 bg-admin-surface shadow-[var(--shadow-admin-card)]'
            : 'rounded-2xl border border-border bg-panel'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="modal-title"
            className={`text-lg font-bold tracking-tight ${isAdmin ? 'text-admin-text' : ''}`}
          >
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="关闭对话框"
            className={`cursor-pointer rounded-md p-1.5 transition-colors ${
              isAdmin
                ? 'text-admin-muted hover:bg-admin-surface-alt hover:text-admin-text'
                : 'text-muted hover:bg-bg-subtle hover:text-text'
            }`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

export type ToastAction = {
  label: string
  onClick?: () => void
  to?: string
  external?: boolean
}

export type ToastOptions = {
  action?: ToastAction
  duration?: number
}

type ToastItem = {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
  action?: ToastAction
}

type ToastContextValue = {
  showToast: (
    message: string,
    type?: ToastItem['type'],
    options?: ToastOptions,
  ) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastActionButton({
  action,
  onDone,
}: {
  action: ToastAction
  onDone: () => void
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (action.onClick) {
      action.onClick()
    } else if (action.to) {
      if (action.external) {
        window.open(action.to, '_blank', 'noopener,noreferrer')
      } else {
        navigate(action.to)
      }
    }
    onDone()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ml-2 shrink-0 rounded-lg border border-current/25 px-2 py-0.5 text-xs font-semibold transition hover:bg-black/5"
    >
      {action.label}
    </button>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info', options?: ToastOptions) => {
      const id = Date.now()
      const duration = options?.duration ?? 5000
      setToasts((prev) => [...prev, { id, message, type, action: options?.action }])
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[350] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg animate-fade-in ${
              t.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : t.type === 'error'
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-border bg-panel text-text'
            }`}
          >
            <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
            {t.action && (
              <ToastActionButton action={t.action} onDone={() => dismiss(t.id)} />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

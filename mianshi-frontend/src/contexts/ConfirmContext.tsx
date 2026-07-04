import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ message: '' })
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const close = (result: boolean) => {
    setOpen(false)
    resolverRef.current?.(result)
    resolverRef.current = null
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={() => close(false)}
        title={opts.title ?? '确认操作'}
        maxWidth="max-w-md"
      >
        <p className="text-sm leading-relaxed text-text-secondary">{opts.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => close(false)}>
            {opts.cancelLabel ?? '取消'}
          </Button>
          <Button
            size="sm"
            variant={opts.variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => close(true)}
          >
            {opts.confirmLabel ?? '确认'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

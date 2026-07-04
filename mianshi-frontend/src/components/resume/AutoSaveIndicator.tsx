import { Loader2, Cloud, CloudOff, Check, RotateCcw } from 'lucide-react'
import type { AutoSaveStatus } from './useResumeAutoSave'

const LABEL: Record<AutoSaveStatus, string> = {
  idle: '',
  pending: '待保存…',
  saving: '保存中…',
  saved: '已自动保存',
  error: '保存失败',
}

type Props = {
  status: AutoSaveStatus
  onRetry?: () => void
}

export function AutoSaveIndicator({ status, onRetry }: Props) {
  if (status === 'idle') return null

  const label = LABEL[status]

  return (
    <span
      key={status}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        status === 'error'
          ? 'border-danger/30 bg-danger/10 text-danger'
          : status === 'saved'
            ? 'border-success/30 bg-success/10 text-success animate-scale-in'
            : 'border-border/60 bg-panel/50 text-muted'
      }`}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {status === 'pending' && <Cloud className="h-3 w-3" aria-hidden />}
      {status === 'saved' && <Check className="h-3 w-3 animate-scale-in" strokeWidth={2.5} aria-hidden />}
      {status === 'error' && <CloudOff className="h-3 w-3" aria-hidden />}
      {label}
      {status === 'error' && onRetry && (
        <button
          type="button"
          className="ml-1 inline-flex cursor-pointer items-center gap-0.5 underline underline-offset-2"
          onClick={onRetry}
        >
          <RotateCcw className="h-3 w-3" /> 重试
        </button>
      )}
    </span>
  )
}

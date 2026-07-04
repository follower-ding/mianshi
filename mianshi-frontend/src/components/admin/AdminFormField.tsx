import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

type Props = {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

/** 后台表单统一字段：标签 + 提示 + 错误，替代纯 placeholder */
export function AdminFormField({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: Props) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-admin-text-secondary">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-admin-muted">{hint}</p>
      ) : null}
    </div>
  )
}

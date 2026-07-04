import type { ReactNode } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminCx } from './adminTheme'

type Action = {
  label: string
  onClick?: () => void
  to?: string
  external?: boolean
}

type Props = {
  title: string
  description?: string
  actions?: Action[]
  variant?: 'info' | 'success' | 'warning'
  onDismiss?: () => void
  children?: ReactNode
}

const variantClass = {
  info: 'border-admin-border bg-admin-surface-alt',
  success: 'border-emerald-500/30 bg-emerald-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
} as const

const iconClass = {
  info: 'text-admin-text-secondary',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
} as const

/** 情境化智能引导 — 根据状态提示下一步，减少用户思考成本 */
export function AdminSmartGuide({
  title,
  description,
  actions,
  variant = 'info',
  onDismiss,
  children,
}: Props) {
  return (
    <div
      className={`flex gap-3 rounded-2xl border px-4 py-3.5 ${variantClass[variant]}`}
      role="status"
    >
      <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass[variant]}`} strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-admin-text">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-admin-text-secondary">{description}</p>
        )}
        {children}
        {actions && actions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {actions.map((a) => {
              const cls = `${adminCx.btnSecondary} !px-3 !py-1.5 !text-xs`
              if (a.to) {
                if (a.external) {
                  return (
                    <a
                      key={a.label}
                      href={a.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      {a.label}
                    </a>
                  )
                }
                return (
                  <Link key={a.label} to={a.to} className={cls}>
                    {a.label}
                  </Link>
                )
              }
              return (
                <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                  {a.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-admin-muted transition hover:bg-admin-surface/60 hover:text-admin-text"
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

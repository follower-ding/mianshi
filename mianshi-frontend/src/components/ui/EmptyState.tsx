import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-panel/20 px-6 py-10 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-text-secondary">{description}</p>
      )}
      {children}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

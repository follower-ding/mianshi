import { Loader2 } from 'lucide-react'

export function Loading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-muted animate-fade-in">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-subtle px-6 py-16 animate-fade-in">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <p className="font-medium text-gray-600">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

import { MessageSquare, PenLine, Headphones, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { BRAND } from '../../lib/brand'

const TOOLS: {
  label: string
  color: string
  icon: ReactNode
  onClick: () => void
}[] = [
  {
    label: '反馈',
    color: 'hover:bg-info-light hover:text-brand',
    icon: <MessageSquare className="h-4 w-4" />,
    onClick: () => window.open('https://github.com/iume/mianshi/issues/new', '_blank', 'noopener,noreferrer'),
  },
  {
    label: '笔记',
    color: 'hover:bg-brand-light hover:text-brand',
    icon: <PenLine className="h-4 w-4" />,
    onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  },
  {
    label: '讨论',
    color: 'hover:bg-warning-light hover:text-warning',
    icon: <Headphones className="h-4 w-4" />,
    onClick: () => window.open('https://github.com/iume/mianshi/discussions', '_blank', 'noopener,noreferrer'),
  },
]

export function FloatingSidebar() {
  return (
    <aside className="fixed right-6 bottom-24 z-40 hidden flex-col gap-2 lg:flex animate-slide-up">
      {TOOLS.map(({ label, color, icon, onClick }) => (
        <button
          key={label}
          type="button"
          title={label}
          onClick={onClick}
          className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-elevated shadow-card transition-all hover:shadow-card-hover ${color}`}
        >
          {icon}
          <span className="absolute right-full mr-2 hidden items-center rounded-lg bg-panel px-2 py-1 text-xs text-text shadow-card group-hover:flex whitespace-nowrap">
            {label}
          </span>
        </button>
      ))}
      <button
        type="button"
        title={`${BRAND.name} · 回到顶部`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-elevated text-text-secondary shadow-card transition-all hover:text-brand"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </aside>
  )
}

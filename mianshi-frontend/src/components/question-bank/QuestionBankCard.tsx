import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  count: number
  preview?: boolean
  disabled: boolean
  delay?: number
  onClick: () => void
}

/** 统一题库卡片 — 不使用 rainbow gradient，随全局 theme 变色 */
export function QuestionBankCard({
  icon: Icon,
  title,
  subtitle,
  description,
  count,
  preview,
  disabled,
  delay = 0,
  onClick,
}: Props) {
  const countLabel =
    count > 0 ? `${count} 题` : preview ? '筹备中' : '暂无'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-elevated text-left transition-all animate-slide-up ${
        disabled
          ? 'cursor-not-allowed border-border opacity-50'
          : 'cursor-pointer border-border hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-card-hover'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-4 border-b border-border p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand-light">
          <Icon className="h-5 w-5 text-brand" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <span className="shrink-0 rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {countLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-brand">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
        <div
          className={`mt-4 flex items-center gap-1 text-sm font-medium transition-all ${
            disabled ? 'text-muted' : 'text-brand group-hover:gap-2'
          }`}
        >
          {disabled ? '题目筹备中' : count > 0 ? '进入刷题' : '抢先预览'}
          {!disabled && <ArrowRight className="h-4 w-4" />}
        </div>
      </div>
    </button>
  )
}

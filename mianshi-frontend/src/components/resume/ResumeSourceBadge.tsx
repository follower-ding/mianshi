import { Sparkles, FlaskConical } from 'lucide-react'

type Props = {
  source?: 'llm' | 'demo'
  className?: string
}

/** AI 结果来源标识 */
export function ResumeSourceBadge({ source, className = '' }: Props) {
  if (!source) return null
  if (source === 'llm') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand ${className}`}
      >
        <Sparkles className="h-3 w-3" />
        大模型
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200/90 ${className}`}
    >
      <FlaskConical className="h-3 w-3" />
      演示模式
    </span>
  )
}

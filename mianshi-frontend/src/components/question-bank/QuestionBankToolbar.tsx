import { Play, Zap, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/Button'

type Props = {
  bankTitle: string
  bankSubtitle: string
  listCount: number
  practicedCount: number
  completionPct: number
  onBack: () => void
  onStartPractice: () => void
  onQuickInterview: () => void
}

/** 移动端顶栏；桌面端信息已整合进左侧题目列表 */
export function QuestionBankToolbar({
  bankTitle,
  bankSubtitle,
  listCount,
  practicedCount,
  completionPct,
  onBack,
  onStartPractice,
  onQuickInterview,
}: Props) {
  return (
    <div className="shrink-0 border-b border-border bg-elevated px-4 py-3 lg:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-sm text-text-secondary transition hover:bg-bg-subtle hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
            题库
          </button>
          <div className="min-w-0 border-l border-border pl-2">
            <h1 className="truncate text-sm font-semibold text-text">
              {bankTitle}
              <span className="ml-1.5 text-xs font-normal text-muted">{listCount} 题</span>
            </h1>
            <p className="text-[11px] text-muted">
              {bankSubtitle} · {practicedCount}/{listCount} · {completionPct}%
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onStartPractice}>
            <Play className="h-4 w-4" />
            开刷
          </Button>
          <Button size="sm" variant="secondary" onClick={onQuickInterview}>
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

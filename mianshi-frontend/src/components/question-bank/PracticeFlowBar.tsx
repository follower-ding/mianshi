import { ChevronLeft, ChevronRight, CheckCircle2, Zap, Play, SkipForward } from 'lucide-react'
import { practice } from './practiceLayout'

type Props = {
  index: number
  total: number
  isMastered: boolean
  unpracticedLeft: number
  onPrev: () => void
  onNext: () => void
  onMarkMastered: () => void
  onNextUnpracticed: () => void
  onStartInterview: () => void
  onStartQuiz: () => void
}

export function PracticeFlowBar({
  index,
  total,
  isMastered,
  unpracticedLeft,
  onPrev,
  onNext,
  onMarkMastered,
  onNextUnpracticed,
  onStartInterview,
  onStartQuiz,
}: Props) {
  const atStart = index <= 0
  const atEnd = index >= total - 1

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 lg:px-6">
      <div className={practice.flowBar}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="text-lg font-bold tabular-nums text-text">{index + 1}</span>
            <span>/ {total}</span>
            {unpracticedLeft > 0 && (
              <span className="ml-1 rounded-full bg-brand-light/80 px-2.5 py-0.5 text-xs font-medium text-brand">
                还剩 {unpracticedLeft} 题未刷
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={atStart}
              className={practice.flowBtn}
            >
              <ChevronLeft className="h-4 w-4" />
              上一题
            </button>
            <button
              type="button"
              onClick={onMarkMastered}
              disabled={isMastered}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200 disabled:opacity-60 ${
                isMastered
                  ? 'border-success/30 bg-success-light text-success'
                  : 'border-border/80 bg-elevated/90 text-text-secondary hover:border-success/40 hover:bg-success-light/50 hover:text-success'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isMastered ? '已掌握' : '标记掌握'}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={atEnd}
              className={practice.flowBtn}
            >
              下一题
              <ChevronRight className="h-4 w-4" />
            </button>
            {unpracticedLeft > 0 && (
              <button type="button" onClick={onNextUnpracticed} className={practice.flowBtn}>
                <SkipForward className="h-4 w-4" />
                下一道未刷
              </button>
            )}
            <button type="button" onClick={onStartQuiz} className={practice.flowBtn}>
              <Play className="h-4 w-4" />
              自测
            </button>
            <button type="button" onClick={onStartInterview} className={practice.ctaPrimary}>
              <Zap className="h-4 w-4" />
              模拟面试
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, ListChecks } from 'lucide-react'
import type { LearningPath } from '../../api/client'
import { pathUi, resolvePathAccent, resolvePathIcon } from './pathLayout'

type Props = {
  path: LearningPath
  isExpanded: boolean
  delay?: number
  index?: number
  onToggleExpand: () => void
  onEnter: () => void
}

export function PathCard({
  path,
  isExpanded,
  delay = 0,
  index = 0,
  onToggleExpand,
  onEnter,
}: Props) {
  const disabled = path.totalQuestions === 0
  const accent = resolvePathAccent(path, index)
  const Icon = resolvePathIcon(path)
  const hasStages = path.stages.length > 0

  return (
    <article
      className={`${pathUi.card} animate-slide-up ${isExpanded ? 'ring-1 ring-brand/25' : ''}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`${pathUi.accentBar} ${accent.bar}`} aria-hidden />

      <div className={pathUi.cardBody}>
        <div className={pathUi.cardHeader}>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={pathUi.cardTitle}>{path.title}</h3>
            <p className={pathUi.cardSubtitle}>
              {path.stages.length} 个阶段 · {path.totalQuestions} 道题
            </p>
          </div>
        </div>

        {path.totalQuestions > 0 && (
          <div className={pathUi.progressBlock}>
            <div className={pathUi.progressRow}>
              <span className={pathUi.progressLabel}>整体进度</span>
              <span className={pathUi.progressValue}>{path.progressPct}%</span>
            </div>
            <div className={pathUi.progressTrack}>
              <div
                className={pathUi.progressFill}
                style={{ width: `${path.progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted">
              {path.completedQuestions}/{path.totalQuestions} 题已完成
            </p>
          </div>
        )}

        <div className={pathUi.metaRow}>
          <span className={pathUi.statBadge}>
            <ListChecks className="mr-1 inline h-3 w-3 text-brand/70" />
            {path.completedQuestions}/{path.totalQuestions}
          </span>
          <span className={pathUi.statBadge}>
            <BookOpen className="mr-1 inline h-3 w-3 text-brand/70" />
            {path.category}
          </span>
          <span className={pathUi.statBadge}>
            <Clock className="mr-1 inline h-3 w-3 text-brand/70" />
            随时开刷
          </span>
        </div>

        <div className={pathUi.cardFooter}>
          {hasStages && (
            <button type="button" onClick={onToggleExpand} className={pathUi.toggleLink}>
              {isExpanded ? '收起' : '阶段'}
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onEnter}
            disabled={disabled}
            className={pathUi.ctaPrimary}
          >
            {disabled ? '筹备中' : '进入刷题'}
            {!disabled && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  )
}

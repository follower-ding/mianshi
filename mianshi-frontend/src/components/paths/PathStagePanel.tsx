import { ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LearningPath } from '../../api/client'
import { getStageStatus, pathUi } from './pathLayout'
import { StageTimelineIndicator } from './StageTimelineIndicator'

type Props = {
  path: LearningPath
  onClose: () => void
}

export function PathStagePanel({ path, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <div className={`${pathUi.expandPanel} animate-fade-in`}>
      <div className={pathUi.expandHeader}>
        <div>
          <p className={pathUi.expandTitle}>{path.title} · 阶段详情</p>
          <p className={pathUi.expandMeta}>
            {path.stages.length} 个阶段 · 已完成 {path.completedQuestions}/{path.totalQuestions} 题
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-brand/30 hover:text-brand"
        >
          <X className="h-3.5 w-3.5" />
          收起
        </button>
      </div>

      <div className={pathUi.timelineWrap}>
        {path.stages.map((stage, si) => {
          const status = getStageStatus(path.stages, si)
          const isLast = si === path.stages.length - 1

          return (
            <div key={stage.id} className="flex gap-3">
              <StageTimelineIndicator status={status} showConnector={!isLast} />

              <div className={`${pathUi.stageCard} mb-3 last:mb-0`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={pathUi.stageTitle}>
                      阶段 {si + 1}：{stage.title}
                    </p>
                    <p className={pathUi.stageMeta}>
                      {stage.completed}/{stage.total} 题 · 掌握 {stage.mastered}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={pathUi.stagePct}>{stage.progressPct}</span>
                    <span className={pathUi.stagePctSuffix}>%</span>
                  </div>
                </div>

                <div className={pathUi.stageBar}>
                  <div
                    className={pathUi.stageBarFill}
                    style={{ width: `${stage.progressPct}%` }}
                  />
                </div>

                {stage.questionIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/questions/${path.slug}?id=${stage.questionIds[0]}`)
                    }
                    className={pathUi.stageAction}
                  >
                    从本阶段开始
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

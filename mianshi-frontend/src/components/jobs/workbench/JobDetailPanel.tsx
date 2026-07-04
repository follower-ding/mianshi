import { ExternalLink, MessageSquare, Sparkles, Video } from 'lucide-react'
import type { JobApplication, JobMatchStatus, JobPosting } from '../../../api/client'
import { Button } from '../../ui/Button'
import { Loading } from '../../ui/Loading'
import { DeliveryStatusTag } from './DeliveryStatusTag'
import { MatchStatusTag } from './MatchStatusTag'
import { JdDetailBoard } from './JdDetailBoard'

type Props = {
  job: JobPosting | null
  application?: JobApplication
  matchStatus?: JobMatchStatus
  loading?: boolean
  isApplied: boolean
  applying?: boolean
  approving?: boolean
  hasConversation?: boolean
  onApply?: () => void
  applyLabel?: string
  onApprove?: () => void
  onInterview: () => void
  onOpenMessages: () => void
}

/** 职位轨：仅展示完整岗位信息，不嵌入联系人列表 */
export function JobDetailPanel({
  job,
  application,
  matchStatus,
  loading,
  isApplied,
  applying,
  approving,
  hasConversation,
  onApply,
  applyLabel = '发送招呼',
  onApprove,
  onInterview,
  onOpenMessages,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loading text="加载岗位详情…" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-cyan-400/25" />
        <p className="text-sm font-medium text-text">选择左侧岗位</p>
        <p className="mt-1 text-xs text-muted">在此查看完整 JD、标签与投递信息</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-800/50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-text">{job.title}</h2>
              {application && <DeliveryStatusTag status={application.status} />}
              {!application && matchStatus && <MatchStatusTag status={matchStatus} />}
            </div>
            <p className="mt-1 text-sm font-semibold text-cyan-400">{job.salary}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {job.company} · {job.city} · {job.experience} · {job.education}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {isApplied && hasConversation && (
              <>
                <Button size="sm" variant="secondary" onClick={onInterview}>
                  <Video className="h-3.5 w-3.5" />
                  模拟面试
                </Button>
                <Button size="sm" onClick={onOpenMessages}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  查看对话
                </Button>
              </>
            )}
            {isApplied && !hasConversation && (
              <Button size="sm" variant="secondary" onClick={onInterview}>
                <Video className="h-3.5 w-3.5" />
                模拟面试
              </Button>
            )}
            {!isApplied && (
              <>
                {matchStatus === 'pending_review' && onApprove && (
                  <Button size="sm" variant="secondary" disabled={approving} onClick={onApprove}>
                    {approving ? '确认中…' : '确认打招呼'}
                  </Button>
                )}
                {onApply && (
                  <Button size="sm" disabled={applying} onClick={onApply}>
                    {applying ? '发送中…' : applyLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-gray-800/60 bg-[#0a0e14]/60 px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {tag}
            </span>
          ))}
          {job.source === 'boss' && (
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400 ring-1 ring-cyan-500/20">
              Boss 直聘
            </span>
          )}
        </div>

        {job.externalUrl && (
          <a
            href={job.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
          >
            公司主页
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <JdDetailBoard job={job} application={application} embedded full />
      </div>
    </div>
  )
}

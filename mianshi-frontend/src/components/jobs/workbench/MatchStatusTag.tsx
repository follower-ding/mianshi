import type { JobMatchStatus } from '../../../api/client'

const LABEL: Record<JobMatchStatus, string> = {
  pending_review: '待确认',
  queued: '待打招呼',
  applied: '已打招呼',
  skipped: '已跳过',
}

const STYLE: Record<JobMatchStatus, string> = {
  pending_review: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  queued: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  applied: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  skipped: 'bg-gray-500/10 text-muted ring-gray-500/20',
}

export function MatchStatusTag({ status }: { status: JobMatchStatus }) {
  return (
    <span
      className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ring-1 ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  )
}

import { Briefcase, MessageSquare } from 'lucide-react'

export type WorkbenchTrack = 'jobs' | 'messages'

type Props = {
  track: WorkbenchTrack
  onTrackChange: (track: WorkbenchTrack) => void
  unreadTotal?: number
}

export function WorkbenchTrackToggle({ track, onTrackChange, unreadTotal = 0 }: Props) {
  return (
    <div className="shrink-0 border-b border-gray-800/60 px-4 py-2.5">
      <div className="inline-flex rounded-lg border border-gray-800/60 bg-[#0a0e14]/60 p-0.5">
        <button
          type="button"
          onClick={() => onTrackChange('jobs')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            track === 'jobs'
              ? 'bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/25'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          职位浏览
        </button>
        <button
          type="button"
          onClick={() => onTrackChange('messages')}
          className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            track === 'messages'
              ? 'bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/25'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          全部对话
          {unreadTotal > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted">
        {track === 'jobs'
          ? '左侧选岗位，右侧查看完整 JD 与投递操作'
          : '浏览全部 HR 会话，独立处理消息与 AI 话术'}
      </p>
    </div>
  )
}

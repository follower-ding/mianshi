import type { ReactNode } from 'react'
import { Briefcase, Building2, GraduationCap, MapPin, Send, Sparkles, Target } from 'lucide-react'
import type { JobApplication, JobMatch } from '../../../api/client'
import { EmptyState } from '../../ui/EmptyState'
import { DeliveryStatusTag } from './DeliveryStatusTag'
import { MatchStatusTag } from './MatchStatusTag'
import type { WorkbenchTab } from './constants'
import { TAB_LABEL } from './constants'

type Props = {
  tab: WorkbenchTab
  onTabChange: (tab: WorkbenchTab) => void
  recommendCount: number
  applicationsCount: number
  allMatchesCount: number
  applications: JobApplication[]
  recommendations: JobMatch[]
  allMatches: JobMatch[]
  selectedApplicationId?: string
  selectedJobId?: string
  selectedMatchIds?: Set<string>
  chatUnreadByJobId: Record<string, number>
  batchGreeting?: boolean
  onBatchGreet?: (matchIds: string[]) => void
  onToggleMatch?: (matchId: string, checked: boolean) => void
  onSelectApplication: (app: JobApplication) => void
  onSelectJob: (match: JobMatch) => void
}

function greetableMatches(items: JobMatch[]) {
  return items.filter(
    (m) =>
      m.job &&
      !m.job.externalId?.startsWith('demo-') &&
      (m.status === 'pending_review' || m.status === 'queued'),
  )
}

export function DeliveryListPanel({
  tab,
  onTabChange,
  recommendCount,
  applicationsCount,
  allMatchesCount,
  applications,
  recommendations,
  allMatches,
  selectedApplicationId,
  selectedJobId,
  selectedMatchIds,
  chatUnreadByJobId,
  batchGreeting,
  onBatchGreet,
  onToggleMatch,
  onSelectApplication,
  onSelectJob,
}: Props) {
  const currentList = tab === 'recommend' ? recommendations : tab === 'jobs' ? allMatches : []
  const greetable = tab !== 'applications' ? greetableMatches(currentList) : []
  const selectedCount = greetable.filter((m) => selectedMatchIds?.has(m.id)).length

  return (
    <aside className="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-r border-gray-800/60 bg-[#0d1117]/40">
      <div className="shrink-0 border-b border-gray-800/60 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">职位筛选</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(['recommend', 'jobs', 'applications'] as WorkbenchTab[]).map((t) => {
            const count =
              t === 'recommend' ? recommendCount : t === 'jobs' ? allMatchesCount : applicationsCount
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTabChange(t)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-200 ${
                  tab === t
                    ? 'bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25'
                    : 'text-text-secondary hover:bg-gray-800/50 hover:text-text'
                }`}
              >
                {TAB_LABEL[t]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {tab !== 'applications' && onBatchGreet && greetable.length > 0 && (
        <div className="shrink-0 border-b border-gray-800/40 px-3 py-2">
          <button
            type="button"
            disabled={batchGreeting}
            onClick={() => {
              const ids =
                selectedCount > 0
                  ? greetable.filter((m) => selectedMatchIds?.has(m.id)).map((m) => m.id)
                  : greetable.map((m) => m.id)
              onBatchGreet(ids)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-500/12 px-2 py-1.5 text-[11px] font-medium text-cyan-400 ring-1 ring-cyan-500/25 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {batchGreeting
              ? '打招呼中…'
              : selectedCount > 0
                ? `批量打招呼（已选 ${selectedCount}）`
                : `批量打招呼（${greetable.length} 个待处理）`}
          </button>
          <p className="mt-1 text-center text-[9px] text-muted">勾选左侧复选框可指定岗位</p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === 'applications' && (
          <ApplicationList
            items={applications}
            selectedId={selectedApplicationId}
            chatUnreadByJobId={chatUnreadByJobId}
            onSelect={onSelectApplication}
          />
        )}
        {tab === 'recommend' && (
          <MatchList
            items={recommendations}
            selectedJobId={selectedJobId}
            selectedMatchIds={selectedMatchIds}
            selectable
            onToggle={onToggleMatch}
            onSelect={onSelectJob}
          />
        )}
        {tab === 'jobs' && (
          <MatchList
            items={allMatches}
            selectedJobId={selectedJobId}
            selectedMatchIds={selectedMatchIds}
            selectable
            onToggle={onToggleMatch}
            onSelect={onSelectJob}
            icon={Target}
          />
        )}
      </div>
    </aside>
  )
}

function ApplicationList({
  items,
  selectedId,
  chatUnreadByJobId,
  onSelect,
}: {
  items: JobApplication[]
  selectedId?: string
  chatUnreadByJobId: Record<string, number>
  onSelect: (app: JobApplication) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="暂无招呼记录"
        description="在推荐岗位中发送招呼后，记录会出现在这里"
        className="m-3 border-none bg-transparent py-6"
      />
    )
  }

  return (
    <ul className="divide-y divide-gray-800/30">
      {items.map((app) => (
        <JobCard
          key={app.id}
          active={app.id === selectedId}
          unread={chatUnreadByJobId[app.jobId] ?? 0}
          title={app.job?.title ?? '未知岗位'}
          company={app.job?.company ?? ''}
          salary={app.job?.salary}
          city={app.job?.city}
          snippet={app.bossReplySnippet ? `HR：${app.bossReplySnippet}` : undefined}
          statusTag={<DeliveryStatusTag status={app.status} />}
          onClick={() => onSelect(app)}
        />
      ))}
    </ul>
  )
}

function MatchList({
  items,
  selectedJobId,
  selectedMatchIds,
  selectable,
  onToggle,
  onSelect,
  icon: Icon = Sparkles,
}: {
  items: JobMatch[]
  selectedJobId?: string
  selectedMatchIds?: Set<string>
  selectable?: boolean
  onToggle?: (matchId: string, checked: boolean) => void
  onSelect: (match: JobMatch) => void
  icon?: typeof Sparkles
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title="暂无岗位"
        description="绑定 Boss 并同步后，匹配岗位会显示在这里"
        className="m-3 border-none bg-transparent py-6"
      />
    )
  }

  return (
    <ul className="divide-y divide-gray-800/30">
      {items.map((match) => {
        const job = match.job
        if (!job) return null
        const canSelect =
          selectable &&
          !job.externalId?.startsWith('demo-') &&
          (match.status === 'pending_review' || match.status === 'queued')
        return (
          <JobCard
            key={match.id}
            active={job.id === selectedJobId}
            checked={selectedMatchIds?.has(match.id)}
            showCheckbox={canSelect}
            onCheckChange={(checked) => onToggle?.(match.id, checked)}
            title={job.title}
            company={job.company}
            salary={job.salary}
            city={job.city}
            experience={job.experience}
            education={job.education}
            tier={`${match.tier}级 · ${match.score}分`}
            statusTag={<MatchStatusTag status={match.status} />}
            icon={Icon}
            onClick={() => onSelect(match)}
          />
        )
      })}
    </ul>
  )
}

function JobCard({
  active,
  unread = 0,
  checked,
  showCheckbox,
  onCheckChange,
  title,
  company,
  salary,
  city,
  experience,
  education,
  tier,
  snippet,
  statusTag,
  icon: Icon = Briefcase,
  onClick,
}: {
  active: boolean
  unread?: number
  checked?: boolean
  showCheckbox?: boolean
  onCheckChange?: (checked: boolean) => void
  title: string
  company: string
  salary?: string
  city?: string
  experience?: string
  education?: string
  tier?: string
  snippet?: string
  statusTag?: ReactNode
  icon?: typeof Briefcase
  onClick: () => void
}) {
  return (
    <li>
      <div
        className={`relative flex w-full items-stretch transition-all duration-200 ${
          active ? 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/25' : 'hover:bg-gray-800/35'
        }`}
      >
        {showCheckbox && (
          <label className="flex shrink-0 cursor-pointer items-center px-2">
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={(e) => onCheckChange?.(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-gray-600"
            />
          </label>
        )}
        <button type="button" onClick={onClick} className="min-w-0 flex-1 px-3 py-2.5 text-left">
          {unread > 0 && (
            <span className="absolute right-2 top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          <div className="flex items-start gap-2 pr-5">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? 'text-cyan-400' : 'text-muted'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p className={`truncate text-xs font-semibold ${active ? 'text-cyan-400' : 'text-text'}`}>
                  {title}
                </p>
                {statusTag}
              </div>
              <p className="mt-0.5 flex items-center gap-0.5 text-[11px] text-text-secondary">
                <Building2 className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{company}</span>
              </p>
              {salary && <p className="mt-0.5 text-[11px] font-medium text-cyan-400/90">{salary}</p>}
              <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[9px] text-muted">
                {(education || experience) && (
                  <span className="inline-flex items-center gap-0.5">
                    <GraduationCap className="h-2 w-2" />
                    {[education, experience].filter(Boolean).join(' · ')}
                  </span>
                )}
                {city && (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-2 w-2" />
                    {city}
                  </span>
                )}
              </p>
              {tier && (
                <span className="mt-1 inline-block rounded bg-cyan-500/10 px-1 py-0.5 text-[9px] font-semibold text-cyan-400 ring-1 ring-cyan-500/20">
                  AI {tier}
                </span>
              )}
              {snippet && (
                <p className={`mt-1 line-clamp-1 text-[9px] ${unread > 0 ? 'text-text' : 'text-text-secondary'}`}>
                  {snippet}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>
    </li>
  )
}

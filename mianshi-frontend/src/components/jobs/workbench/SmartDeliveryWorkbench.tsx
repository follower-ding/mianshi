import { useCallback, useMemo, useState } from 'react'
import type { BossChatItem, BossChatMessage, JobApplication, JobMatch, JobPosting } from '../../../api/client'
import { AgentStatusBar } from './AgentStatusBar'
import { BossLoginBanner } from './BossLoginBanner'
import { BossSafetyBanner } from './BossSafetyBanner'
import { DeliveryListPanel } from './DeliveryListPanel'
import { JobDetailPanel } from './JobDetailPanel'
import { MessageInboxView } from './MessageInboxView'
import { WorkbenchToolbar } from './WorkbenchToolbar'
import { WorkbenchTrackToggle, type WorkbenchTrack } from './WorkbenchTrackToggle'
import { ChatPaneTransition } from './ChatPaneTransition'
import type { WorkbenchTab } from './constants'
import type { ReplySuggestion } from './replySuggestions'

export type SmartDeliveryWorkbenchProps = {
  tab: WorkbenchTab
  onTabChange: (tab: WorkbenchTab) => void
  applications: JobApplication[]
  recommendations: JobMatch[]
  allMatches: JobMatch[]
  bossChats: BossChatItem[]
  selectedApplication?: JobApplication
  selectedMatch?: JobMatch
  selectedJob: JobPosting | null
  activeChatJobId?: string
  jobLoading: boolean
  isApplied: boolean
  messages: BossChatMessage[]
  chatLoading: boolean
  draft: string
  sending: boolean
  suggestions: ReplySuggestion[]
  showInspiration: boolean
  chatUnreadByJobId: Record<string, number>
  recommendCount: number
  bossBound: boolean
  bossNeedsLogin: boolean
  bossName?: string
  bossSafety?: { paused: boolean; reason?: string; until?: string }
  crawling: boolean
  syncing: boolean
  logRefreshKey: number
  applying: boolean
  approving?: boolean
  onSelectApplication: (app: JobApplication) => void
  onSelectJob: (match: JobMatch) => void
  onSelectChat: (chat: BossChatItem) => void
  onInterview: () => void
  onApply?: () => void
  onApprove?: () => void
  onDraftChange: (v: string) => void
  onSend: () => void
  onAdoptSuggestion: (text: string) => void
  onCrawl: () => void
  onSync: () => void
  onSettings: () => void
  onBossLogin?: () => void
  batchGreeting?: boolean
  onBatchGreet?: (matchIds: string[]) => void
  selectedMatchIds?: Set<string>
  onToggleMatch?: (matchId: string, checked: boolean) => void
  applyLabel?: string
  onChatNotFound?: () => void
}

export function SmartDeliveryWorkbench(props: SmartDeliveryWorkbenchProps) {
  const {
    tab,
    onTabChange,
    applications,
    recommendations,
    allMatches,
    bossChats,
    selectedApplication,
    selectedMatch,
    selectedJob,
    activeChatJobId,
    jobLoading,
    isApplied,
    messages,
    chatLoading,
    draft,
    sending,
    suggestions,
    showInspiration,
    recommendCount,
    chatUnreadByJobId,
    bossBound,
    bossNeedsLogin,
    bossName,
    bossSafety,
    crawling,
    syncing,
    logRefreshKey,
    applying,
    approving,
    onSelectApplication,
    onSelectJob,
    onSelectChat,
    onInterview,
    onApply,
    onApprove,
    onDraftChange,
    onSend,
    onAdoptSuggestion,
    onCrawl,
    onSync,
    onSettings,
    onBossLogin,
    batchGreeting,
    onBatchGreet,
    selectedMatchIds,
    onToggleMatch,
    applyLabel,
    onChatNotFound,
  } = props

  const [track, setTrack] = useState<WorkbenchTrack>('jobs')

  const unreadTotal = useMemo(
    () => bossChats.reduce((sum, c) => sum + (c.unread ?? 0), 0),
    [bossChats],
  )

  const hasConversation = Boolean(
    selectedJob &&
      bossChats.some(
        (c) => c.jobId && (c.jobId === selectedJob.externalId || c.jobId === selectedJob.id),
      ),
  )

  const handleTrackChange = useCallback(
    (next: WorkbenchTrack) => {
      setTrack(next)
      if (next === 'messages' && !activeChatJobId && bossChats.length > 0) {
        const firstUnread = bossChats.find((c) => c.jobId && (c.unread ?? 0) > 0)
        const first = firstUnread ?? bossChats.find((c) => c.jobId)
        if (first) onSelectChat(first)
      }
    },
    [activeChatJobId, bossChats, onSelectChat],
  )

  const handleOpenMessages = useCallback(() => {
    if (!selectedJob) return
    const chat = bossChats.find(
      (c) => c.jobId && (c.jobId === selectedJob.externalId || c.jobId === selectedJob.id),
    )
    if (!chat) {
      onChatNotFound?.()
      return
    }
    setTrack('messages')
    onSelectChat(chat)
  }, [selectedJob, bossChats, onSelectChat, onChatNotFound])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg-page px-4 py-5 lg:px-6 lg:py-6">
      <AgentStatusBar
        logRefreshKey={logRefreshKey}
        bossNeedsLogin={bossNeedsLogin}
        onBossLogin={onBossLogin}
      />

      {bossNeedsLogin && onBossLogin && <BossLoginBanner onLogin={onBossLogin} />}

      {bossSafety?.paused && (
        <BossSafetyBanner reason={bossSafety.reason} until={bossSafety.until} />
      )}
      <WorkbenchToolbar
        bossBound={bossBound}
        bossNeedsLogin={bossNeedsLogin}
        bossName={bossName}
        crawling={crawling}
        syncing={syncing}
        onCrawl={onCrawl}
        onSync={onSync}
        onSettings={onSettings}
        onBossLogin={onBossLogin}
      />

      <div className="mx-auto flex h-[min(680px,calc(100vh-11rem))] max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-gray-800/70 bg-[#0d1117]/90 shadow-2xl shadow-black/40 ring-1 ring-white/[0.03] backdrop-blur-sm animate-view-fade-in">
        <WorkbenchTrackToggle
          track={track}
          onTrackChange={handleTrackChange}
          unreadTotal={unreadTotal}
        />

        <div className="min-h-0 flex-1">
          <ChatPaneTransition paneKey={track} className="h-full">
            {track === 'jobs' ? (
              <div className="flex h-full min-h-0">
                <DeliveryListPanel
                  tab={tab}
                  onTabChange={onTabChange}
                  recommendCount={recommendCount}
                  applicationsCount={applications.length}
                  allMatchesCount={allMatches.length}
                  applications={applications}
                  recommendations={recommendations}
                  allMatches={allMatches}
                  selectedApplicationId={selectedApplication?.id}
                  selectedJobId={selectedJob?.id}
                  chatUnreadByJobId={chatUnreadByJobId}
                  batchGreeting={batchGreeting}
                  onBatchGreet={onBatchGreet}
                  selectedMatchIds={selectedMatchIds}
                  onToggleMatch={onToggleMatch}
                  onSelectApplication={onSelectApplication}
                  onSelectJob={onSelectJob}
                />
                <section className="min-h-0 min-w-0 flex-1 border-l border-gray-800/40">
                  <JobDetailPanel
                    job={selectedJob}
                    application={selectedApplication}
                    matchStatus={selectedMatch?.status}
                    loading={jobLoading}
                    isApplied={isApplied}
                    applying={applying}
                    approving={approving}
                    hasConversation={hasConversation}
                    onApply={onApply}
                    applyLabel={applyLabel}
                    onApprove={onApprove}
                    onInterview={onInterview}
                    onOpenMessages={handleOpenMessages}
                  />
                </section>
              </div>
            ) : (
              <MessageInboxView
                chats={bossChats}
                selectedChatJobId={activeChatJobId}
                messages={messages}
                chatLoading={chatLoading}
                draft={draft}
                sending={sending}
                suggestions={suggestions}
                showInspiration={showInspiration}
                onSelectChat={onSelectChat}
                onDraftChange={onDraftChange}
                onSend={onSend}
                onAdoptSuggestion={onAdoptSuggestion}
              />
            )}
          </ChatPaneTransition>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type BossChatItem,
  type BossChatMessage,
  type JobApplication,
  type JobMatch,
  type JobPosting,
} from '../api/client'
import { BRAND } from '../lib/brand'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { BossBindModal } from '../components/jobs/BossBindModal'
import { JobPreferencesModal } from '../components/jobs/JobPreferencesModal'
import { ManualCrawlModal } from '../components/jobs/ManualCrawlModal'
import { SmartDeliveryWorkbench } from '../components/jobs/workbench/SmartDeliveryWorkbench'
import type { WorkbenchTab } from '../components/jobs/workbench/constants'
import {
  buildReplySuggestions,
  shouldShowInspiration,
  type ReplySuggestion,
} from '../components/jobs/workbench/replySuggestions'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { JobsWorkbenchSkeleton } from '../components/ui/Skeleton'

async function openBossWithGreeting(bossUrl: string | undefined, greeting: string) {
  if (greeting) {
    try {
      await navigator.clipboard.writeText(greeting)
    } catch {
      /* ignore */
    }
  }
  if (bossUrl) window.open(bossUrl, '_blank', 'noopener,noreferrer')
}

function isLegacyJob(job?: JobPosting) {
  if (!job) return false
  if (job.externalId?.startsWith('demo-')) return true
  if (job.jd?.includes('演示数据')) return true
  return false
}

function withoutLegacyMatches(matches: JobMatch[]) {
  return matches.filter((m) => !isLegacyJob(m.job))
}

function withoutLegacyApplications(apps: JobApplication[]) {
  return apps.filter((a) => !isLegacyJob(a.job as JobPosting | undefined))
}

export function JobsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState<WorkbenchTab>(user ? 'applications' : 'jobs')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [recommendations, setRecommendations] = useState<JobMatch[]>([])
  const [allMatches, setAllMatches] = useState<JobMatch[]>([])
  const [bossChats, setBossChats] = useState<BossChatItem[]>([])
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [manualCrawlOpen, setManualCrawlOpen] = useState(false)
  const [bindModalOpen, setBindModalOpen] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [bossBound, setBossBound] = useState(false)
  const [needRebind, setNeedRebind] = useState(false)
  const [bossName, setBossName] = useState<string>()
  const [bossSafety, setBossSafety] = useState<{ paused: boolean; reason?: string; until?: string }>()
  const [syncing, setSyncing] = useState(false)
  const [logRefreshKey, setLogRefreshKey] = useState(0)
  const [applying, setApplying] = useState(false)
  const [approving, setApproving] = useState(false)
  const [batchGreeting, setBatchGreeting] = useState(false)
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(() => new Set())

  const [selectedApplication, setSelectedApplication] = useState<JobApplication>()
  const [selectedMatch, setSelectedMatch] = useState<JobMatch>()
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [jobLoading, setJobLoading] = useState(false)

  const [messages, setMessages] = useState<BossChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([])
  const [showInspiration, setShowInspiration] = useState(false)
  const [activeChatJobId, setActiveChatJobId] = useState<string>()
  const demoPurgedRef = useRef(false)

  const visibleRecommendations = useMemo(() => withoutLegacyMatches(recommendations), [recommendations])
  const visibleAllMatches = useMemo(() => withoutLegacyMatches(allMatches), [allMatches])
  const visibleApplications = useMemo(() => withoutLegacyApplications(applications), [applications])

  const greetedJobIds = useMemo(
    () =>
      new Set(
        visibleApplications.filter((a) => a.bossApplyStatus === 'sent').map((a) => a.jobId),
      ),
    [visibleApplications],
  )

  const failedGreetJobIds = useMemo(
    () =>
      new Set(
        visibleApplications.filter((a) => a.bossApplyStatus === 'failed').map((a) => a.jobId),
      ),
    [visibleApplications],
  )

  const chatUnreadByJobId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of bossChats) {
      if (!c.jobId || !(c.unread ?? 0)) continue
      map[c.jobId] = c.unread ?? 0
      const app = visibleApplications.find((a) => (a.job as JobPosting | undefined)?.externalId === c.jobId)
      if (app?.jobId) map[app.jobId] = c.unread ?? 0
      const match = visibleAllMatches.find((m) => m.job?.externalId === c.jobId)
      if (match?.job?.id) map[match.job.id] = c.unread ?? 0
    }
    return map
  }, [bossChats, visibleApplications, visibleAllMatches])

  const bossNeedsLogin = useMemo(() => {
    if (!bossBound) return true
    if (needRebind) return true
    return false
  }, [bossBound, needRebind])

  const loadApplications = useCallback(async () => {
    if (!user) {
      setApplications([])
      setSyncEnabled(false)
      return
    }
    const res = await api.listApplications()
    setApplications(res.items)
    setSyncEnabled(res.syncEnabled)
  }, [user])

  const loadRecommendations = useCallback(async () => {
    if (!user) {
      setRecommendations([])
      return
    }
    try {
      const res = await api.getJobRecommendations()
      setRecommendations(res.items)
    } catch {
      setRecommendations([])
    }
  }, [user])

  const loadMatches = useCallback(async () => {
    if (!user) {
      setAllMatches([])
      return
    }
    try {
      const res = await api.getJobMatches({ tier: 'S,A,B,C' })
      setAllMatches(res.items)
    } catch {
      setAllMatches([])
    }
  }, [user])

  const loadBossSession = useCallback(async () => {
    if (!user) {
      setBossBound(false)
      return
    }
    try {
      const session = await api.getBossSession()
      setBossBound(session.bound && !session.needRebind)
      setBossName(session.bossName)
      setNeedRebind(Boolean(session.needRebind))
      setBossSafety(session.safety)
    } catch {
      setBossBound(false)
    }
  }, [user])

  const loadBossChats = useCallback(async () => {
    if (!user) {
      setBossChats([])
      return
    }
    try {
      const res = await api.getBossChats()
      setBossChats(res.items)
      if (res.error && res.items.length === 0) {
        showToast(res.error, 'error')
      } else if (res.localOnly) {
        showToast('Boss 远程会话暂不可用，已显示本地招呼记录', 'error')
      }
    } catch {
      setBossChats([])
    }
  }, [user, showToast])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadApplications(),
        loadRecommendations(),
        loadMatches(),
        loadBossSession(),
        loadBossChats(),
      ])
    } finally {
      setLoading(false)
    }
  }, [loadApplications, loadRecommendations, loadMatches, loadBossSession, loadBossChats])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!user || !bossBound || demoPurgedRef.current) return
    demoPurgedRef.current = true
    void api.purgeDemoJobs().then((res) => {
      if (res.removed > 0) {
        showToast(res.message ?? '已清除历史无效数据', 'success')
        void loadApplications()
        void loadMatches()
        void loadRecommendations()
        void loadBossChats()
      }
    })
    void api.syncBossApplications().then(() => {
      void loadBossChats()
      void loadApplications()
    })
  }, [user, bossBound, showToast, loadApplications, loadMatches, loadRecommendations, loadBossChats])

  const loadJobDetail = useCallback(async (jobId: string, fallback?: JobPosting) => {
    setJobLoading(true)
    try {
      const job = await api.getJob(jobId)
      setSelectedJob(job)
    } catch {
      setSelectedJob(fallback ?? null)
    } finally {
      setJobLoading(false)
    }
  }, [])

  /** 从缓存解析岗位，供对话轨 AI 话术使用（不污染职位轨选中态） */
  const resolveJobForChat = useCallback(
    async (chatJobId: string): Promise<JobPosting | null> => {
      if (
        selectedJob &&
        (selectedJob.id === chatJobId || selectedJob.externalId === chatJobId)
      ) {
        return selectedJob
      }

      const app = visibleApplications.find(
        (a) => a.jobId === chatJobId || (a.job as JobPosting | undefined)?.externalId === chatJobId,
      )
      const match =
        visibleRecommendations.find(
          (m) => m.job?.id === chatJobId || m.job?.externalId === chatJobId,
        ) ??
        visibleAllMatches.find(
          (m) => m.job?.id === chatJobId || m.job?.externalId === chatJobId,
        )

      const fallback = (app?.job as JobPosting | undefined) ?? match?.job ?? null
      if (fallback?.jd) return fallback

      if (app?.jobId && app.jobId !== chatJobId) {
        try {
          return await api.getJob(app.jobId)
        } catch {
          /* fall through */
        }
      }

      try {
        return await api.getJob(chatJobId)
      } catch {
        return fallback
      }
    },
    [selectedJob, visibleApplications, visibleRecommendations, visibleAllMatches],
  )

  useEffect(() => {
    if (selectedApplication?.jobId) {
      loadJobDetail(selectedApplication.jobId, selectedApplication.job as JobPosting | undefined)
    }
  }, [selectedApplication, loadJobDetail])

  useEffect(() => {
    if (selectedMatch?.job?.id && tab !== 'applications') {
      loadJobDetail(selectedMatch.job.id, selectedMatch.job)
    }
  }, [selectedMatch, tab, loadJobDetail])

  const loadChatMessages = useCallback(async (jobId: string) => {
    setChatLoading(true)
    try {
      const res = await api.getBossChatMessages(jobId)
      setMessages(res.items)
      const lastHr = [...res.items].reverse().find((m) => m.role === 'hr')
      if (lastHr) {
        const job = await resolveJobForChat(jobId)
        if (job) {
          const sug = await api.suggestBossReply(jobId, lastHr.content, job.id)
          const cards = buildReplySuggestions(sug.analysis, job)
          setSuggestions(cards)
          setShowInspiration(shouldShowInspiration(lastHr.content, sug.analysis.intent))
        } else {
          setSuggestions([])
          setShowInspiration(false)
        }
      } else {
        setSuggestions([])
        setShowInspiration(false)
      }
    } catch {
      setMessages([])
      setSuggestions([])
      setShowInspiration(false)
    } finally {
      setChatLoading(false)
    }
  }, [resolveJobForChat])

  useEffect(() => {
    if (!activeChatJobId) {
      setMessages([])
      setSuggestions([])
      setShowInspiration(false)
      return
    }
    loadChatMessages(activeChatJobId)
  }, [activeChatJobId, loadChatMessages])

  const selectFirstInTab = useCallback(
    (t: WorkbenchTab) => {
      if (t === 'applications') {
        const first = visibleApplications[0]
        if (first) {
          setSelectedApplication(first)
          setSelectedMatch(undefined)
        } else {
          setSelectedApplication(undefined)
          setSelectedJob(null)
        }
        return
      }
      const list = t === 'recommend' ? visibleRecommendations : visibleAllMatches
      const first = list[0]
      if (first) {
        setSelectedMatch(first)
        setSelectedApplication(undefined)
      } else {
        setSelectedMatch(undefined)
        setSelectedJob(null)
      }
    },
    [visibleApplications, visibleRecommendations, visibleAllMatches],
  )

  useEffect(() => {
    if (loading) return
    if (selectedJob || selectedApplication) return
    const hasItems =
      tab === 'applications'
        ? visibleApplications.length > 0
        : tab === 'recommend'
          ? visibleRecommendations.length > 0
          : visibleAllMatches.length > 0
    if (!hasItems) return
    selectFirstInTab(tab)
  }, [loading, tab, selectedJob, selectedApplication, visibleApplications, visibleRecommendations, visibleAllMatches, selectFirstInTab])

  const handleTabChange = (t: WorkbenchTab) => {
    setTab(t)
    selectFirstInTab(t)
  }

  const handleSelectApplication = (app: JobApplication) => {
    setSelectedApplication(app)
    setSelectedMatch(undefined)
    setDraft('')
  }

  const handleSelectJob = (match: JobMatch) => {
    setSelectedMatch(match)
    setSelectedApplication(undefined)
    setDraft('')
  }

  const handleSelectChat = (chat: BossChatItem) => {
    if (!chat.jobId) return
    setActiveChatJobId(chat.jobId)
    setDraft('')
  }

  const handleSend = async (text?: string) => {
    const message = (text ?? draft).trim()
    if (!activeChatJobId || !message) return
    setSending(true)
    try {
      const job = await resolveJobForChat(activeChatJobId)
      await api.sendBossChatReply(activeChatJobId, message, {
        company: job?.company ?? bossChats.find((c) => c.jobId === activeChatJobId)?.company,
        jobTitle: job?.title ?? bossChats.find((c) => c.jobId === activeChatJobId)?.title,
      })
      setDraft('')
      await loadChatMessages(activeChatJobId)
      await loadBossChats()
    } finally {
      setSending(false)
    }
  }

  const handleAdoptSuggestion = (text: string) => {
    setDraft(text)
    handleSend(text)
  }

  const handleInterview = () => {
    const app =
      selectedApplication ?? applications.find((a) => a.jobId === selectedJob?.id)
    if (!app) return
    const position = app.job?.position ?? app.job?.title ?? 'Java 后端开发'
    navigate(
      `/interview?applicationId=${app.id}&position=${encodeURIComponent(position)}&experience=3-5%20%E5%B9%B4&mode=standard`,
    )
  }

  const handleToggleMatch = (matchId: string, checked: boolean) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(matchId)
      else next.delete(matchId)
      return next
    })
  }

  const handleApply = async () => {
    if (!selectedJob || !user) return
    if (!syncEnabled) {
      showToast('投递功能需 PostgreSQL 模式', 'error')
      return
    }
    setApplying(true)
    try {
      const preview = await api.previewJobGreeting(selectedJob.id)
      const res = await api.applyJob(selectedJob.id, { greeting: preview.greeting })
      if (res.bossApply && !res.bossApply.ok) {
        showToast(res.bossApply.message ?? '打招呼失败', 'error')
        return
      }
      if (res.bossApply?.inApp && res.bossApply.ok) {
        showToast(res.bossApply.message, 'success')
      } else if (res.bossUrl) {
        await openBossWithGreeting(res.bossUrl, preview.greeting)
      }
      await loadApplications()
      await loadRecommendations()
      await loadMatches()
      await loadBossChats()
      setTab('applications')
      const updated = (await api.listApplications()).items.find((a) => a.jobId === selectedJob.id)
      if (updated) {
        setSelectedApplication(updated)
        const extId = (updated.job as JobPosting | undefined)?.externalId
        setActiveChatJobId(extId ?? selectedJob.externalId ?? selectedJob.id)
      }
      setLogRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '打招呼失败', 'error')
    } finally {
      setApplying(false)
    }
  }

  const showCrawlResult = async (
    res: Awaited<ReturnType<typeof api.triggerBossCrawl>>,
  ) => {
    if (!res.ok) {
      showToast(res.message ?? '抓取失败', 'error')
      return
    }
    const recRes = await api.getJobRecommendations()
    await loadMatches()
    await loadApplications()
    setRecommendations(recRes.items)
    setLogRefreshKey((k) => k + 1)
    const sourceLabel =
      res.source === 'boss_api'
        ? 'Boss API'
        : res.source === 'playwright'
          ? '浏览器'
          : 'Firecrawl'
    const applyPart = res.apply?.applied
      ? `，已打招呼 ${res.apply.applied}/${res.apply.total ?? res.apply.applied} 个`
      : ''
    const inboxPart =
      res.inbox?.replies || res.inbox?.interviews
        ? `，AI 回复 ${res.inbox.replies ?? 0} 条，面试 ${res.inbox.interviews ?? 0} 个`
        : ''
    showToast(
      `抓取完成（${sourceLabel}）：${res.jobsFound} 个岗位，新增 ${res.jobsNew}${applyPart}${inboxPart}`,
      'success',
    )
    setTab('recommend')
    const first = withoutLegacyMatches(recRes.items)[0]
    if (first) {
      setSelectedMatch(first)
      setSelectedApplication(undefined)
    }
  }

  const handleManualCrawlDone = async (res: Awaited<ReturnType<typeof api.triggerBossCrawl>>) => {
    setCrawling(false)
    await showCrawlResult(res)
  }

  const handleBatchGreet = async (matchIds: string[]) => {
    if (!user || matchIds.length === 0) return
    setBatchGreeting(true)
    try {
      const res = await api.batchGreetMatches(matchIds)
      await loadApplications()
      await loadRecommendations()
      await loadMatches()
      await loadBossChats()
      setSelectedMatchIds(new Set())
      setLogRefreshKey((k) => k + 1)
      const level = res.applied ? 'success' : 'error'
      showToast(
        res.message ??
          (res.failures?.[0]
            ? `失败：${res.failures[0]}`
            : `已打招呼 ${res.applied}/${res.total} 个`),
        level,
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : '批量打招呼失败', 'error')
    } finally {
      setBatchGreeting(false)
    }
  }

  const handleApproveMatch = async () => {
    if (!selectedMatch || selectedMatch.status !== 'pending_review') return
    setApproving(true)
    try {
      const res = await api.approveJobMatch(selectedMatch.id)
      setSelectedMatch(res.match)
      await loadRecommendations()
      await loadMatches()
      showToast('已加入打招呼队列，下次抓取时将自动发送招呼', 'success')
      setLogRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '批准失败', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleSyncBoss = async () => {
    setSyncing(true)
    try {
      const res = await api.syncBossApplications()
      await loadApplications()
      await loadBossChats()
      if (activeChatJobId) {
        await loadChatMessages(activeChatJobId)
      }
      setLogRefreshKey((k) => k + 1)
      showToast(res.message ?? `同步 ${res.syncedChats ?? 0} 个会话，AI 回复 ${res.replies} 条`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '同步失败', 'error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <JobsWorkbenchSkeleton />

  if (!user) {
    return (
      <Card className="mx-auto mt-16 max-w-md p-8 text-center">
        <p className="text-text-secondary">登录后使用 {BRAND.name} 智能投递工作台</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>
          去登录
        </Button>
      </Card>
    )
  }

  const isApplied = selectedJob ? greetedJobIds.has(selectedJob.id) : Boolean(selectedApplication)
  const canGreet =
    selectedJob && (!greetedJobIds.has(selectedJob.id) || failedGreetJobIds.has(selectedJob.id))
  const applyLabel = selectedJob && failedGreetJobIds.has(selectedJob.id) ? '重试打招呼' : '发送招呼'

  return (
    <>
      <SmartDeliveryWorkbench
        tab={tab}
        onTabChange={handleTabChange}
        applications={visibleApplications}
        recommendations={visibleRecommendations}
        allMatches={visibleAllMatches}
        bossChats={bossChats}
        selectedApplication={selectedApplication}
        selectedMatch={selectedMatch}
        selectedJob={selectedJob}
        activeChatJobId={activeChatJobId}
        jobLoading={jobLoading}
        isApplied={isApplied}
        messages={messages}
        chatLoading={chatLoading}
        draft={draft}
        sending={sending}
        suggestions={suggestions}
        showInspiration={showInspiration}
        chatUnreadByJobId={chatUnreadByJobId}
        recommendCount={visibleRecommendations.length}
        bossBound={bossBound}
        bossNeedsLogin={bossNeedsLogin}
        bossName={bossName}
        bossSafety={bossSafety}
        crawling={crawling}
        syncing={syncing}
        logRefreshKey={logRefreshKey}
        applying={applying}
        approving={approving}
        batchGreeting={batchGreeting}
        selectedMatchIds={selectedMatchIds}
        onToggleMatch={handleToggleMatch}
        onBatchGreet={handleBatchGreet}
        applyLabel={applyLabel}
        onChatNotFound={() =>
          showToast('该职位暂无 Boss 对话，请先发送招呼或点「消息托管」同步', 'error')
        }
        onSelectApplication={handleSelectApplication}
        onSelectJob={handleSelectJob}
        onSelectChat={handleSelectChat}
        onInterview={handleInterview}
        onApply={tab !== 'applications' && canGreet ? handleApply : undefined}
        onApprove={
          tab !== 'applications' && selectedMatch?.status === 'pending_review' && !isApplied
            ? handleApproveMatch
            : undefined
        }
        onDraftChange={setDraft}
        onSend={() => handleSend()}
        onAdoptSuggestion={handleAdoptSuggestion}
        onCrawl={() => {
          if (!user) {
            navigate('/login')
            return
          }
          setManualCrawlOpen(true)
        }}
        onSync={handleSyncBoss}
        onSettings={() => setSettingsOpen(true)}
        onBossLogin={() => setBindModalOpen(true)}
      />

      <BossBindModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        onComplete={(name) => {
          showToast(`Boss 登录成功${name ? `：${name}` : ''}`, 'success')
          setBindModalOpen(false)
          setBossBound(true)
          setNeedRebind(false)
          if (name) setBossName(name)
          void loadBossSession()
          void loadBossChats()
        }}
      />

      <ManualCrawlModal
        open={manualCrawlOpen}
        onClose={() => setManualCrawlOpen(false)}
        onRunningChange={setCrawling}
        onPurged={() => {
          void loadApplications()
          void loadMatches()
          void loadRecommendations()
          void loadBossChats()
          setSelectedApplication(undefined)
          setSelectedMatch(undefined)
          setSelectedJob(null)
        }}
        onDone={(res) => {
          setManualCrawlOpen(false)
          void handleManualCrawlDone(res)
        }}
      />

      <JobPreferencesModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          void loadRecommendations()
          void loadMatches()
        }}
      />
    </>
  )
}

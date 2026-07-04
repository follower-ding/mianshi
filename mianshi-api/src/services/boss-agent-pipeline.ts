import { analyzeHrMessage, detectInterviewKeyword } from './boss-auto-reply.js'
import { appendAgentLog } from './agent-log-store.js'
import { saveBossChatMessage } from './boss-chat-store.js'
import {
  fetchBossChatList,
  fetchBossChatMessages,
  sendBossChatReply,
  type BossChatItem,
} from './boss-client.js'
import { getBossSession } from './boss-session-store.js'
import { createJobNotification } from './job-notifications-store.js'
import { getJobPreference } from './job-preferences-store.js'
import {
  createJobApplication,
  findApplicationByUserAndJob,
  findBossJobByExternalId,
  getJobPosting,
  listJobApplications,
  updateJobApplication,
} from './jobs-store.js'
import type { CrawlTrigger } from '../types/entities.js'
import { applyViaBossSession } from './boss-sync.js'
import { generateJobGreeting } from './job-greeting.js'
import { getUserById } from './store.js'
import { listJobMatches, updateJobMatchStatus } from './job-matches-store.js'
import { listTodayRecommendMatches } from './job-crawl-pipeline.js'
import { isPgEnabled } from '../db/client.js'
import {
  assertBossOperationAllowed,
  greetThrottle,
  isAntiBotError,
  tripCircuitBreaker,
  DEFAULT_BOSS_SAFETY,
} from './boss-safety.js'

type GreetOutcome = { ok: boolean; message: string; skipped?: string }

async function greetJobMatch(
  userId: string,
  match: Awaited<ReturnType<typeof listJobMatches>>[number],
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>,
  pref: Awaited<ReturnType<typeof getJobPreference>>,
): Promise<GreetOutcome> {
  if (!match.job && match.jobId) {
    match.job = (await getJobPosting(match.jobId)) ?? undefined
  }
  if (!match.job) return { ok: false, message: '岗位不存在', skipped: 'no_job' }
  if (match.job.externalId?.startsWith('demo-')) {
    return { ok: false, message: '无效岗位', skipped: 'invalid' }
  }

  const existing = await findApplicationByUserAndJob(userId, match.jobId)
  if (existing?.bossApplyStatus === 'sent') {
    return { ok: false, message: '已打招呼', skipped: 'already_sent' }
  }

  const greeting =
    match.suggestedGreeting ||
    (await generateJobGreeting(match.job, user, pref.resumeSummary))

  let app = existing
  if (!app) {
    app = await createJobApplication({
      userId,
      jobId: match.jobId,
      greeting,
      resumeSummary: pref.resumeSummary,
    })
  } else {
    await updateJobApplication(app.id, { greeting, bossApplyStatus: 'pending', bossApplyError: '' })
  }

  const result = await applyViaBossSession(userId, match.jobId, greeting, app.id)
  if (result.ok) {
    await updateJobMatchStatus(match.id, userId, 'applied')
    if (match.job.externalId) {
      await saveBossChatMessage({
        userId,
        bossJobId: match.job.externalId,
        company: match.job.company,
        jobTitle: match.job.title,
        role: 'user',
        content: greeting,
      })
    }
    return { ok: true, message: result.message }
  }

  if (isAntiBotError(result.message)) {
    tripCircuitBreaker(userId, result.message)
  }

  await updateJobMatchStatus(match.id, userId, 'pending_review')
  return { ok: false, message: result.message }
}

async function resolveLatestHrMessage(
  cookieHeader: string,
  chat: BossChatItem,
): Promise<{ content: string; history: Awaited<ReturnType<typeof fetchBossChatMessages>> } | null> {
  if (!chat.jobId) return null
  const history = await fetchBossChatMessages(cookieHeader, chat.jobId)
  const lastHr = [...history].reverse().find((m) => m.role === 'hr')
  if (lastHr?.content) return { content: lastHr.content, history }
  if (chat.lastMessage && chat.unread && chat.unread > 0) {
    return { content: chat.lastMessage, history }
  }
  return null
}

function buildResumeReply(analysis: Awaited<ReturnType<typeof analyzeHrMessage>>, resumeSummary?: string) {
  let reply = analysis.suggestedReply
  if (analysis.intent === 'request_resume' && resumeSummary?.trim()) {
    reply = `${reply}\n\n【简历摘要】\n${resumeSummary.trim().slice(0, 800)}`
  }
  return reply.slice(0, 500)
}

export async function autoApplyPendingMatches(userId: string) {
  if (!isPgEnabled()) return { applied: 0 }

  const guard = assertBossOperationAllowed(userId)
  if (!guard.ok) return { applied: 0, skipped: guard.message }

  const pref = await getJobPreference(userId)
  if (pref.autoApplyMode === 'off') return { applied: 0, skipped: 'auto off' }

  const session = await getBossSession(userId)
  if (!session || session.status !== 'active') return { applied: 0, skipped: 'no boss session' }

  const user = await getUserById(userId)
  if (!user) return { applied: 0 }

  // 与「今日推荐」完全同一批岗位
  let matches = await listTodayRecommendMatches(userId)
  if (pref.autoApplyMode === 'review') {
    matches = matches.filter((m) => m.status === 'queued')
  }

  const todayApps = (await listJobApplications(userId)).filter((a) => {
    const d = new Date(a.appliedAt)
    return d.toDateString() === new Date().toDateString() && a.bossApplyStatus === 'sent'
  })
  const greetedToday = new Set(todayApps.map((a) => a.jobId))

  // 全覆盖今日推荐：按推荐条数上限，同时不超过 Boss 每日打招呼总上限
  const recommendCap = pref.dailyRecommendLimit ?? 10
  const dailyCap = Math.max(pref.dailyApplyLimit, recommendCap)
  const remaining = dailyCap - todayApps.length
  if (remaining <= 0) return { applied: 0, skipped: 'daily limit', total: matches.length }

  let applied = 0
  let skippedAlready = 0
  let burstIndex = 0

  for (const match of matches) {
    if (applied >= remaining) break
    if (greetedToday.has(match.jobId)) {
      skippedAlready++
      continue
    }

    await greetThrottle(burstIndex++)
    const outcome = await greetJobMatch(userId, match, user, pref)
    if (outcome.skipped === 'already_sent') {
      skippedAlready++
      continue
    }
    if (outcome.skipped) continue

    if (outcome.ok) {
      applied++
      greetedToday.add(match.jobId)
      if (match.job) {
        await appendAgentLog({
          userId,
          actionType: 'auto_apply',
          title: `AI 主动打招呼 · ${match.job.company}`,
          body: `${match.job.title}：${outcome.message}`,
          jobId: match.jobId,
          meta: { tier: match.tier },
        })
      }
    } else if (match.job) {
      await appendAgentLog({
        userId,
        actionType: 'apply_failed',
        title: `打招呼失败 · ${match.job.company}`,
        body: outcome.message,
        jobId: match.jobId,
      })
      if (isAntiBotError(outcome.message)) break
    }
  }

  return {
    applied,
    total: matches.length,
    skippedAlready,
    mode: pref.autoApplyMode,
    message:
      applied > 0
        ? `已对今日推荐 ${applied}/${matches.length} 个岗位打招呼`
        : matches.length > 0
          ? '今日推荐岗位均已打招呼或已达上限'
          : '暂无待打招呼的今日推荐',
  }
}

/** 从 Boss 全量会话同步：新招呼 + 仅沟通，AI 自动回复（含 HR 索要简历） */
export async function processBossInbox(userId: string) {
  if (!isPgEnabled()) return { replies: 0, interviews: 0, syncedChats: 0 }

  const session = await getBossSession(userId)
  if (!session) return { replies: 0, interviews: 0, syncedChats: 0, message: '未绑定 Boss' }

  const pref = await getJobPreference(userId)
  const chats = (await fetchBossChatList(session.cookieHeader)).items

  let replies = 0
  let interviews = 0
  let syncedChats = 0

  for (const chat of chats) {
    if (!chat.jobId) continue

    const resolved = await resolveLatestHrMessage(session.cookieHeader, chat)
    if (!resolved) continue

    const { content: msg } = resolved
    const bossJob = await findBossJobByExternalId(chat.jobId)
    let app = bossJob ? await findApplicationByUserAndJob(userId, bossJob.id) : null

    const syncKey = msg.slice(0, 200)
    if (app?.bossReplySnippet === syncKey) continue

    syncedChats++

    const jobTitle = bossJob?.title ?? chat.title ?? '岗位'
    const company = bossJob?.company ?? chat.company ?? '公司'
    const jd = bossJob?.jd ?? ''

    const analysis = await analyzeHrMessage(msg, {
      jobTitle,
      company,
      jd,
      resumeSummary: pref.resumeSummary,
    })

    let status = app?.status ?? 'applied'
    if (analysis.intent === 'interview' || detectInterviewKeyword(msg)) {
      status = 'interview_invited'
      interviews++
      if (app) {
        await createJobNotification({
          userId,
          applicationId: app.id,
          jobId: app.jobId,
          type: 'interview_invited',
          title: `🎯 面试邀请 · ${company}`,
          body: `${jobTitle}：${analysis.summary}`,
        })
      }
    } else if (analysis.intent !== 'reject') {
      await saveBossChatMessage({
        userId,
        bossJobId: chat.jobId,
        company,
        jobTitle,
        role: 'hr',
        content: msg,
        intent: analysis.intent,
      })
    }

    const shouldAutoReply =
      pref.autoApplyMode !== 'off' &&
      analysis.shouldReply &&
      !analysis.needsHumanReview &&
      (chat.category === 'new_greeting' ||
        chat.category === 'communicating' ||
        (chat.unread ?? 0) > 0)

    let autoReplySent = false
    if (shouldAutoReply) {
      const replyText = buildResumeReply(analysis, pref.resumeSummary)
      const sent = await sendBossChatReply(session.cookieHeader, chat.jobId, replyText)
      if (sent.ok) {
        replies++
        autoReplySent = true
        await saveBossChatMessage({
          userId,
          bossJobId: chat.jobId,
          company,
          jobTitle,
          role: 'ai',
          content: replyText,
          intent: analysis.intent,
          aiSuggested: true,
        })
        await appendAgentLog({
          userId,
          actionType: 'ai_reply',
          title:
            analysis.intent === 'request_resume'
              ? `AI 回复并发送简历摘要 · ${company}`
              : `AI 自动回复 · ${company}`,
          body: replyText.slice(0, 200),
          jobId: bossJob?.id,
          applicationId: app?.id,
          meta: { category: chat.category, intent: analysis.intent },
        })
      }
    }

    if (app) {
      await updateJobApplication(app.id, {
        bossReplySnippet: syncKey,
        bossSyncedAt: new Date().toISOString(),
        status,
        bossApplyStatus: app.bossApplyStatus === 'failed' ? app.bossApplyStatus : 'sent',
        ...(autoReplySent
          ? { greeting: `${app.greeting}\n---\nAI回复: ${buildResumeReply(analysis, pref.resumeSummary)}` }
          : {}),
      })
    }
  }

  return {
    replies,
    interviews,
    syncedChats,
    message:
      replies || interviews || syncedChats
        ? `同步 ${syncedChats} 个会话，AI 回复 ${replies} 条，面试邀请 ${interviews} 个`
        : '暂无新消息',
  }
}

export async function batchGreetMatches(userId: string, matchIds: string[]) {
  if (!isPgEnabled() || matchIds.length === 0) {
    return { applied: 0, total: 0, failed: 0, failures: [] as string[] }
  }

  const guard = assertBossOperationAllowed(userId, { allowOffHours: true })
  if (!guard.ok) {
    return { applied: 0, skipped: guard.message, total: matchIds.length, failed: 0, failures: [] }
  }

  const pref = await getJobPreference(userId)
  if (pref.autoApplyMode === 'off') {
    return { applied: 0, skipped: 'auto off', total: matchIds.length, failed: 0, failures: [] }
  }

  const session = await getBossSession(userId)
  if (!session || session.status !== 'active') {
    return { applied: 0, skipped: 'no boss session', total: matchIds.length, failed: 0, failures: [] }
  }

  const user = await getUserById(userId)
  if (!user) return { applied: 0, total: matchIds.length, failed: 0, failures: [] }

  const all = await listJobMatches(userId)
  const idSet = new Set(matchIds)
  const matches = all.filter((m) => idSet.has(m.id))

  const todaySent = (await listJobApplications(userId)).filter((a) => {
    return (
      new Date(a.appliedAt).toDateString() === new Date().toDateString() &&
      a.bossApplyStatus === 'sent'
    )
  })
  const dailyCap = Math.max(pref.dailyApplyLimit, pref.dailyRecommendLimit) - todaySent.length
  if (dailyCap <= 0) {
    return { applied: 0, skipped: 'daily limit', total: matches.length, failed: 0, failures: [] }
  }

  let applied = 0
  let failed = 0
  const failures: string[] = []
  const maxBatch = Math.min(matches.length, dailyCap, 15)
  let burstIndex = 0

  for (const match of matches.slice(0, maxBatch)) {
    await greetThrottle(burstIndex++)
    const outcome = await greetJobMatch(userId, match, user, pref)
    if (outcome.skipped === 'already_sent' || outcome.skipped === 'invalid') continue
    if (outcome.ok) {
      applied++
    } else {
      failed++
      failures.push(`${match.job?.company ?? '未知'}：${outcome.message}`)
      if (isAntiBotError(outcome.message)) break
    }
  }

  const throttled = matches.length > maxBatch
  return {
    applied,
    failed,
    total: matches.length,
    failures,
    message:
      applied > 0
        ? `已批量打招呼 ${applied}/${matches.length} 个${failed ? `，失败 ${failed} 个` : ''}${throttled ? '（单次最多 15 个，请分批操作）' : ''}`
        : failed > 0
          ? `打招呼失败 ${failed} 个：${failures[0] ?? ''}`
          : throttled
            ? '单次最多打招呼 15 个，请减少勾选数量后重试'
            : `已批量打招呼 0/${matches.length} 个`,
  }
}

export async function runBossAgentForUser(
  userId: string,
  opts?: {
    trigger?: CrawlTrigger
    manualFilters?: { positions?: string[]; cities?: string[]; salaryMin?: number; salaryMax?: number }
    batchGreetMatchIds?: string[]
    skipAutoApply?: boolean
  },
) {
  const { runBossCrawlPipeline } = await import('./job-crawl-pipeline.js')
  const crawl = await runBossCrawlPipeline(userId, {
    trigger: opts?.trigger ?? 'manual',
    manualFilters: opts?.manualFilters,
  })
  const apply = opts?.skipAutoApply
    ? { applied: 0, skipped: 'disabled' }
    : opts?.batchGreetMatchIds?.length
      ? await batchGreetMatches(userId, opts.batchGreetMatchIds)
      : await autoApplyPendingMatches(userId)
  const inbox = await processBossInbox(userId)
  return { crawl, apply, inbox }
}

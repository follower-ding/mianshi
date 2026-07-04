import { Hono } from 'hono'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import { bossConnectRoutes } from './boss-connect.js'
import { bossSessionSchema } from '../schemas/index.js'
import {
  deleteBossSession,
  getBossSession,
  saveBossSession,
  updateBossSessionStatus,
} from '../services/boss-session-store.js'
import { fetchBossChatList, fetchBossChatMessages, sendBossChatReply, testBossSession, type BossChatItem } from '../services/boss-client.js'
import { analyzeHrMessage } from '../services/boss-auto-reply.js'
import { listBossChatMessages, listBossChatThreads, saveBossChatMessage } from '../services/boss-chat-store.js'
import { getJobPosting, findBossJobByExternalId, findApplicationByUserAndJob } from '../services/jobs-store.js'
import { getJobPreference } from '../services/job-preferences-store.js'
import { getCircuitBreaker } from '../services/boss-safety.js'
import { isRealBossCookie } from '../services/boss-client.js'
import { isPgEnabled } from '../db/client.js'

export const bossRoutes = new Hono<{ Variables: AuthVariables }>()

bossRoutes.route('/connect', bossConnectRoutes)

bossRoutes.use('*', authMiddleware)

bossRoutes.get('/session', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) {
    return c.json({ bound: false, crawlEnabled: false })
  }
  const session = await getBossSession(user.id)
  const realBound = Boolean(
    session?.cookieHeader && session.status === 'active' && isRealBossCookie(session.cookieHeader),
  )
  const needRebind = session?.status === 'need_rebind' || !realBound
  const safety = getCircuitBreaker(user.id)
  return c.json({
    bound: realBound,
    bossName: session?.bossName,
    status: session?.status ?? 'invalid',
    needRebind,
    rebindReason: session?.rebindReason ?? (realBound ? undefined : '请绑定 Boss 账号'),
    profileDir: session?.profileDir,
    lastKeepaliveAt: session?.lastKeepaliveAt,
    lastValidatedAt: session?.lastValidatedAt,
    crawlEnabled: true,
    safety: safety.paused
      ? { paused: true, reason: safety.reason, until: safety.until?.toISOString() }
      : { paused: false },
  })
})

bossRoutes.post('/session', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) return c.json({ error: '需 PostgreSQL 模式' }, 503)

  const body = bossSessionSchema.parse(await c.req.json())
  const check = await testBossSession(body.cookie)
  if (!check.valid) return c.json({ error: check.message ?? 'Cookie 无效' }, 400)

  const session = await saveBossSession(user.id, body.cookie, {
    bossUid: check.uid,
    bossName: check.name,
    status: 'active',
  })

  return c.json({
    ok: true,
    bossName: session.bossName,
    status: session.status,
    message: '绑定成功',
  })
})

bossRoutes.delete('/session', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  await deleteBossSession(user.id)
  return c.json({ ok: true })
})

bossRoutes.post('/session/test', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const session = await getBossSession(user.id)
  if (!session) return c.json({ valid: false, message: '未绑定 Boss' })

  const check = await testBossSession(session.cookieHeader)
  await updateBossSessionStatus(user.id, check.valid ? 'active' : 'invalid', {
    bossUid: check.uid,
    bossName: check.name,
  })
  return c.json(check)
})

bossRoutes.get('/chats', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const session = await getBossSession(user.id)
  if (!session?.cookieHeader) return c.json({ items: [], error: '未绑定 Boss' })

  const { syncUserBossApplications } = await import('../services/boss-sync.js')
  await syncUserBossApplications(user.id)

  const remote = await fetchBossChatList(session.cookieHeader)
  const localThreads = await listBossChatThreads(user.id)

  const merged = new Map<string, BossChatItem>()
  for (const item of remote.items) {
    if (item.jobId) merged.set(item.jobId, item)
  }
  for (const t of localThreads) {
    if (!merged.has(t.bossJobId)) {
      merged.set(t.bossJobId, {
        jobId: t.bossJobId,
        company: t.company,
        title: t.jobTitle,
        lastMessage: t.lastMessage,
        unread: 0,
        updatedAt: t.updatedAt,
        category: 'communicating',
      })
    }
  }

  return c.json({
    items: [...merged.values()],
    error:
      remote.error ??
      (merged.size === 0 ? '暂无会话：请先对真实 Boss 岗位打招呼成功' : undefined),
    localOnly: remote.items.length === 0 && localThreads.length > 0,
  })
})

bossRoutes.get('/chats/:jobId/messages', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const session = await getBossSession(user.id)
  if (!session) return c.json({ items: [] })
  const jobId = c.req.param('jobId')
  const live = await fetchBossChatMessages(session.cookieHeader, jobId)
  const stored = await listBossChatMessages(user.id, jobId)
  const merged = [...live]
  for (const s of stored) {
    if (!merged.some((m) => m.content === s.content && m.role === s.role)) {
      merged.push({
        id: s.id,
        role: s.role,
        content: s.content,
        sentAt: s.sentAt,
        intent: s.intent,
        aiSuggested: s.aiSuggested,
      })
    }
  }

  const bossJob = await findBossJobByExternalId(jobId)
  if (bossJob) {
    const app = await findApplicationByUserAndJob(user.id, bossJob.id)
    if (app?.greeting?.trim()) {
      const greetingOnly = app.greeting.split('\n---\n')[0]?.trim()
      if (greetingOnly && !merged.some((m) => m.role === 'user' && m.content.includes(greetingOnly.slice(0, 40)))) {
        merged.unshift({
          id: `greeting-${app.id}`,
          role: 'user',
          content: greetingOnly,
          sentAt: app.appliedAt,
        })
      }
    }
  }

  merged.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
  return c.json({ items: merged })
})

bossRoutes.post('/chats/:jobId/suggest-reply', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const body = (await c.req.json()) as { jobId?: string; hrMessage: string; postingJobId?: string }
  const pref = await getJobPreference(user.id)
  let jobTitle = '岗位'
  let company = '公司'
  let jd = ''
  if (body.postingJobId) {
    const job = await getJobPosting(body.postingJobId)
    if (job) {
      jobTitle = job.title
      company = job.company
      jd = job.jd
    }
  }
  const analysis = await analyzeHrMessage(body.hrMessage, {
    jobTitle,
    company,
    jd,
    resumeSummary: pref.resumeSummary,
  })
  return c.json({ analysis })
})

bossRoutes.post('/chats/:jobId/reply', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const session = await getBossSession(user.id)
  if (!session) return c.json({ error: '未绑定 Boss' }, 400)
  const jobId = c.req.param('jobId')
  const body = (await c.req.json()) as { message: string; company?: string; jobTitle?: string }
  if (!body.message?.trim()) return c.json({ error: '消息不能为空' }, 400)
  const result = await sendBossChatReply(session.cookieHeader, jobId, body.message)
  if (!result.ok) return c.json(result, 400)
  await saveBossChatMessage({
    userId: user.id,
    bossJobId: jobId,
    company: body.company ?? '',
    jobTitle: body.jobTitle ?? '',
    role: 'user',
    content: body.message,
  })
  return c.json(result)
})

bossRoutes.post('/sync', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const { processBossInbox } = await import('../services/boss-agent-pipeline.js')
  const inbox = await processBossInbox(user.id)
  return c.json(inbox)
})

bossRoutes.get('/notifications', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const { listJobNotifications } = await import('../services/job-notifications-store.js')
  const unreadOnly = c.req.query('unread') === '1'
  return c.json({ items: await listJobNotifications(user.id, unreadOnly) })
})

bossRoutes.post('/notifications/read', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const body = (await c.req.json().catch(() => ({}))) as { ids?: string[] }
  const { markNotificationsRead } = await import('../services/job-notifications-store.js')
  await markNotificationsRead(user.id, body.ids)
  return c.json({ ok: true })
})

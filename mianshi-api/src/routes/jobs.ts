import { Hono } from 'hono'

import { authMiddleware, optionalUser, requireAdmin, requireAuth, type AuthVariables } from '../middleware/auth.js'

import { jobPostingSchema, jobPreferenceSchema } from '../schemas/index.js'

import { getTodayRecommendations, persistCrawledJobs, runBossCrawlPipeline } from '../services/job-crawl-pipeline.js'

import {
  getJobMatch,
  listCrawlRuns,
  listJobMatches,
  updateJobMatchStatus,
  countManualCrawlsToday,
  purgeDemoMatchesForUser,
} from '../services/job-matches-store.js'

import { listAgentLogs } from '../services/agent-log-store.js'

import { getJobPreference, upsertJobPreference } from '../services/job-preferences-store.js'
import { filterOutDemoJobs } from '../services/job-demo.js'
import { getBossSession } from '../services/boss-session-store.js'

import { createJobPosting, getJobPosting, listJobPostings } from '../services/jobs-store.js'

import { isPgEnabled } from '../db/client.js'

import { analyzeJobForUser } from '../services/job-analysis.js'



export const jobRoutes = new Hono<{ Variables: AuthVariables }>()



jobRoutes.use('*', authMiddleware)



jobRoutes.get('/preferences', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const pref = await getJobPreference(user.id)

  const manualCrawlsToday = await countManualCrawlsToday(user.id)

  return c.json({ preference: pref, crawlEnabled: isPgEnabled(), manualCrawlsToday })

})



jobRoutes.put('/preferences', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const body = jobPreferenceSchema.parse(await c.req.json())

  const pref = await upsertJobPreference(user.id, body)

  return c.json(pref)

})



jobRoutes.get('/recommendations', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  if (!isPgEnabled()) {

    return c.json({ items: [], preference: await getJobPreference(user.id), crawlEnabled: false })

  }

  return c.json(await getTodayRecommendations(user.id))

})



jobRoutes.post('/crawl', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const body = (await c.req.json().catch(() => ({}))) as {
    positions?: string[]
    cities?: string[]
    salaryMin?: number
    salaryMax?: number
    batchGreet?: boolean
    batchGreetMatchIds?: string[]
  }

  if (body.positions?.length || body.cities?.length) {
    await upsertJobPreference(user.id, {
      manualCrawlPositions: body.positions ?? [],
      manualCrawlCities: body.cities ?? [],
      manualCrawlSalaryMin: body.salaryMin,
      manualCrawlSalaryMax: body.salaryMax,
    })
  }

  const { runBossAgentForUser } = await import('../services/boss-agent-pipeline.js')

  const result = await runBossAgentForUser(user.id, {
    trigger: 'manual',
    manualFilters: {
      positions: body.positions,
      cities: body.cities,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
    },
    batchGreetMatchIds: body.batchGreetMatchIds,
    skipAutoApply: body.batchGreet === false,
  })

  return c.json({ ...result.crawl, apply: result.apply, inbox: result.inbox })

})



jobRoutes.post('/matches/batch-greet', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  if (!isPgEnabled()) return c.json({ error: '需 PostgreSQL 模式' }, 400)

  const body = (await c.req.json().catch(() => ({}))) as { matchIds?: string[] }

  const { batchGreetMatches } = await import('../services/boss-agent-pipeline.js')

  const matchIds = body.matchIds ?? []

  if (matchIds.length === 0) {
    const { listJobMatches } = await import('../services/job-matches-store.js')
    const pending = await listJobMatches(user.id, {
      tier: ['S', 'A', 'B'],
      status: ['pending_review', 'queued'],
    })
    matchIds.push(...pending.filter((m) => !m.job?.externalId?.startsWith('demo-')).map((m) => m.id))
  }

  return c.json(await batchGreetMatches(user.id, matchIds))

})



jobRoutes.post('/purge-demo', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  if (!isPgEnabled()) return c.json({ error: '需 PostgreSQL 模式' }, 400)

  const result = await purgeDemoMatchesForUser(user.id)

  const parts = [
    result.matches ? `${result.matches} 条匹配` : '',
    result.applications ? `${result.applications} 条招呼` : '',
    result.chats ? `${result.chats} 条对话` : '',
  ].filter(Boolean)

  return c.json({
    ok: true,
    ...result,
    message: parts.length
      ? `已清除无效数据：${parts.join('、')}`
      : '暂无无效数据需要清除',
  })

})



jobRoutes.get('/crawl/runs', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  return c.json({ items: await listCrawlRuns(user.id, 10) })

})



jobRoutes.get('/agent-logs', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100)

  return c.json({ items: await listAgentLogs(user.id, limit) })

})



jobRoutes.get('/matches', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  if (!isPgEnabled()) return c.json({ items: [] })

  const tierParam = c.req.query('tier')

  const tier = tierParam ? tierParam.split(',').filter(Boolean) as ('S' | 'A' | 'B' | 'C')[] : undefined

  const city = c.req.query('city')

  const source = c.req.query('source')

  let items = await listJobMatches(user.id, { tier })

  if (city) items = items.filter((m) => m.job?.city?.includes(city))

  if (source) items = items.filter((m) => m.job?.source === source)

  const session = await getBossSession(user.id)
  if (session?.cookieHeader) {
    items = filterOutDemoJobs(items)
  }

  const salaryMin = Number(c.req.query('salaryMin') || 0)

  if (salaryMin > 0) {

    items = items.filter((m) => {

      const m2 = m.job?.salary?.match(/(\d+)/)

      return m2 ? Number(m2[1]) >= salaryMin : true

    })

  }

  return c.json({ items })

})



jobRoutes.post('/matches/:id/approve', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  if (!isPgEnabled()) return c.json({ error: '需 PostgreSQL 模式' }, 400)

  const match = await getJobMatch(c.req.param('id'), user.id)

  if (!match) return c.json({ error: 'Not found' }, 404)

  if (match.status === 'applied') return c.json({ error: '已投递' }, 400)

  if (match.status !== 'pending_review') return c.json({ error: '当前状态不可确认' }, 400)

  await updateJobMatchStatus(match.id, user.id, 'queued')

  return c.json({ ok: true, message: '已加入打招呼队列', match: { ...match, status: 'queued' } })

})



jobRoutes.post('/crawl/filtered', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const body = (await c.req.json().catch(() => ({}))) as {

    city?: string

    query?: string

    salaryMin?: number

    salaryMax?: number

    experience?: string

    education?: string

    scale?: string

  }

  const pref = await getJobPreference(user.id)

  const { crawlBossWithPlaywright, isPlaywrightCrawlAvailable } = await import('../services/boss-playwright-crawler.js')

  const { crawlBossWithSessionApi } = await import('../services/boss-api-crawler.js')

  const { getBossSession } = await import('../services/boss-session-store.js')

  const session = await getBossSession(user.id)

  const filters = {

    query: body.query ?? pref.targetPositions[0] ?? 'Java 后端',

    city: body.city ?? pref.targetCities[0] ?? '成都',

    salaryMin: body.salaryMin ?? pref.salaryMin,

    salaryMax: body.salaryMax ?? pref.salaryMax,

    experience: body.experience,

    education: body.education,

    scale: body.scale,

  }

  if (!session?.cookieHeader) {

    return c.json({ ok: false, message: '需先绑定 Boss 账号', filters }, 400)

  }

  let jobs: Awaited<ReturnType<typeof crawlBossWithPlaywright>> = []

  let mode: 'playwright' | 'boss_api' | 'fallback' = 'boss_api'

  const playwrightOk = await isPlaywrightCrawlAvailable()

  if (playwrightOk) {

    jobs = await crawlBossWithPlaywright(pref, { cookieHeader: session.cookieHeader, filters, fetchDetail: true })

    mode = 'playwright'

  }

  if (jobs.length === 0) {

    const apiPref = {

      ...pref,

      targetPositions: [filters.query],

      targetCities: [filters.city],

    }

    jobs = (await crawlBossWithSessionApi(apiPref, session.cookieHeader, { maxQueries: 1 })).jobs

    mode = 'boss_api'

  }

  if (jobs.length === 0) {

    const fallback = await runBossCrawlPipeline(user.id)

    return c.json({ mode: 'fallback', filters, ...fallback })

  }

  const persisted = await persistCrawledJobs(user.id, jobs)

  return c.json({ ok: true, mode, filters, ...persisted })

})



jobRoutes.get('/', async (c) => {

  const user = optionalUser(c)

  const includeAll = user?.role === 'admin'

  const source = c.req.query('source')

  let items = await listJobPostings({ includeAll })

  if (source === 'boss') items = items.filter((j) => j.source === 'boss')

  return c.json({ items })

})



jobRoutes.get('/:id/analysis', async (c) => {

  const user = requireAuth(c)

  if (user instanceof Response) return user

  const item = await getJobPosting(c.req.param('id'))

  if (!item) return c.json({ error: 'Not found' }, 404)

  return c.json({ analysis: await analyzeJobForUser(user.id, item), job: item })

})



jobRoutes.get('/:id', async (c) => {

  const item = await getJobPosting(c.req.param('id'))

  if (!item) return c.json({ error: 'Not found' }, 404)

  const user = optionalUser(c)

  if (item.status !== 'published' && user?.role !== 'admin') {

    return c.json({ error: 'Not found' }, 404)

  }

  return c.json(item)

})



jobRoutes.post('/', async (c) => {

  const admin = requireAdmin(c)

  if (admin instanceof Response) return admin

  const body = jobPostingSchema.parse(await c.req.json())

  const item = await createJobPosting({ ...body, status: body.status ?? 'published' })

  return c.json(item, 201)

})



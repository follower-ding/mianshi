import { buildBossJobUrl } from './boss-cities.js'
import { crawlBossForPreference, type BossCrawlItem } from './boss-crawler.js'
import { crawlBossWithSessionApi } from './boss-api-crawler.js'
import { crawlBossWithPlaywright, isPlaywrightCrawlAvailable } from './boss-playwright-crawler.js'
import { appendAgentLog } from './agent-log-store.js'
import { getBossSession } from './boss-session-store.js'
import { isRealBossCookie } from './boss-client.js'
import { generateJobGreeting } from './job-greeting.js'
import { scoreJobForUser } from './job-matcher.js'
import {
  countManualCrawlsToday,
  createCrawlRun,
  finishCrawlRun,
  listCrawlRuns,
  listJobMatches,
  upsertJobMatch,
} from './job-matches-store.js'
import {
  getJobPreference,
  listUsersDueForCrawl,
  touchLastCrawl,
} from './job-preferences-store.js'
import { upsertBossJob } from './jobs-store.js'
import { getUserById } from './store.js'
import { isFirecrawlConfigured } from './firecrawl-client.js'
import { isPgEnabled } from '../db/client.js'
import { filterOutDemoJobs } from './job-demo.js'
import { assertBossOperationAllowed, SAFE_DAILY_LIMITS } from './boss-safety.js'
import type { CrawlTrigger, JobPreference } from '../types/entities.js'

export type ManualCrawlFilters = {
  positions?: string[]
  cities?: string[]
  salaryMin?: number
  salaryMax?: number
}

function prefForCrawl(
  pref: JobPreference,
  trigger: CrawlTrigger,
  manualFilters?: ManualCrawlFilters,
): JobPreference {
  if (trigger !== 'manual') return pref

  const positions =
    manualFilters?.positions?.filter(Boolean) ??
    (pref.manualCrawlPositions.length ? pref.manualCrawlPositions : pref.targetPositions)
  const cities =
    manualFilters?.cities?.filter(Boolean) ??
    (pref.manualCrawlCities.length ? pref.manualCrawlCities : pref.targetCities)

  return {
    ...pref,
    targetPositions: positions.length ? positions : pref.targetPositions,
    targetCities: cities.length ? cities : pref.targetCities,
    salaryMin: manualFilters?.salaryMin ?? pref.manualCrawlSalaryMin ?? pref.salaryMin,
    salaryMax: manualFilters?.salaryMax ?? pref.manualCrawlSalaryMax ?? pref.salaryMax,
  }
}

export async function persistCrawledJobs(userId: string, crawled: BossCrawlItem[]) {
  const pref = await getJobPreference(userId)
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found')

  let jobsNew = 0
  let matchesUpdated = 0

  for (const item of crawled) {
    const externalUrl = buildBossJobUrl(item.externalId)

    const { job, isNew } = await upsertBossJob({
      externalId: item.externalId,
      externalUrl,
      company: item.company,
      title: item.title,
      position: item.title,
      city: item.city,
      salary: item.salary,
      experience: item.experience,
      education: item.education,
      jd: item.jd,
      tags: item.tags?.length ? item.tags : [item.title.split(/[\s/]/)[0]].filter(Boolean),
      bossMeta: item.bossMeta,
    })
    if (isNew) jobsNew++

    const match = scoreJobForUser(job, pref)
    if (match.skip) continue

    let greeting: string | undefined
    if (match.tier === 'S' || match.tier === 'A') {
      greeting = await generateJobGreeting(job, user, pref.resumeSummary)
    }

    await upsertJobMatch({
      userId,
      jobId: job.id,
      score: match.score,
      tier: match.tier,
      reasons: match.reasons,
      suggestedGreeting: greeting,
    })
    matchesUpdated++
  }

  return { jobsFound: crawled.length, jobsNew, matchesUpdated }
}

async function collectJobsForUser(
  userId: string,
  pref: JobPreference,
  maxJobs: number,
  trigger: CrawlTrigger,
  manualFilters?: ManualCrawlFilters,
): Promise<{
  items: BossCrawlItem[]
  source: 'boss_api' | 'playwright' | 'firecrawl'
  message?: string
}> {
  const crawlPref = prefForCrawl(pref, trigger, manualFilters)
  const maxQueries = Math.max(1, Math.min(8, Math.ceil(maxJobs / 15)))
  const maxPerQuery = Math.min(30, maxJobs)
  const session = await getBossSession(userId)
  const hasSession = Boolean(session?.cookieHeader)
  const realBoss = hasSession && session!.status === 'active' && isRealBossCookie(session!.cookieHeader)

  if (hasSession && !realBoss) {
    return {
      items: [],
      source: 'boss_api',
      message: 'Boss 登录无效，请用 Drission 扫码重新绑定',
    }
  }

  if (realBoss) {
    const { jobs: apiJobs, lastError } = await crawlBossWithSessionApi(crawlPref, session!.cookieHeader, {
      maxJobsPerQuery: maxPerQuery,
      maxQueries,
      userId,
    })
    if (apiJobs.length > 0) {
      return { items: apiJobs.slice(0, maxJobs), source: 'boss_api' }
    }

    if (await isPlaywrightCrawlAvailable()) {
      const pwJobs = await crawlBossWithPlaywright(crawlPref, {
        cookieHeader: session!.cookieHeader,
        fetchDetail: true,
        maxJobs: Math.min(maxJobs, 25),
      })
      if (pwJobs.length > 0) {
        return { items: pwJobs.slice(0, maxJobs), source: 'playwright' }
      }
    }

    const { crawlBossViaWorker, isWorkerEnabled } = await import('./worker-client.js')
    if (isWorkerEnabled() && session?.profileDir) {
      try {
        const workerJobs = await crawlBossViaWorker(userId, crawlPref, maxJobs)
        if (workerJobs.length > 0) {
          return { items: workerJobs.slice(0, maxJobs), source: 'playwright' }
        }
      } catch (e) {
        console.warn('[BossCrawl] worker browser crawl failed:', e)
      }
    }

    return {
      items: [],
      source: 'boss_api',
      message:
        lastError ??
        'Boss 抓取无结果，请调整抓取条件或检查登录态（建议重新绑定 Boss）',
    }
  }

  if (isFirecrawlConfigured()) {
    const fallback = await crawlBossForPreference(crawlPref)
    if (fallback.length > 0) {
      return { items: fallback.slice(0, maxJobs), source: 'firecrawl' }
    }
  }

  if (trigger === 'scheduled') {
    return { items: [], source: 'boss_api', message: '未绑定 Boss，跳过定时抓取' }
  }

  if (hasSession) {
    return {
      items: [],
      source: 'boss_api',
      message: 'Boss 登录已失效，请重新绑定后再抓取',
    }
  }

  return {
    items: [],
    source: 'boss_api',
    message: '请先绑定 Boss 账号后再抓取岗位',
  }
}

const TRIGGER_LABEL: Record<CrawlTrigger, string> = {
  manual: '手动',
  scheduled: '定时',
  agent: 'Agent',
}

export async function runBossCrawlPipeline(
  userId: string,
  opts?: { trigger?: CrawlTrigger; manualFilters?: ManualCrawlFilters },
) {
  if (!isPgEnabled()) {
    return {
      ok: false,
      message: 'Boss 爬取需 PostgreSQL 模式',
      jobsFound: 0,
      jobsNew: 0,
      matchesUpdated: 0,
      firecrawlConfigured: isFirecrawlConfigured(),
    }
  }

  const trigger = opts?.trigger ?? 'manual'
  const pref = await getJobPreference(userId)

  if (trigger === 'scheduled') {
    const guard = assertBossOperationAllowed(userId)
    if (!guard.ok) {
      return {
        ok: false,
        message: guard.message ?? '定时抓取已暂停',
        jobsFound: 0,
        jobsNew: 0,
        matchesUpdated: 0,
        trigger,
        skipped: true,
      }
    }
  }

  const rawMax =
    trigger === 'manual' ? pref.maxJobsManualCrawl : pref.maxJobsAutoCrawl
  const maxJobs = Math.min(
    rawMax,
    trigger === 'manual' ? SAFE_DAILY_LIMITS.maxJobsManualCrawl : SAFE_DAILY_LIMITS.maxJobsAutoCrawl,
  )

  const run = await createCrawlRun({
    userId,
    source: 'boss',
    trigger,
    query: pref.targetPositions.join(', ') || 'Java 后端',
    jobsFound: 0,
    jobsNew: 0,
    status: 'running',
  })

  try {
    await appendAgentLog({
      userId,
      actionType: 'crawl_start',
      title: `${TRIGGER_LABEL[trigger]}抓取 Boss 岗位`,
      body: `${pref.targetCities.join('、') || '全国'} · ${pref.targetPositions.join('、') || 'Java 后端'} · 上限 ${maxJobs} 个`,
      meta: { trigger, maxJobs },
    })

    const { items: crawled, source, message: crawlMsg } = await collectJobsForUser(
      userId,
      pref,
      maxJobs,
      trigger,
      opts?.manualFilters,
    )

    if (crawled.length === 0) {
      await finishCrawlRun(run.id, { jobsFound: 0, jobsNew: 0, status: 'failed', error: crawlMsg })
      return {
        ok: false,
        message: crawlMsg ?? '未抓取到岗位',
        jobsFound: 0,
        jobsNew: 0,
        matchesUpdated: 0,
        source,
        trigger,
        firecrawlConfigured: isFirecrawlConfigured(),
      }
    }

    const { jobsFound, jobsNew, matchesUpdated } = await persistCrawledJobs(userId, crawled)

    await touchLastCrawl(userId)
    await finishCrawlRun(run.id, { jobsFound, jobsNew, status: 'success' })

    await appendAgentLog({
      userId,
      actionType: 'crawl_done',
      title: `${TRIGGER_LABEL[trigger]}抓取完成 · 新增 ${jobsNew} / 共 ${jobsFound} 个岗位`,
      body: `来源 ${source} · AI 匹配 ${matchesUpdated} 条 · 上限 ${maxJobs}`,
      meta: { jobsFound, jobsNew, matchesUpdated, source, trigger, maxJobs },
    })

    return {
      ok: true,
      jobsFound,
      jobsNew,
      matchesUpdated,
      source,
      trigger,
      maxJobs,
      firecrawlConfigured: isFirecrawlConfigured(),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'crawl failed'
    await finishCrawlRun(run.id, { jobsFound: 0, jobsNew: 0, status: 'failed', error: msg })
    throw e
  }
}

export async function runDailyBossCrawlForAllUsers() {
  if (!isPgEnabled()) return
  const userIds = await listUsersDueForCrawl(24)
  for (const userId of userIds) {
    try {
      await runBossCrawlPipeline(userId, { trigger: 'scheduled' })
      console.log(`[BossCrawl] scheduled done for user ${userId}`)
    } catch (e) {
      console.error(`[BossCrawl] scheduled failed for user ${userId}:`, e)
    }
  }
}

export async function listTodayRecommendMatches(userId: string) {
  const pref = await getJobPreference(userId)
  const limit = pref.dailyRecommendLimit ?? 10

  let items = await listJobMatches(userId, {
    tier: ['S', 'A'],
    status: ['pending_review', 'queued'],
    todayOnly: true,
  })

  if (items.length < limit) {
    const fallback = await listJobMatches(userId, {
      tier: ['S', 'A'],
      status: ['pending_review', 'queued'],
      todayOnly: false,
    })
    const seen = new Set(items.map((m) => m.id))
    for (const m of fallback) {
      if (items.length >= limit) break
      if (!seen.has(m.id)) items.push(m)
    }
  }

  return items.slice(0, limit)
}

export async function getTodayRecommendations(userId: string) {
  const pref = await getJobPreference(userId)
  const limit = pref.dailyRecommendLimit ?? 10
  const items = await listTodayRecommendMatches(userId)

  const runs = await listCrawlRuns(userId, 5)
  const session = await getBossSession(userId)
  const manualCrawlsToday = await countManualCrawlsToday(userId)
  const bossBound = Boolean(
    session?.cookieHeader && session.status === 'active' && isRealBossCookie(session.cookieHeader),
  )
  const filtered = filterOutDemoJobs(items)
  return {
    items: filtered.slice(0, limit),
    recommendLimit: limit,
    preference: pref,
    lastCrawlAt: pref.lastCrawlAt,
    firecrawlConfigured: isFirecrawlConfigured(),
    bossBound,
    manualCrawlsToday,
    recentRuns: runs,
  }
}

export { listCrawlRuns }

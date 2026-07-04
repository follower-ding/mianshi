import { buildBossSearchUrl, resolveBossCityCode } from './boss-cities.js'
import { buildSearchQueries, type BossCrawlItem } from './boss-crawler.js'
import { bossFetch, hasBossAuthCookie, normalizeCookieHeader } from './boss-client.js'
import { crawlThrottle, isAntiBotError, tripCircuitBreaker } from './boss-safety.js'
import type { JobPreference } from '../types/entities.js'

function parseJobListResponse(
  json: Record<string, unknown>,
  city: string,
  searchUrl: string,
): BossCrawlItem[] {
  const zpData = json.zpData as Record<string, unknown> | undefined
  const list = (zpData?.jobList ?? zpData?.list) as unknown[] | undefined
  if (!Array.isArray(list)) return []

  const jobs: BossCrawlItem[] = []
  for (const raw of list) {
    const item = raw as Record<string, unknown>
    const jobInfo = (item.jobInfo ?? item) as Record<string, unknown>
    const brand = (item.brandComInfo ?? item) as Record<string, unknown>
    const externalId = String(jobInfo.encryptJobId ?? jobInfo.jobId ?? item.encryptJobId ?? '')
    if (!externalId) continue

    const bossMeta: Record<string, string> = {}
    const securityId = String(item.securityId ?? jobInfo.securityId ?? '')
    const lid = String(item.lid ?? jobInfo.lid ?? '')
    if (securityId) bossMeta.securityId = securityId
    if (lid) bossMeta.lid = lid
    bossMeta.jobId = String(jobInfo.encryptJobId ?? jobInfo.jobId ?? externalId)

    jobs.push({
      title: String(jobInfo.jobName ?? jobInfo.title ?? '未知岗位'),
      company: String(brand.brandName ?? brand.companyName ?? '未知公司'),
      salary: String(jobInfo.salaryDesc ?? jobInfo.salary ?? '面议'),
      city,
      experience: String(jobInfo.jobExperience ?? '经验不限'),
      education: String(jobInfo.jobDegree ?? '本科'),
      tags: [],
      externalId,
      jd: String(jobInfo.postDescription ?? jobInfo.jobDesc ?? '').slice(0, 2000),
      bossMeta: Object.keys(bossMeta).length ? bossMeta : undefined,
      searchUrl,
    })
  }
  return jobs
}

/** 使用已登录 Boss Cookie 调用 joblist.json（轻量、无需 Playwright） */
export async function crawlBossWithSessionApi(
  pref: JobPreference,
  cookieHeader: string,
  opts?: { maxJobsPerQuery?: number; maxQueries?: number; userId?: string },
): Promise<{ jobs: BossCrawlItem[]; lastError?: string }> {
  const cookie = normalizeCookieHeader(cookieHeader)
  if (!cookie || !hasBossAuthCookie(cookie)) {
    return { jobs: [], lastError: 'Boss 未登录或 Cookie 无效，请重新绑定' }
  }

  const maxPerQuery = opts?.maxJobsPerQuery ?? 30
  const queries = buildSearchQueries(pref).slice(0, opts?.maxQueries ?? 8)
  const all: BossCrawlItem[] = []
  const seen = new Set<string>()
  let lastError: string | undefined

  for (const { query, city } of queries) {
    const searchUrl = buildBossSearchUrl(query, city)
    const cityCode = resolveBossCityCode(city)
    try {
      const { json } = await bossFetch('/wapi/zpgeek/search/joblist.json', cookie, {
        method: 'POST',
        referer: searchUrl,
        form: {
          scene: '1',
          query,
          city: cityCode,
          page: '1',
          pageSize: String(maxPerQuery),
        },
      })
      if (!json || json.code !== 0) {
        lastError = String(json?.message ?? `Boss API 返回 code=${json?.code ?? 'unknown'}`)
        if (opts?.userId && isAntiBotError(lastError)) tripCircuitBreaker(opts.userId, lastError)
        continue
      }
      for (const job of parseJobListResponse(json as Record<string, unknown>, city, searchUrl)) {
        if (seen.has(job.externalId)) continue
        seen.add(job.externalId)
        all.push(job)
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : '网络错误'
      if (opts?.userId && isAntiBotError(lastError)) tripCircuitBreaker(opts.userId, lastError)
      console.warn('[BossApiCrawl] joblist failed:', query, city, e)
    }
    await crawlThrottle()
  }

  return { jobs: all, lastError: all.length ? undefined : lastError }
}

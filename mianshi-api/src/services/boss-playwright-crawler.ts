import type { JobPreference } from '../types/entities.js'
import { buildBossSearchUrlWithFilters, type BossSearchFilters } from './boss-cities.js'
import { parseBossJobsFromMarkdown } from './boss-crawler.js'
import type { BossCrawlItem } from './boss-crawler.js'
import { fetchBossJobDetailHtml } from './boss-client.js'

export type PlaywrightCrawlOptions = {
  cookieHeader?: string
  filters?: Partial<BossSearchFilters>
  maxJobs?: number
  fetchDetail?: boolean
}

function preferenceToFilters(pref: JobPreference): BossSearchFilters {
  return {
    query: pref.targetPositions[0] ?? 'Java 后端',
    city: pref.targetCities[0] ?? '成都',
    salaryMin: pref.salaryMin ?? undefined,
    salaryMax: pref.salaryMax ?? undefined,
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

function extractJdFromDetailHtml(html: string): string {
  const descMatch = html.match(/职位描述[\s\S]{0,20}?<[^>]*>([\s\S]{200,4000}?)<\//i)
  if (descMatch?.[1]) return stripHtml(descMatch[1]).slice(0, 3000)
  const text = stripHtml(html)
  const idx = text.indexOf('职位描述')
  if (idx >= 0) return text.slice(idx, idx + 2500)
  return text.slice(0, 1500)
}

export async function crawlBossWithPlaywright(
  pref: JobPreference,
  opts: PlaywrightCrawlOptions = {},
): Promise<BossCrawlItem[]> {
  const filters: BossSearchFilters = { ...preferenceToFilters(pref), ...opts.filters }
  const searchUrl = buildBossSearchUrlWithFilters(filters)
  const maxJobs = opts.maxJobs ?? 20

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
    })

    if (opts.cookieHeader) {
      const cookies = opts.cookieHeader.split(';').map((part) => {
        const [name, ...rest] = part.trim().split('=')
        return {
          name: name.trim(),
          value: rest.join('=').trim(),
          domain: '.zhipin.com',
          path: '/',
        }
      }).filter((c) => c.name && c.value)
      if (cookies.length) await context.addCookies(cookies)
    }

    const page = await context.newPage()
    const intercepted: BossCrawlItem[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if (!url.includes('joblist.json') && !url.includes('search/joblist')) return
      try {
        const json = (await response.json()) as Record<string, unknown>
        const zpData = json.zpData as Record<string, unknown> | undefined
        const list = (zpData?.jobList ?? zpData?.list) as unknown[] | undefined
        if (!Array.isArray(list)) return
        for (const raw of list.slice(0, maxJobs)) {
          const item = raw as Record<string, unknown>
          const jobInfo = (item.jobInfo ?? item) as Record<string, unknown>
          const brand = (item.brandComInfo ?? item) as Record<string, unknown>
          const externalId = String(jobInfo.encryptJobId ?? jobInfo.jobId ?? '')
          if (!externalId) continue
          intercepted.push({
            title: String(jobInfo.jobName ?? jobInfo.title ?? '未知岗位'),
            company: String(brand.brandName ?? brand.companyName ?? '未知公司'),
            salary: String(jobInfo.salaryDesc ?? jobInfo.salary ?? '面议'),
            city: filters.city,
            experience: String(jobInfo.jobExperience ?? '经验不限'),
            education: String(jobInfo.jobDegree ?? '本科'),
            tags: [],
            externalId,
            jd: String(jobInfo.postDescription ?? jobInfo.jobDesc ?? ''),
            searchUrl,
          })
        }
      } catch {
        /* ignore parse errors */
      }
    })

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)

    let jobs = intercepted
    if (!jobs.length) {
      const bodyText = await page.content()
      const parsed = parseBossJobsFromMarkdown(bodyText, filters.city)
      jobs = parsed.map((j) => ({ ...j, searchUrl }))
    }

    if (opts.fetchDetail && opts.cookieHeader && jobs.length) {
      for (const job of jobs.slice(0, 10)) {
        if (job.jd.length > 100) continue
        try {
          const html = await fetchBossJobDetailHtml(opts.cookieHeader, job.externalId)
          job.jd = extractJdFromDetailHtml(html)
        } catch {
          /* skip detail failure */
        }
      }
    }

    await browser.close()
    return jobs.slice(0, maxJobs)
  } catch (e) {
    console.warn('[PlaywrightCrawl]', e instanceof Error ? e.message : e)
    return []
  }
}

export async function isPlaywrightCrawlAvailable(): Promise<boolean> {
  try {
    await import('playwright')
    return true
  } catch {
    return false
  }
}

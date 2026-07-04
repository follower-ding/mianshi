import {
  buildBossJobUrl,
  buildBossSearchUrl,
  resolveBossCityName,
} from './boss-cities.js'
import {
  firecrawlScrapeJobsJson,
  firecrawlScrapeMarkdown,
  isFirecrawlConfigured,
  type BossParsedJob,
} from './firecrawl-client.js'
import type { JobPreference } from '../types/entities.js'

export type BossCrawlItem = BossParsedJob & { searchUrl: string }

const SALARY_RE = /(\d+)\s*[-~至]\s*(\d+)\s*[Kk万]?/

function parseSalaryK(salary: string): { min: number; max: number } | null {
  const m = salary.match(SALARY_RE)
  if (!m) return null
  let min = Number(m[1])
  let max = Number(m[2])
  if (salary.includes('万')) {
    min *= 10
    max *= 10
  }
  return { min, max }
}

/** 从 markdown 解析 Boss 列表页 */
export function parseBossJobsFromMarkdown(markdown: string, cityFallback: string): BossParsedJob[] {
  const jobs: BossParsedJob[] = []
  const seen = new Set<string>()

  const linkRe = /\[([^\]]{2,80})\]\((https?:\/\/(?:www\.)?zhipin\.com\/job_detail\/([a-zA-Z0-9_-]+)\.html[^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(markdown)) !== null) {
    const title = m[1].trim()
    const externalId = m[3]
    if (seen.has(externalId)) continue
    seen.add(externalId)

    const chunk = markdown.slice(Math.max(0, m.index - 120), m.index + 280)
    const salaryMatch = chunk.match(/(\d+\s*[-~至]\s*\d+\s*[Kk万][^\s\n]{0,10})/)?.[1] ?? '面议'
    const companyMatch = chunk.match(/(?:^|\n)([^\[\n]{2,30}(?:科技|网络|信息|集团|有限公司)?)/)?.[1]

    jobs.push({
      title,
      company: companyMatch?.trim() || '未知公司',
      salary: salaryMatch,
      city: cityFallback,
      experience: chunk.match(/(\d+[-~]\d+\s*年|应届|经验不限)/)?.[1] ?? '经验不限',
      education: chunk.match(/(本科|硕士|博士|大专|学历不限)/)?.[1] ?? '本科',
      tags: extractTags(title + chunk),
      externalId,
      jd: `${title} · ${companyMatch ?? ''} · ${salaryMatch}`,
    })
  }

  return jobs.slice(0, 30)
}

function extractTags(text: string): string[] {
  const pool = ['Java', 'Go', 'Python', 'Spring', '微服务', 'Redis', 'Kafka', 'K8s', 'React', 'Vue', '算法', '后端', '前端']
  return pool.filter((t) => text.includes(t)).slice(0, 5)
}

function buildSearchQueries(pref: JobPreference): { query: string; city: string }[] {
  const cities = pref.targetCities.length ? pref.targetCities : ['北京', '上海']
  const positions = pref.targetPositions.length ? pref.targetPositions : ['Java 后端']
  const companies = pref.targetCompanies

  const queries: { query: string; city: string }[] = []

  for (const city of cities) {
    for (const pos of positions) {
      queries.push({ query: pos, city })
      for (const company of companies.slice(0, 3)) {
        queries.push({ query: `${company} ${pos}`, city })
      }
    }
  }

  const dedup = new Map<string, { query: string; city: string }>()
  for (const q of queries) dedup.set(`${q.city}:${q.query}`, q)
  return [...dedup.values()].slice(0, 12)
}

export async function crawlBossForPreference(pref: JobPreference): Promise<BossCrawlItem[]> {
  const queries = buildSearchQueries(pref)
  const all: BossCrawlItem[] = []
  const seenIds = new Set<string>()

  for (const { query, city } of queries) {
    const searchUrl = buildBossSearchUrl(query, city)
    let parsed: BossParsedJob[] = []

    if (isFirecrawlConfigured()) {
      try {
        parsed = await firecrawlScrapeJobsJson(searchUrl)
        if (parsed.length === 0) {
          const md = await firecrawlScrapeMarkdown(searchUrl)
          if (md) parsed = parseBossJobsFromMarkdown(md, city)
        }
      } catch (e) {
        console.warn('[BossCrawl] Firecrawl failed:', e)
      }
    }

    for (const job of parsed) {
      if (!job.externalId || seenIds.has(job.externalId)) continue
      seenIds.add(job.externalId)
      all.push({
        ...job,
        externalUrl: buildBossJobUrl(job.externalId),
        city: job.city || city,
        searchUrl,
      } as BossCrawlItem & { externalUrl?: string })
    }
  }

  return all.map((j) => ({
    ...j,
    city: j.city || resolveBossCityName('101010100'),
  }))
}

export { parseSalaryK, buildSearchQueries }

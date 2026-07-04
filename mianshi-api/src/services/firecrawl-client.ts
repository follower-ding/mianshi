const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE = process.env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev/v1'

export function isFirecrawlConfigured(): boolean {
  return Boolean(FIRECRAWL_API_KEY)
}

type ScrapeResult = {
  markdown?: string
  json?: unknown
}

export async function firecrawlScrapeMarkdown(url: string, waitFor = 8000): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) return null

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor,
      proxy: 'stealth',
      location: { country: 'CN', languages: ['zh-CN'] },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Firecrawl scrape failed (${res.status}): ${err.slice(0, 200)}`)
  }

  const body = (await res.json()) as { success?: boolean; data?: ScrapeResult }
  return body.data?.markdown ?? null
}

export async function firecrawlScrapeJobsJson(url: string): Promise<BossParsedJob[]> {
  if (!FIRECRAWL_API_KEY) return []

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['json'],
      waitFor: 10000,
      proxy: 'stealth',
      location: { country: 'CN', languages: ['zh-CN'] },
      jsonOptions: {
        prompt:
          '从 Boss 直聘职位列表页提取所有职位卡片，返回 jobs 数组，每项含 title, company, salary, city, experience, education, tags(数组), externalId(job_detail 链接中的 id), jd(职位描述摘要)',
        schema: {
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  company: { type: 'string' },
                  salary: { type: 'string' },
                  city: { type: 'string' },
                  experience: { type: 'string' },
                  education: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  externalId: { type: 'string' },
                  jd: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }),
  })

  if (!res.ok) return []

  const body = (await res.json()) as { data?: { json?: { jobs?: BossParsedJob[] } } }
  return body.data?.json?.jobs ?? []
}

export type BossParsedJob = {
  title: string
  company: string
  salary: string
  city: string
  experience: string
  education: string
  tags: string[]
  externalId: string
  jd: string
  bossMeta?: Record<string, string>
}

import { getSql, isPgEnabled } from '../db/client.js'
import { newId } from './store-json.js'
import type { CrawlRun, JobMatch, JobMatchStatus, JobPosting, CrawlTrigger } from '../types/entities.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

type JsonDb = {
  jobMatches?: JobMatch[]
  crawlRuns?: CrawlRun[]
}

function loadJsonDb(): JsonDb {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as JsonDb
}

function saveJsonDb(patch: Partial<JsonDb>) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, ...loadJsonDb(), ...patch }, null, 2), 'utf-8')
}

function mapMatchRow(r: Record<string, unknown>, job?: JobPosting): JobMatch {
  return {
    id: r.id as string,
    userId: (r.user_id as string) ?? (r.userId as string),
    jobId: (r.job_id as string) ?? (r.jobId as string),
    score: Number(r.score),
    tier: r.tier as JobMatch['tier'],
    reasons: (r.reasons as string[]) ?? [],
    status: r.status as JobMatchStatus,
    suggestedGreeting: (r.suggested_greeting as string) || (r.suggestedGreeting as string) || undefined,
    matchedAt: (r.matched_at as Date)?.toISOString?.() ?? (r.matchedAt as string),
    job,
  }
}

export async function upsertJobMatch(input: {
  userId: string
  jobId: string
  score: number
  tier: JobMatch['tier']
  reasons: string[]
  status?: JobMatchStatus
  suggestedGreeting?: string
}): Promise<JobMatch> {
  const id = newId('match')
  const now = new Date().toISOString()
  const status = input.status ?? (input.tier === 'S' || input.tier === 'A' ? 'pending_review' : 'skipped')

  if (!isPgEnabled()) {
    const existing = (loadJsonDb().jobMatches ?? []).find(
      (m) => m.userId === input.userId && m.jobId === input.jobId,
    )
    const match: JobMatch = {
      id: existing?.id ?? id,
      userId: input.userId,
      jobId: input.jobId,
      score: input.score,
      tier: input.tier,
      reasons: input.reasons,
      status: existing?.status === 'applied' ? 'applied' : status,
      suggestedGreeting: input.suggestedGreeting ?? existing?.suggestedGreeting,
      matchedAt: now,
    }
    const others = (loadJsonDb().jobMatches ?? []).filter(
      (m) => !(m.userId === input.userId && m.jobId === input.jobId),
    )
    saveJsonDb({ jobMatches: [match, ...others] })
    return match
  }

  const db = getSql()
  const rows = await db`
    INSERT INTO job_matches (id, user_id, job_id, score, tier, reasons, status, suggested_greeting, matched_at)
    VALUES (${id}, ${input.userId}, ${input.jobId}, ${input.score}, ${input.tier},
      ${db.json(input.reasons)}, ${status}, ${input.suggestedGreeting ?? ''}, NOW())
    ON CONFLICT (user_id, job_id) DO UPDATE SET
      score = EXCLUDED.score,
      tier = EXCLUDED.tier,
      reasons = EXCLUDED.reasons,
      suggested_greeting = CASE
        WHEN job_matches.status = 'applied' THEN job_matches.suggested_greeting
        ELSE EXCLUDED.suggested_greeting
      END,
      status = CASE
        WHEN job_matches.status = 'applied' THEN job_matches.status
        WHEN job_matches.status = 'skipped' AND EXCLUDED.tier IN ('S', 'A') THEN 'pending_review'
        ELSE job_matches.status
      END,
      matched_at = NOW()
    RETURNING *
  `
  return mapMatchRow(rows[0] as Record<string, unknown>)
}

export async function listJobMatches(
  userId: string,
  filters?: { tier?: JobMatch['tier'][]; status?: JobMatchStatus[]; todayOnly?: boolean },
): Promise<JobMatch[]> {
  if (!isPgEnabled()) {
    let items = (loadJsonDb().jobMatches ?? []).filter((m) => m.userId === userId)
    if (filters?.tier?.length) items = items.filter((m) => filters.tier!.includes(m.tier))
    if (filters?.status?.length) items = items.filter((m) => filters.status!.includes(m.status))
    if (filters?.todayOnly) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      items = items.filter((m) => new Date(m.matchedAt) >= start)
    }
    return items.sort((a, b) => b.score - a.score)
  }

  const db = getSql()
  const rows = await db`
    SELECT m.*, j.company, j.title, j.position, j.city, j.salary, j.experience, j.education,
           j.jd, j.tags, j.status as job_status, j.source, j.external_id, j.external_url,
           j.crawled_at, j.created_at
    FROM job_matches m
    JOIN job_postings j ON j.id = m.job_id
    WHERE m.user_id = ${userId}
    ORDER BY m.score DESC, m.matched_at DESC
  `

  let items = rows.map((r) => {
    const job: JobPosting = {
      id: r.job_id as string,
      company: r.company as string,
      title: r.title as string,
      position: r.position as string,
      city: r.city as string,
      salary: r.salary as string,
      experience: r.experience as string,
      education: r.education as string,
      jd: r.jd as string,
      tags: (r.tags as string[]) ?? [],
      status: r.job_status as JobPosting['status'],
      createdAt: (r.created_at as Date)?.toISOString?.() ?? '',
      source: r.source as JobPosting['source'],
      externalId: (r.external_id as string) || undefined,
      externalUrl: (r.external_url as string) || undefined,
      crawledAt: (r.crawled_at as Date)?.toISOString?.() ?? undefined,
    }
    return mapMatchRow(r as Record<string, unknown>, job)
  })

  if (filters?.tier?.length) items = items.filter((m) => filters.tier!.includes(m.tier))
  if (filters?.status?.length) items = items.filter((m) => filters.status!.includes(m.status))
  if (filters?.todayOnly) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    items = items.filter((m) => new Date(m.matchedAt) >= start)
  }
  return items
}

export async function updateJobMatchStatus(id: string, userId: string, status: JobMatchStatus) {
  if (!isPgEnabled()) {
    const items = loadJsonDb().jobMatches ?? []
    saveJsonDb({
      jobMatches: items.map((m) => (m.id === id && m.userId === userId ? { ...m, status } : m)),
    })
    return
  }
  const db = getSql()
  await db`UPDATE job_matches SET status = ${status} WHERE id = ${id} AND user_id = ${userId}`
}

export async function getJobMatch(id: string, userId: string): Promise<JobMatch | null> {
  const items = await listJobMatches(userId)
  return items.find((m) => m.id === id) ?? null
}

export async function createCrawlRun(input: Omit<CrawlRun, 'id' | 'startedAt' | 'finishedAt'> & { id?: string }) {
  const id = input.id ?? newId('crawl')
  const run: CrawlRun = {
    ...input,
    trigger: input.trigger ?? 'manual',
    id,
    startedAt: new Date().toISOString(),
  }
  if (!isPgEnabled()) {
    saveJsonDb({ crawlRuns: [run, ...(loadJsonDb().crawlRuns ?? [])] })
    return run
  }
  const db = getSql()
  await db`
    INSERT INTO crawl_runs (id, user_id, source, trigger, query, jobs_found, jobs_new, status, error, started_at)
    VALUES (${id}, ${input.userId}, ${input.source}, ${input.trigger ?? 'manual'}, ${input.query}, ${input.jobsFound},
      ${input.jobsNew}, ${input.status}, ${input.error ?? null}, NOW())
  `
  return run
}

export async function countManualCrawlsToday(userId: string): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (!isPgEnabled()) {
    return (loadJsonDb().crawlRuns ?? []).filter(
      (r) =>
        r.userId === userId &&
        r.trigger === 'manual' &&
        new Date(r.startedAt) >= start &&
        r.status !== 'failed',
    ).length
  }
  const db = getSql()
  const rows = await db`
    SELECT COUNT(*)::int AS cnt FROM crawl_runs
    WHERE user_id = ${userId}
      AND trigger = 'manual'
      AND started_at >= ${start.toISOString()}
      AND status != 'failed'
  `
  return Number((rows[0] as { cnt: number })?.cnt ?? 0)
}

export async function finishCrawlRun(
  id: string,
  patch: Pick<CrawlRun, 'jobsFound' | 'jobsNew' | 'status' | 'error'>,
) {
  if (!isPgEnabled()) {
    const runs = loadJsonDb().crawlRuns ?? []
    saveJsonDb({
      crawlRuns: runs.map((r) =>
        r.id === id ? { ...r, ...patch, finishedAt: new Date().toISOString() } : r,
      ),
    })
    return
  }
  const db = getSql()
  await db`
    UPDATE crawl_runs SET
      jobs_found = ${patch.jobsFound},
      jobs_new = ${patch.jobsNew},
      status = ${patch.status},
      error = ${patch.error ?? null},
      finished_at = NOW()
    WHERE id = ${id}
  `
}

export async function listCrawlRuns(userId: string, limit = 10): Promise<CrawlRun[]> {
  if (!isPgEnabled()) {
    return (loadJsonDb().crawlRuns ?? [])
      .filter((r) => r.userId === userId)
      .slice(0, limit)
  }
  const db = getSql()
  const rows = await db`
    SELECT * FROM crawl_runs WHERE user_id = ${userId}
    ORDER BY started_at DESC LIMIT ${limit}
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    source: r.source as CrawlRun['source'],
    trigger: ((r.trigger as CrawlTrigger) ?? 'manual') as CrawlTrigger,
    query: r.query as string,
    jobsFound: Number(r.jobs_found),
    jobsNew: Number(r.jobs_new),
    status: r.status as CrawlRun['status'],
    error: (r.error as string) || undefined,
    startedAt: (r.started_at as Date)?.toISOString?.() ?? '',
    finishedAt: (r.finished_at as Date)?.toISOString?.() ?? undefined,
  }))
}

export async function purgeDemoMatchesForUser(userId: string): Promise<{
  removed: number
  matches: number
  applications: number
  chats: number
}> {
  if (!isPgEnabled()) return { removed: 0, matches: 0, applications: 0, chats: 0 }

  const db = getSql()

  const demoJobs = await db`
    SELECT DISTINCT j.id AS job_id
    FROM job_postings j
    WHERE j.external_id LIKE 'demo-%' OR j.jd LIKE '%演示数据%'
  `
  const demoJobIds = demoJobs.map((r) => r.job_id as string)

  let matchCount = 0
  let appCount = 0

  if (demoJobIds.length > 0) {
    const matchRows = await db`
      DELETE FROM job_matches
      WHERE user_id = ${userId} AND job_id = ANY(${demoJobIds})
      RETURNING id
    `
    matchCount = matchRows.length

    const appRows = await db`
      DELETE FROM job_applications
      WHERE user_id = ${userId} AND job_id = ANY(${demoJobIds})
      RETURNING id
    `
    appCount = appRows.length

    for (const jobId of demoJobIds) {
      const refs = await db`
        SELECT 1 FROM job_matches WHERE job_id = ${jobId} LIMIT 1
        UNION ALL
        SELECT 1 FROM job_applications WHERE job_id = ${jobId} LIMIT 1
      `
      if (!refs.length) {
        await db`DELETE FROM job_postings WHERE id = ${jobId}`
      }
    }
  }

  const chatRows = await db`
    DELETE FROM boss_chat_messages
    WHERE user_id = ${userId}
      AND (boss_job_id LIKE 'demo-%' OR boss_job_id LIKE 'demo-chat-%')
    RETURNING id
  `

  const total = matchCount + appCount + chatRows.length
  return {
    removed: total,
    matches: matchCount,
    applications: appCount,
    chats: chatRows.length,
  }
}

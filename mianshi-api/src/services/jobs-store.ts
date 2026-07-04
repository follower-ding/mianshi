import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jobsSeed from '../../data/jobs-seed.json' with { type: 'json' }
import { getSql, isPgEnabled } from '../db/client.js'
import { newId } from './store-json.js'
import type { JobApplication, JobApplicationStatus, JobPosting, JobPostingStatus } from '../types/entities.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

type JsonDb = {
  jobPostings?: JobPosting[]
  jobApplications?: JobApplication[]
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

function ensureJsonJobs() {
  const db = loadJsonDb()
  if (!db.jobPostings?.length) {
    const jobs = (jobsSeed as { jobs: Omit<JobPosting, 'createdAt'>[] }).jobs.map((j) => ({
      ...j,
      createdAt: new Date().toISOString(),
    }))
    saveJsonDb({ jobPostings: jobs, jobApplications: db.jobApplications ?? [] })
  }
  if (!db.jobApplications) saveJsonDb({ jobApplications: [] })
}

function mapJobRow(r: Record<string, unknown>): JobPosting {
  return {
    id: r.id as string,
    company: r.company as string,
    title: r.title as string,
    position: r.position as string,
    city: r.city as string,
    salary: r.salary as string,
    experience: r.experience as string,
    education: r.education as string,
    jd: r.jd as string,
    tags: (r.tags as string[]) ?? [],
    status: r.status as JobPostingStatus,
    createdAt: (r.created_at as Date)?.toISOString?.() ?? (r.createdAt as string),
    source: (r.source as JobPosting['source']) ?? 'internal',
    externalId: (r.external_id as string) || (r.externalId as string) || undefined,
    externalUrl: (r.external_url as string) || (r.externalUrl as string) || undefined,
    crawledAt:
      ((r.crawled_at as Date)?.toISOString?.() ?? (r.crawledAt as string)) || undefined,
    bossMeta: (r.boss_meta as Record<string, string>) ?? undefined,
  }
}

function jobSnapshot(job: JobPosting) {
  return {
    company: job.company,
    title: job.title,
    position: job.position,
    city: job.city,
    salary: job.salary,
    externalUrl: job.externalUrl,
    externalId: job.externalId,
    jd: job.jd,
    source: job.source,
  }
}

function mapAppRow(r: Record<string, unknown>, job?: JobPosting): JobApplication {
  return {
    id: r.id as string,
    userId: (r.user_id as string) ?? (r.userId as string),
    jobId: (r.job_id as string) ?? (r.jobId as string),
    status: r.status as JobApplicationStatus,
    greeting: r.greeting as string,
    resumeSummary: (r.resume_summary as string) || (r.resumeSummary as string) || undefined,
    sessionId: (r.session_id as string) || (r.sessionId as string) || undefined,
    reportId: (r.report_id as string) || (r.reportId as string) || undefined,
    appliedAt: (r.applied_at as Date)?.toISOString?.() ?? (r.appliedAt as string),
    updatedAt: (r.updated_at as Date)?.toISOString?.() ?? (r.updatedAt as string),
    bossApplyStatus: (r.boss_apply_status as JobApplication['bossApplyStatus']) || undefined,
    bossApplyError: (r.boss_apply_error as string) || undefined,
    bossReplySnippet: (r.boss_reply_snippet as string) || undefined,
    bossSyncedAt:
      ((r.boss_synced_at as Date)?.toISOString?.() ?? (r.boss_synced_at as string)) || undefined,
    job: job ? jobSnapshot(job) : (r.job as JobApplication['job']),
  }
}

export async function seedJobsIfEmpty() {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    return
  }
  const db = getSql()
  const rows = await db<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM job_postings`
  if (Number(rows[0]?.count) > 0) return
  for (const j of (jobsSeed as { jobs: Omit<JobPosting, 'createdAt'>[] }).jobs) {
    await db`
      INSERT INTO job_postings (id, company, title, position, city, salary, experience, education, jd, tags, status)
      VALUES (${j.id}, ${j.company}, ${j.title}, ${j.position}, ${j.city}, ${j.salary},
        ${j.experience}, ${j.education}, ${j.jd}, ${db.json(j.tags)}, ${j.status})
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log('[DB] Seeded job postings')
}

export async function listJobPostings(filters?: { status?: JobPostingStatus; includeAll?: boolean }) {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    let items = loadJsonDb().jobPostings ?? []
    if (!filters?.includeAll) items = items.filter((j) => j.status === 'published')
    else if (filters?.status) items = items.filter((j) => j.status === filters.status)
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  const db = getSql()
  const status = filters?.status ?? (filters?.includeAll ? undefined : 'published')
  const rows = status
    ? await db`SELECT * FROM job_postings WHERE status = ${status} ORDER BY created_at DESC`
    : await db`SELECT * FROM job_postings ORDER BY created_at DESC`
  return rows.map((r) => mapJobRow(r as Record<string, unknown>))
}

export async function getJobPosting(id: string) {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    return loadJsonDb().jobPostings?.find((j) => j.id === id) ?? null
  }
  const db = getSql()
  const rows = await db`SELECT * FROM job_postings WHERE id = ${id}`
  return rows[0] ? mapJobRow(rows[0] as Record<string, unknown>) : null
}

export async function createJobPosting(input: Omit<JobPosting, 'id' | 'createdAt'>) {
  const id = newId('job')
  if (!isPgEnabled()) {
    ensureJsonJobs()
    const job: JobPosting = { ...input, id, createdAt: new Date().toISOString() }
    const db = loadJsonDb()
    saveJsonDb({ jobPostings: [job, ...(db.jobPostings ?? [])] })
    return job
  }
  const db = getSql()
  const rows = await db`
    INSERT INTO job_postings (id, company, title, position, city, salary, experience, education, jd, tags, status)
    VALUES (${id}, ${input.company}, ${input.title}, ${input.position}, ${input.city}, ${input.salary},
      ${input.experience}, ${input.education}, ${input.jd}, ${db.json(input.tags)}, ${input.status ?? 'published'})
    RETURNING *
  `
  return mapJobRow(rows[0] as Record<string, unknown>)
}

export async function updateJobPosting(
  id: string,
  patch: Partial<Omit<JobPosting, 'id' | 'createdAt' | 'source' | 'externalId' | 'externalUrl' | 'crawledAt'>>,
) {
  const existing = await getJobPosting(id)
  if (!existing) return null
  if (existing.source === 'boss') return null

  const next: JobPosting = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    source: existing.source,
    externalId: existing.externalId,
    externalUrl: existing.externalUrl,
    crawledAt: existing.crawledAt,
  }

  if (!isPgEnabled()) {
    ensureJsonJobs()
    const db = loadJsonDb()
    const jobs = (db.jobPostings ?? []).map((j) => (j.id === id ? next : j))
    saveJsonDb({ jobPostings: jobs })
    return next
  }

  const db = getSql()
  const rows = await db`
    UPDATE job_postings SET
      company = ${next.company},
      title = ${next.title},
      position = ${next.position},
      city = ${next.city},
      salary = ${next.salary},
      experience = ${next.experience},
      education = ${next.education},
      jd = ${next.jd},
      tags = ${db.json(next.tags)},
      status = ${next.status}
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] ? mapJobRow(rows[0] as Record<string, unknown>) : null
}

export async function deleteJobPosting(id: string) {
  const existing = await getJobPosting(id)
  if (!existing) return false
  if (existing.source === 'boss') return false

  if (!isPgEnabled()) {
    ensureJsonJobs()
    const db = loadJsonDb()
    const jobs = (db.jobPostings ?? []).filter((j) => j.id !== id)
    if (jobs.length === (db.jobPostings ?? []).length) return false
    saveJsonDb({ jobPostings: jobs })
    return true
  }

  const db = getSql()
  const rows = await db`DELETE FROM job_postings WHERE id = ${id} AND source = 'internal' RETURNING id`
  return rows.length > 0
}

export async function listJobApplications(userId: string) {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    const jobs = loadJsonDb().jobPostings ?? []
    return (loadJsonDb().jobApplications ?? [])
      .filter((a) => a.userId === userId)
      .map((a) => {
        const job = jobs.find((j) => j.id === a.jobId)
        return {
          ...a,
          job: job
            ? { company: job.company, title: job.title, position: job.position, city: job.city, salary: job.salary }
            : a.job,
        }
      })
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
  }
  const db = getSql()
  const rows = await db`
    SELECT a.*, j.company, j.title, j.position, j.city, j.salary, j.external_url, j.external_id, j.jd, j.source
    FROM job_applications a
    JOIN job_postings j ON j.id = a.job_id
    WHERE a.user_id = ${userId}
    ORDER BY a.applied_at DESC
  `
  return rows.map((r) =>
    mapAppRow(r as Record<string, unknown>, {
      id: r.job_id as string,
      company: r.company as string,
      title: r.title as string,
      position: r.position as string,
      city: r.city as string,
      salary: r.salary as string,
      jd: (r.jd as string) ?? '',
      externalUrl: (r.external_url as string) || undefined,
      externalId: (r.external_id as string) || undefined,
      source: (r.source as JobPosting['source']) ?? 'internal',
      experience: '',
      education: '',
      tags: [],
      status: 'published',
      createdAt: '',
    } as JobPosting),
  )
}

export async function getJobApplication(id: string) {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    const app = loadJsonDb().jobApplications?.find((a) => a.id === id)
    if (!app) return null
    const job = loadJsonDb().jobPostings?.find((j) => j.id === app.jobId)
    return mapAppRow(app as unknown as Record<string, unknown>, job)
  }
  const db = getSql()
  const rows = await db`
    SELECT a.*, j.company, j.title, j.position, j.city, j.salary, j.jd, j.tags, j.experience, j.education, j.status as job_status
    FROM job_applications a
    JOIN job_postings j ON j.id = a.job_id
    WHERE a.id = ${id}
  `
  if (!rows[0]) return null
  return mapAppRow(rows[0] as Record<string, unknown>, mapJobRow(rows[0] as Record<string, unknown>))
}

export async function findApplicationByUserAndJob(userId: string, jobId: string) {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    return (loadJsonDb().jobApplications ?? []).find((a) => a.userId === userId && a.jobId === jobId) ?? null
  }
  const db = getSql()
  const rows = await db`SELECT * FROM job_applications WHERE user_id = ${userId} AND job_id = ${jobId}`
  return rows[0] ? mapAppRow(rows[0] as Record<string, unknown>) : null
}

export async function createJobApplication(input: {
  userId: string
  jobId: string
  greeting: string
  resumeSummary?: string
}) {
  const id = newId('app')
  const now = new Date().toISOString()
  if (!isPgEnabled()) {
    ensureJsonJobs()
    const job = loadJsonDb().jobPostings?.find((j) => j.id === input.jobId)
    const app: JobApplication = {
      id,
      userId: input.userId,
      jobId: input.jobId,
      status: 'applied',
      greeting: input.greeting,
      resumeSummary: input.resumeSummary,
      appliedAt: now,
      updatedAt: now,
      job: job
        ? { company: job.company, title: job.title, position: job.position, city: job.city, salary: job.salary }
        : undefined,
    }
    const db = loadJsonDb()
    saveJsonDb({ jobApplications: [app, ...(db.jobApplications ?? [])] })
    return app
  }
  const db = getSql()
  const rows = await db`
    INSERT INTO job_applications (id, user_id, job_id, status, greeting, resume_summary, applied_at, updated_at)
    VALUES (${id}, ${input.userId}, ${input.jobId}, 'applied', ${input.greeting},
      ${input.resumeSummary ?? ''}, NOW(), NOW())
    RETURNING *
  `
  const job = await getJobPosting(input.jobId)
  return mapAppRow(rows[0] as Record<string, unknown>, job ?? undefined)
}

export async function updateJobApplication(
  id: string,
  patch: Partial<
    Pick<
      JobApplication,
      | 'status'
      | 'greeting'
      | 'sessionId'
      | 'reportId'
      | 'resumeSummary'
      | 'bossApplyStatus'
      | 'bossApplyError'
      | 'bossReplySnippet'
      | 'bossSyncedAt'
    >
  >,
) {
  const existing = await getJobApplication(id)
  if (!existing) return null
  const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  if (!isPgEnabled()) {
    const db = loadJsonDb()
    saveJsonDb({
      jobApplications: (db.jobApplications ?? []).map((a) => (a.id === id ? merged : a)),
    })
    return merged
  }
  const db = getSql()
  await db`
    UPDATE job_applications SET
      status = ${merged.status},
      greeting = ${merged.greeting},
      session_id = ${merged.sessionId ?? null},
      report_id = ${merged.reportId ?? null},
      resume_summary = ${merged.resumeSummary ?? ''},
      boss_apply_status = ${merged.bossApplyStatus ?? existing.bossApplyStatus ?? 'pending'},
      boss_apply_error = ${merged.bossApplyError ?? ''},
      boss_reply_snippet = ${merged.bossReplySnippet ?? ''},
      boss_synced_at = ${merged.bossSyncedAt ? new Date(merged.bossSyncedAt) : null},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return getJobApplication(id)
}

export async function listAllJobApplications() {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    const jobs = loadJsonDb().jobPostings ?? []
    return (loadJsonDb().jobApplications ?? []).map((a) => {
      const job = jobs.find((j) => j.id === a.jobId)
      return {
        ...a,
        job: job
          ? { company: job.company, title: job.title, position: job.position, city: job.city, salary: job.salary }
          : a.job,
      }
    })
  }
  const db = getSql()
  const rows = await db`
    SELECT a.*, j.company, j.title, j.position, j.city, j.salary
    FROM job_applications a
    JOIN job_postings j ON j.id = a.job_id
    ORDER BY a.applied_at DESC
  `
  return rows.map((r) => mapAppRow(r as Record<string, unknown>))
}

export async function findBossJobByExternalId(externalId: string): Promise<JobPosting | null> {
  if (!isPgEnabled()) {
    ensureJsonJobs()
    return (
      loadJsonDb().jobPostings?.find((j) => j.source === 'boss' && j.externalId === externalId) ?? null
    )
  }
  const db = getSql()
  const rows = await db`SELECT * FROM job_postings WHERE source = 'boss' AND external_id = ${externalId}`
  return rows[0] ? mapJobRow(rows[0] as Record<string, unknown>) : null
}

export async function upsertBossJob(input: {
  externalId: string
  externalUrl: string
  company: string
  title: string
  position: string
  city: string
  salary: string
  experience: string
  education: string
  jd: string
  tags: string[]
  bossMeta?: Record<string, string>
}): Promise<{ job: JobPosting; isNew: boolean }> {
  const existing = await findBossJobByExternalId(input.externalId)
  const now = new Date().toISOString()

  if (existing) {
    if (!isPgEnabled()) {
      const updated: JobPosting = {
        ...existing,
        ...input,
        source: 'boss',
        crawledAt: now,
      }
      const db = loadJsonDb()
      saveJsonDb({
        jobPostings: (db.jobPostings ?? []).map((j) => (j.id === existing.id ? updated : j)),
      })
      return { job: updated, isNew: false }
    }
    const db = getSql()
    const mergedMeta = input.bossMeta
      ? { ...(existing.bossMeta ?? {}), ...input.bossMeta }
      : existing.bossMeta
    const rows = await db`
      UPDATE job_postings SET
        company = ${input.company}, title = ${input.title}, position = ${input.position},
        city = ${input.city}, salary = ${input.salary}, experience = ${input.experience},
        education = ${input.education}, jd = ${input.jd}, tags = ${db.json(input.tags)},
        external_url = ${input.externalUrl}, crawled_at = NOW(),
        boss_meta = ${db.json(mergedMeta ?? {})}
      WHERE id = ${existing.id}
      RETURNING *
    `
    return { job: mapJobRow(rows[0] as Record<string, unknown>), isNew: false }
  }

  const id = newId('boss')
  if (!isPgEnabled()) {
    const job: JobPosting = {
      id,
      ...input,
      source: 'boss',
      status: 'published',
      createdAt: now,
      crawledAt: now,
    }
    const db = loadJsonDb()
    saveJsonDb({ jobPostings: [job, ...(db.jobPostings ?? [])] })
    return { job, isNew: true }
  }

  const db = getSql()
  const rows = await db`
    INSERT INTO job_postings (
      id, company, title, position, city, salary, experience, education, jd, tags, status,
      source, external_id, external_url, crawled_at, boss_meta
    ) VALUES (
      ${id}, ${input.company}, ${input.title}, ${input.position}, ${input.city}, ${input.salary},
      ${input.experience}, ${input.education}, ${input.jd}, ${db.json(input.tags)}, 'published',
      'boss', ${input.externalId}, ${input.externalUrl}, NOW(), ${db.json(input.bossMeta ?? {})}
    )
    RETURNING *
  `
  return { job: mapJobRow(rows[0] as Record<string, unknown>), isNew: true }
}

export async function updateJobBossMeta(jobId: string, patch: Record<string, string>) {
  if (!isPgEnabled()) return
  const job = await getJobPosting(jobId)
  if (!job) return
  const merged = { ...(job.bossMeta ?? {}), ...patch }
  const db = getSql()
  await db`UPDATE job_postings SET boss_meta = ${db.json(merged)} WHERE id = ${jobId}`
}

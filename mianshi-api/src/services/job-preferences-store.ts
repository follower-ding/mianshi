import { getSql, isPgEnabled } from '../db/client.js'
import { newId } from './store-json.js'
import type { AutoApplyMode, CrawlTrigger, JobPreference } from '../types/entities.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

type JsonDb = { jobPreferences?: JobPreference[] }

function loadJsonDb(): JsonDb {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as JsonDb
}

function saveJsonPrefs(prefs: JobPreference[]) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, jobPreferences: prefs }, null, 2), 'utf-8')
}

const DEFAULT_PREF = (userId: string): JobPreference => ({
  userId,
  targetCompanies: ['字节跳动', '阿里巴巴', '腾讯'],
  targetCities: ['北京', '上海'],
  targetPositions: ['Java 后端', 'Go 后端'],
  salaryMin: 20,
  salaryMax: 50,
  excludeKeywords: ['外包', '驻场'],
  dailyApplyLimit: 8,
  autoApplyMode: 'review',
  maxJobsAutoCrawl: 20,
  maxJobsManualCrawl: 30,
  maxManualCrawlsPerDay: 3,
  dailyRecommendLimit: 8,
  manualCrawlPositions: [],
  manualCrawlCities: [],
  resumeSummary: '',
  updatedAt: new Date().toISOString(),
})

function mapPrefRow(r: Record<string, unknown>): JobPreference {
  return {
    userId: r.user_id as string,
    targetCompanies: (r.target_companies as string[]) ?? [],
    targetCities: (r.target_cities as string[]) ?? [],
    targetPositions: (r.target_positions as string[]) ?? [],
    salaryMin: r.salary_min != null ? Number(r.salary_min) : undefined,
    salaryMax: r.salary_max != null ? Number(r.salary_max) : undefined,
    excludeKeywords: (r.exclude_keywords as string[]) ?? [],
    dailyApplyLimit: Number(r.daily_apply_limit ?? 10),
    autoApplyMode: (r.auto_apply_mode as AutoApplyMode) ?? 'review',
    maxJobsAutoCrawl: Number(r.max_jobs_auto_crawl ?? 30),
    maxJobsManualCrawl: Number(r.max_jobs_manual_crawl ?? 50),
    maxManualCrawlsPerDay: Number(r.max_manual_crawls_per_day ?? 5),
    dailyRecommendLimit: Number(r.daily_recommend_limit ?? 10),
    manualCrawlPositions: (r.manual_crawl_positions as string[]) ?? [],
    manualCrawlCities: (r.manual_crawl_cities as string[]) ?? [],
    manualCrawlSalaryMin: r.manual_crawl_salary_min != null ? Number(r.manual_crawl_salary_min) : undefined,
    manualCrawlSalaryMax: r.manual_crawl_salary_max != null ? Number(r.manual_crawl_salary_max) : undefined,
    resumeSummary: (r.resume_summary as string) || undefined,
    lastCrawlAt:
      ((r.last_crawl_at as Date)?.toISOString?.() ?? (r.last_crawl_at as string)) || undefined,
    updatedAt: (r.updated_at as Date)?.toISOString?.() ?? (r.updated_at as string),
  }
}

export async function getJobPreference(userId: string): Promise<JobPreference> {
  if (!isPgEnabled()) {
    const found = loadJsonDb().jobPreferences?.find((p) => p.userId === userId)
    return found ?? DEFAULT_PREF(userId)
  }
  const db = getSql()
  const rows = await db`SELECT * FROM job_preferences WHERE user_id = ${userId}`
  return rows[0] ? mapPrefRow(rows[0] as Record<string, unknown>) : DEFAULT_PREF(userId)
}

export async function upsertJobPreference(
  userId: string,
  input: Partial<Omit<JobPreference, 'userId' | 'updatedAt' | 'lastCrawlAt'>>,
): Promise<JobPreference> {
  const existing = await getJobPreference(userId)
  const merged: JobPreference = {
    ...existing,
    ...input,
    userId,
    updatedAt: new Date().toISOString(),
  }

  if (!isPgEnabled()) {
    const prefs = loadJsonDb().jobPreferences ?? []
    saveJsonPrefs([merged, ...prefs.filter((p) => p.userId !== userId)])
    return merged
  }

  const db = getSql()
  await db`
    INSERT INTO job_preferences (
      user_id, target_companies, target_cities, target_positions,
      salary_min, salary_max, exclude_keywords, daily_apply_limit,
      auto_apply_mode, max_jobs_auto_crawl, max_jobs_manual_crawl,
      max_manual_crawls_per_day, daily_recommend_limit,
      manual_crawl_positions, manual_crawl_cities,
      manual_crawl_salary_min, manual_crawl_salary_max,
      resume_summary, updated_at
    ) VALUES (
      ${userId}, ${db.json(merged.targetCompanies)}, ${db.json(merged.targetCities)},
      ${db.json(merged.targetPositions)}, ${merged.salaryMin ?? null}, ${merged.salaryMax ?? null},
      ${db.json(merged.excludeKeywords)}, ${merged.dailyApplyLimit}, ${merged.autoApplyMode},
      ${merged.maxJobsAutoCrawl}, ${merged.maxJobsManualCrawl}, ${merged.maxManualCrawlsPerDay},
      ${merged.dailyRecommendLimit},
      ${db.json(merged.manualCrawlPositions ?? [])}, ${db.json(merged.manualCrawlCities ?? [])},
      ${merged.manualCrawlSalaryMin ?? null}, ${merged.manualCrawlSalaryMax ?? null},
      ${merged.resumeSummary ?? ''}, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      target_companies = EXCLUDED.target_companies,
      target_cities = EXCLUDED.target_cities,
      target_positions = EXCLUDED.target_positions,
      salary_min = EXCLUDED.salary_min,
      salary_max = EXCLUDED.salary_max,
      exclude_keywords = EXCLUDED.exclude_keywords,
      daily_apply_limit = EXCLUDED.daily_apply_limit,
      auto_apply_mode = EXCLUDED.auto_apply_mode,
      max_jobs_auto_crawl = EXCLUDED.max_jobs_auto_crawl,
      max_jobs_manual_crawl = EXCLUDED.max_jobs_manual_crawl,
      max_manual_crawls_per_day = EXCLUDED.max_manual_crawls_per_day,
      daily_recommend_limit = EXCLUDED.daily_recommend_limit,
      manual_crawl_positions = EXCLUDED.manual_crawl_positions,
      manual_crawl_cities = EXCLUDED.manual_crawl_cities,
      manual_crawl_salary_min = EXCLUDED.manual_crawl_salary_min,
      manual_crawl_salary_max = EXCLUDED.manual_crawl_salary_max,
      resume_summary = EXCLUDED.resume_summary,
      updated_at = NOW()
  `
  return getJobPreference(userId)
}

export async function touchLastCrawl(userId: string) {
  if (!isPgEnabled()) {
    const pref = await getJobPreference(userId)
    const prefs = loadJsonDb().jobPreferences ?? []
    const updated = { ...pref, lastCrawlAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    saveJsonPrefs([updated, ...prefs.filter((p) => p.userId !== userId)])
    return
  }
  await upsertJobPreference(userId, {})
  const db = getSql()
  await db`UPDATE job_preferences SET last_crawl_at = NOW(), updated_at = NOW() WHERE user_id = ${userId}`
}

export async function listUsersDueForCrawl(intervalHours = 24): Promise<string[]> {
  if (!isPgEnabled()) {
    return (loadJsonDb().jobPreferences ?? []).map((p) => p.userId)
  }
  const db = getSql()
  const rows = await db<{ user_id: string }[]>`
    SELECT user_id FROM job_preferences
    WHERE last_crawl_at IS NULL
       OR last_crawl_at < NOW() - (${intervalHours} || ' hours')::interval
  `
  return rows.map((r) => r.user_id)
}

export async function listAllJobPreferences(): Promise<JobPreference[]> {
  if (!isPgEnabled()) return loadJsonDb().jobPreferences ?? []
  const db = getSql()
  const rows = await db`SELECT * FROM job_preferences`
  return rows.map((r) => mapPrefRow(r as Record<string, unknown>))
}

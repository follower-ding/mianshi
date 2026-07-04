import { readFileSync, existsSync } from 'node:fs'

import { dirname, join } from 'node:path'

import { fileURLToPath } from 'node:url'

import seed from '../../data/seed.json' with { type: 'json' }

import seedExtra from '../../data/seed-extra.json' with { type: 'json' }
import seedExtra2 from '../../data/seed-extra2.json' with { type: 'json' }
import seedExtra3 from '../../data/seed-extra3.json' with { type: 'json' }

import { runMigrations, getSql, isPgEnabled } from './client.js'

import { ensureAdminUser } from '../services/auth.js'

import { ensureDefaultPromptVariants } from '../services/store.js'
import { seedJobsIfEmpty } from '../services/jobs-store.js'



const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_JSON = join(__dirname, '../../data/db.json')



type SeedQuestion = Record<string, unknown>



function allSeedQuestions(): SeedQuestion[] {

  const main = (seed as { questions: SeedQuestion[] }).questions

  const extra = (seedExtra as { questions: SeedQuestion[] }).questions
  const extra2 = (seedExtra2 as { questions: SeedQuestion[] }).questions
  const extra3 = (seedExtra3 as { questions: SeedQuestion[] }).questions

  return [...main, ...extra, ...extra2, ...extra3]

}



export async function initDatabase() {

  if (!isPgEnabled()) {

    console.log('[DB] PostgreSQL not configured, using JSON file storage')

    return

  }



  await runMigrations()
  await applySchemaPatches()

  await ensureDefaultPromptVariants()

  await seedFromJsonIfEmpty()

  await upsertMissingSeedQuestions()

  await seedJobsIfEmpty()

  await ensureAdminUser()

  console.log('[DB] PostgreSQL ready')

}



async function insertQuestion(db: ReturnType<typeof getSql>, q: SeedQuestion) {

  await db`

    INSERT INTO questions (

      id, title, category, difficulty, tags, content, views, position, type, status,

      reference_answer, key_points, scoring_rubric, follow_up_templates, created_at

    ) VALUES (

      ${q.id as string}, ${q.title as string}, ${q.category as string}, ${q.difficulty as string},

      ${db.json(q.tags as string[])}, ${q.content as string}, ${(q.views as number) ?? 0},

      ${db.json((q.position as string[]) ?? [])}, ${(q.type as string) ?? '基础'},

      ${(q.status as string) ?? 'published'}, ${(q.referenceAnswer as string) ?? ''},

      ${db.json((q.keyPoints as string[]) ?? [])}, ${(q.scoringRubric as string) ?? ''},

      ${db.json((q.followUpTemplates as string[]) ?? [])}, ${(q.createdAt as string) ?? new Date().toISOString()}

    ) ON CONFLICT (id) DO NOTHING

  `

}



async function applySchemaPatches() {
  const db = getSql()
  await db`ALTER TABLE experiences ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'`
  await db`ALTER TABLE experiences ADD COLUMN IF NOT EXISTS source_report_id TEXT`
  await db`ALTER TABLE experiences ADD COLUMN IF NOT EXISTS source_type TEXT`
  await db`ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_question_id TEXT`
  await db`ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_category TEXT`
  await db`ALTER TABLE reports ADD COLUMN IF NOT EXISTS application_id TEXT`
  await db`CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status)`

  await db`
    CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      position TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      salary TEXT NOT NULL DEFAULT '',
      experience TEXT NOT NULL DEFAULT '不限',
      education TEXT NOT NULL DEFAULT '本科',
      jd TEXT NOT NULL DEFAULT '',
      tags JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'applied',
      greeting TEXT NOT NULL DEFAULT '',
      resume_summary TEXT NOT NULL DEFAULT '',
      session_id TEXT,
      report_id TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status)`
  await db`CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id)`

  await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'`
  await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_id TEXT`
  await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_url TEXT`
  await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS crawled_at TIMESTAMPTZ`
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_boss_external ON job_postings(source, external_id) WHERE external_id IS NOT NULL`

  await db`
    CREATE TABLE IF NOT EXISTS job_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      target_companies JSONB NOT NULL DEFAULT '[]',
      target_cities JSONB NOT NULL DEFAULT '[]',
      target_positions JSONB NOT NULL DEFAULT '[]',
      salary_min INTEGER,
      salary_max INTEGER,
      exclude_keywords JSONB NOT NULL DEFAULT '[]',
      daily_apply_limit INTEGER NOT NULL DEFAULT 10,
      auto_apply_mode TEXT NOT NULL DEFAULT 'review',
      resume_summary TEXT NOT NULL DEFAULT '',
      last_crawl_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await db`
    CREATE TABLE IF NOT EXISTS job_matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
      score INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'C',
      reasons JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending_review',
      suggested_greeting TEXT NOT NULL DEFAULT '',
      matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(user_id, score DESC)`

  await db`
    CREATE TABLE IF NOT EXISTS crawl_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'boss',
      query TEXT NOT NULL DEFAULT '',
      jobs_found INTEGER NOT NULL DEFAULT 0,
      jobs_new INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running',
      error TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )
  `
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS max_jobs_auto_crawl INTEGER NOT NULL DEFAULT 30`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS max_jobs_manual_crawl INTEGER NOT NULL DEFAULT 50`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS max_manual_crawls_per_day INTEGER NOT NULL DEFAULT 5`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS daily_recommend_limit INTEGER NOT NULL DEFAULT 10`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS manual_crawl_positions JSONB NOT NULL DEFAULT '[]'`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS manual_crawl_cities JSONB NOT NULL DEFAULT '[]'`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS manual_crawl_salary_min INTEGER`
  await db`ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS manual_crawl_salary_max INTEGER`
  await db`ALTER TABLE crawl_runs ADD COLUMN IF NOT EXISTS trigger TEXT NOT NULL DEFAULT 'manual'`

  await db`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS boss_meta JSONB NOT NULL DEFAULT '{}'`
  await db`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS boss_apply_status TEXT NOT NULL DEFAULT 'pending'`
  await db`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS boss_apply_error TEXT NOT NULL DEFAULT ''`
  await db`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS boss_reply_snippet TEXT NOT NULL DEFAULT ''`
  await db`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS boss_synced_at TIMESTAMPTZ`

  await db`
    CREATE TABLE IF NOT EXISTS boss_sessions (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      cookie_data TEXT NOT NULL,
      boss_uid TEXT,
      boss_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      profile_dir TEXT,
      rebind_reason TEXT,
      last_keepalive_at TIMESTAMPTZ,
      last_validated_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`ALTER TABLE boss_sessions ADD COLUMN IF NOT EXISTS profile_dir TEXT`
  await db`ALTER TABLE boss_sessions ADD COLUMN IF NOT EXISTS rebind_reason TEXT`
  await db`ALTER TABLE boss_sessions ADD COLUMN IF NOT EXISTS last_keepalive_at TIMESTAMPTZ`
  await db`
    CREATE TABLE IF NOT EXISTS boss_bind_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_boss_bind_tokens_user ON boss_bind_tokens(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS job_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT,
      job_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_job_notifications_user ON job_notifications(user_id, read)`

  await db`
    CREATE TABLE IF NOT EXISTS agent_action_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      job_id TEXT,
      application_id TEXT,
      meta JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_agent_logs_user ON agent_action_logs(user_id, created_at DESC)`

  await db`
    CREATE TABLE IF NOT EXISTS boss_chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      boss_job_id TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_boss_chat_user ON boss_chat_messages(user_id, boss_job_id, sent_at)`

  await db`
    CREATE TABLE IF NOT EXISTS boss_connect_sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      cookie_data TEXT,
      boss_uid TEXT,
      boss_name TEXT,
      login_url TEXT,
      error TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      consumed_by_user_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_boss_connect_expires ON boss_connect_sessions(expires_at)`

  await db`
    CREATE TABLE IF NOT EXISTS user_resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '我的简历',
      template_id TEXT NOT NULL DEFAULT 'tech-simple',
      content JSONB NOT NULL DEFAULT '{}',
      raw_text TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      optimized_text TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id)`

  const { migrateUserResumesTable } = await import('../services/resume-store.js')
  await migrateUserResumesTable()

  const { migrateResumeSharesTable } = await import('../services/resume-share-store.js')
  await migrateResumeSharesTable()
}

async function seedFromJsonIfEmpty() {

  const db = getSql()

  const rows = await db<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM questions`

  if (Number(rows[0]?.count) > 0) return



  const source = existsSync(DB_JSON)

    ? (JSON.parse(readFileSync(DB_JSON, 'utf-8')) as { questions: SeedQuestion[]; experiences: unknown[] })

    : (seed as { questions: SeedQuestion[]; experiences: unknown[] })



  for (const q of source.questions) {

    await insertQuestion(db, q)

  }



  for (const e of source.experiences as Record<string, unknown>[]) {

    await db`

      INSERT INTO experiences (

        id, company, position, result, rounds, author, date, summary, content, created_at

      ) VALUES (

        ${e.id as string}, ${e.company as string}, ${e.position as string}, ${e.result as string},

        ${e.rounds as number}, ${e.author as string}, ${e.date as string},

        ${e.summary as string}, ${e.content as string}, ${(e.createdAt as string) ?? new Date().toISOString()}

      ) ON CONFLICT (id) DO NOTHING

    `

  }



  console.log('[DB] Seeded questions and experiences from JSON')

}



async function upsertMissingSeedQuestions() {

  const db = getSql()

  const existing = await db<{ id: string }[]>`SELECT id FROM questions`

  const existingIds = new Set(existing.map((r) => r.id))

  let added = 0



  for (const q of allSeedQuestions()) {

    if (existingIds.has(q.id as string)) continue

    await insertQuestion(db, q)

    added++

  }



  if (added > 0) console.log(`[DB] Upserted ${added} new seed questions`)

}



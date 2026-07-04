import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSql, isPgEnabled } from '../db/client.js'
import type { ResumeContent, ResumeLayoutConfig, UserResume } from '../types/entities.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

type JsonDb = { userResumes?: UserResume[] }

function loadJsonDb(): JsonDb {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as JsonDb
}

function saveJsonResumes(resumes: UserResume[]) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, userResumes: resumes }, null, 2), 'utf-8')
}

const EMPTY_CONTENT: ResumeContent = {}

function normalizeResume(r: UserResume): UserResume {
  return {
    ...r,
    id: r.id || randomUUID(),
    title: r.title || '我的简历',
    templateId: r.templateId || 'tech-simple',
    content: r.content ?? EMPTY_CONTENT,
    rawText: r.rawText ?? '',
    summary: r.summary ?? '',
    optimizedText: r.optimizedText ?? '',
    layoutConfig: r.layoutConfig ?? {},
  }
}

function mapResumeRow(r: Record<string, unknown>): UserResume {
  return normalizeResume({
    id: (r.id as string) || (r.user_id as string),
    userId: r.user_id as string,
    title: (r.title as string) || '我的简历',
    templateId: (r.template_id as string) || 'tech-simple',
    content: (r.content as ResumeContent) ?? EMPTY_CONTENT,
    rawText: (r.raw_text as string) || '',
    summary: (r.summary as string) || '',
    optimizedText: (r.optimized_text as string) || '',
    layoutConfig: (r.layout_config as ResumeLayoutConfig) ?? {},
    updatedAt: (r.updated_at as Date)?.toISOString?.() ?? (r.updated_at as string),
  })
}

export async function migrateUserResumesTable(): Promise<void> {
  if (!isPgEnabled()) return
  const db = getSql()
  await db`ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS id TEXT`
  await db`ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'`
  await db`UPDATE user_resumes SET id = user_id WHERE id IS NULL`
  await db`CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id)`
  try {
    await db`ALTER TABLE user_resumes DROP CONSTRAINT user_resumes_pkey`
    await db`ALTER TABLE user_resumes ADD PRIMARY KEY (id)`
  } catch {
    /* already migrated */
  }
}

export async function listUserResumes(userId: string): Promise<UserResume[]> {
  if (!isPgEnabled()) {
    return (loadJsonDb().userResumes ?? [])
      .filter((r) => r.userId === userId)
      .map(normalizeResume)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
  const db = getSql()
  const rows = await db`
    SELECT * FROM user_resumes WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `
  return rows.map((r) => mapResumeRow(r as Record<string, unknown>))
}

/** @deprecated 使用 listUserResumes / getResumeById */
export async function getUserResume(userId: string, resumeId?: string): Promise<UserResume | null> {
  if (resumeId) return getResumeById(userId, resumeId)
  const list = await listUserResumes(userId)
  return list[0] ?? null
}

export async function getResumeById(userId: string, resumeId: string): Promise<UserResume | null> {
  if (!isPgEnabled()) {
    const r = loadJsonDb().userResumes?.find((x) => x.userId === userId && x.id === resumeId)
    return r ? normalizeResume(r) : null
  }
  const db = getSql()
  const rows = await db`SELECT * FROM user_resumes WHERE user_id = ${userId} AND id = ${resumeId}`
  return rows[0] ? mapResumeRow(rows[0] as Record<string, unknown>) : null
}

export async function createUserResume(
  userId: string,
  input: Partial<Omit<UserResume, 'id' | 'userId' | 'updatedAt'>> = {},
): Promise<UserResume> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const resume: UserResume = {
    id,
    userId,
    title: input.title ?? '我的简历',
    templateId: input.templateId ?? 'tech-simple',
    content: input.content ?? EMPTY_CONTENT,
    rawText: input.rawText ?? '',
    summary: input.summary ?? '',
    optimizedText: input.optimizedText ?? '',
    layoutConfig: input.layoutConfig ?? {},
    updatedAt: now,
  }

  if (!isPgEnabled()) {
    const resumes = loadJsonDb().userResumes ?? []
    saveJsonResumes([resume, ...resumes])
    return resume
  }

  const db = getSql()
  await db`
    INSERT INTO user_resumes (
      id, user_id, title, template_id, content, raw_text, summary, optimized_text, layout_config, updated_at
    ) VALUES (
      ${id}, ${userId}, ${resume.title}, ${resume.templateId},
      ${db.json(resume.content)}, ${resume.rawText}, ${resume.summary},
      ${resume.optimizedText}, ${db.json(JSON.parse(JSON.stringify(resume.layoutConfig ?? {})))}, NOW()
    )
  `
  return (await getResumeById(userId, id)) ?? resume
}

export async function updateUserResume(
  userId: string,
  resumeId: string,
  input: Partial<Omit<UserResume, 'id' | 'userId' | 'updatedAt'>>,
): Promise<UserResume> {
  const existing = await getResumeById(userId, resumeId)
  if (!existing) throw new Error('简历不存在')

  const merged: UserResume = {
    ...existing,
    title: input.title ?? existing.title,
    templateId: input.templateId ?? existing.templateId,
    content: input.content ?? existing.content,
    rawText: input.rawText ?? existing.rawText,
    summary: input.summary ?? existing.summary,
    optimizedText: input.optimizedText ?? existing.optimizedText,
    layoutConfig: input.layoutConfig ?? existing.layoutConfig ?? {},
    updatedAt: new Date().toISOString(),
  }

  if (!isPgEnabled()) {
    const resumes = loadJsonDb().userResumes ?? []
    saveJsonResumes([
      merged,
      ...resumes.filter((r) => !(r.userId === userId && r.id === resumeId)),
    ])
    return merged
  }

  const db = getSql()
  await db`
    UPDATE user_resumes SET
      title = ${merged.title},
      template_id = ${merged.templateId},
      content = ${db.json(merged.content)},
      raw_text = ${merged.rawText},
      summary = ${merged.summary},
      optimized_text = ${merged.optimizedText},
      layout_config = ${db.json(JSON.parse(JSON.stringify(merged.layoutConfig ?? {})))},
      updated_at = NOW()
    WHERE user_id = ${userId} AND id = ${resumeId}
  `
  return (await getResumeById(userId, resumeId)) ?? merged
}

/** 兼容旧调用 — 更新或创建（按 id） */
export async function upsertUserResume(
  userId: string,
  input: Partial<Omit<UserResume, 'userId' | 'updatedAt'>> & { id?: string },
): Promise<UserResume> {
  if (input.id) {
    const existing = await getResumeById(userId, input.id)
    if (existing) return updateUserResume(userId, input.id, input)
  }
  const list = await listUserResumes(userId)
  if (list.length === 1 && !input.id) {
    return updateUserResume(userId, list[0]!.id, input)
  }
  if (input.id && list.some((r) => r.id === input.id)) {
    return updateUserResume(userId, input.id, input)
  }
  return createUserResume(userId, input)
}

export async function deleteUserResume(userId: string, resumeId: string): Promise<void> {
  const list = await listUserResumes(userId)
  if (list.length <= 1) throw new Error('至少保留一份简历')
  if (!list.some((r) => r.id === resumeId)) throw new Error('简历不存在')

  if (!isPgEnabled()) {
    const resumes = loadJsonDb().userResumes ?? []
    saveJsonResumes(resumes.filter((r) => !(r.userId === userId && r.id === resumeId)))
    return
  }

  const db = getSql()
  await db`DELETE FROM user_resumes WHERE user_id = ${userId} AND id = ${resumeId}`
}

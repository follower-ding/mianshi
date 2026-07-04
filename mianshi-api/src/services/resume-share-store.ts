import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSql, isPgEnabled } from '../db/client.js'
import type { ResumeContent, ResumeLayoutConfig } from '../types/entities.js'
import { sanitizeResumeContentForShare } from './sanitize-resume-content.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

export type ResumeShareSnapshot = {
  token: string
  userId: string
  resumeId: string
  title: string
  templateId: string
  content: ResumeContent
  layoutConfig: ResumeLayoutConfig
  createdAt: string
  expiresAt?: string
}

type JsonDb = { resumeShares?: ResumeShareSnapshot[] }

function loadJsonDb(): JsonDb {
  if (!existsSync(DB_PATH)) return {}
  return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as JsonDb
}

function saveJsonShares(shares: ResumeShareSnapshot[]) {
  const full = existsSync(DB_PATH)
    ? (JSON.parse(readFileSync(DB_PATH, 'utf-8')) as Record<string, unknown>)
    : {}
  writeFileSync(DB_PATH, JSON.stringify({ ...full, resumeShares: shares }, null, 2), 'utf-8')
}

function newToken(): string {
  return randomBytes(16).toString('hex')
}

function mapShareRow(r: Record<string, unknown>): ResumeShareSnapshot {
  return {
    token: r.token as string,
    userId: r.user_id as string,
    resumeId: r.resume_id as string,
    title: (r.title as string) || '我的简历',
    templateId: (r.template_id as string) || 'tech-simple',
    content: (r.content as ResumeContent) ?? {},
    layoutConfig: (r.layout_config as ResumeLayoutConfig) ?? {},
    createdAt: (r.created_at as Date)?.toISOString?.() ?? (r.created_at as string),
    expiresAt: r.expires_at
      ? ((r.expires_at as Date)?.toISOString?.() ?? (r.expires_at as string))
      : undefined,
  }
}

function isExpired(share: ResumeShareSnapshot): boolean {
  if (!share.expiresAt) return false
  return new Date(share.expiresAt).getTime() < Date.now()
}

export async function migrateResumeSharesTable(): Promise<void> {
  if (!isPgEnabled()) return
  const db = getSql()
  await db`
    CREATE TABLE IF NOT EXISTS resume_shares (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resume_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '我的简历',
      template_id TEXT NOT NULL DEFAULT 'tech-simple',
      content JSONB NOT NULL DEFAULT '{}',
      layout_config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_resume_shares_user_resume ON resume_shares(user_id, resume_id)`
}

export async function createResumeShare(input: {
  userId: string
  resumeId: string
  title: string
  templateId: string
  content: ResumeContent
  layoutConfig?: ResumeLayoutConfig
  /** 有效天数；null/undefined 默认 30 天；传 null 显式表示永不过期需前端传 -1 我们处理 */
  expiresInDays?: number | null
}): Promise<ResumeShareSnapshot> {
  const days =
    input.expiresInDays === null || input.expiresInDays === 0
      ? null
      : input.expiresInDays === undefined
        ? 30
        : input.expiresInDays
  const expiresAt = days === null ? undefined : new Date(Date.now() + days * 86400_000).toISOString()

  const snapshot: ResumeShareSnapshot = {
    token: newToken(),
    userId: input.userId,
    resumeId: input.resumeId,
    title: input.title,
    templateId: input.templateId,
    content: sanitizeResumeContentForShare(input.content),
    layoutConfig: input.layoutConfig ?? {},
    createdAt: new Date().toISOString(),
    expiresAt,
  }

  if (!isPgEnabled()) {
    const shares = loadJsonDb().resumeShares ?? []
    const withoutOld = shares.filter(
      (s) => !(s.userId === input.userId && s.resumeId === input.resumeId),
    )
    saveJsonShares([snapshot, ...withoutOld])
    return snapshot
  }

  const db = getSql()
  await db`
    DELETE FROM resume_shares
    WHERE user_id = ${input.userId} AND resume_id = ${input.resumeId}
  `
  await db`
    INSERT INTO resume_shares (
      token, user_id, resume_id, title, template_id, content, layout_config, created_at, expires_at
    ) VALUES (
      ${snapshot.token},
      ${snapshot.userId},
      ${snapshot.resumeId},
      ${snapshot.title},
      ${snapshot.templateId},
      ${JSON.parse(JSON.stringify(snapshot.content))},
      ${JSON.parse(JSON.stringify(snapshot.layoutConfig))},
      ${snapshot.createdAt},
      ${snapshot.expiresAt ?? null}
    )
  `
  return snapshot
}

export async function lookupResumeShareByToken(token: string): Promise<ResumeShareSnapshot | null> {
  if (!isPgEnabled()) {
    return loadJsonDb().resumeShares?.find((s) => s.token === token) ?? null
  }
  const db = getSql()
  const rows = await db`SELECT * FROM resume_shares WHERE token = ${token}`
  if (!rows[0]) return null
  return mapShareRow(rows[0] as Record<string, unknown>)
}

export async function getResumeShareByToken(token: string): Promise<ResumeShareSnapshot | null> {
  if (!isPgEnabled()) {
    const share = loadJsonDb().resumeShares?.find((s) => s.token === token) ?? null
    if (!share || isExpired(share)) return null
    return share
  }
  const db = getSql()
  const rows = await db`SELECT * FROM resume_shares WHERE token = ${token}`
  if (!rows[0]) return null
  const share = mapShareRow(rows[0] as Record<string, unknown>)
  if (isExpired(share)) return null
  return share
}

export async function getResumeShareForUser(
  userId: string,
  resumeId: string,
): Promise<ResumeShareSnapshot | null> {
  if (!isPgEnabled()) {
    const share =
      loadJsonDb().resumeShares?.find((s) => s.userId === userId && s.resumeId === resumeId) ?? null
    if (!share || isExpired(share)) return null
    return share
  }
  const db = getSql()
  const rows = await db`
    SELECT * FROM resume_shares
    WHERE user_id = ${userId} AND resume_id = ${resumeId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (!rows[0]) return null
  const share = mapShareRow(rows[0] as Record<string, unknown>)
  if (isExpired(share)) return null
  return share
}

export async function revokeResumeShare(userId: string, resumeId: string): Promise<boolean> {
  if (!isPgEnabled()) {
    const shares = loadJsonDb().resumeShares ?? []
    const next = shares.filter((s) => !(s.userId === userId && s.resumeId === resumeId))
    if (next.length === shares.length) return false
    saveJsonShares(next)
    return true
  }
  const db = getSql()
  const rows = await db`
    DELETE FROM resume_shares
    WHERE user_id = ${userId} AND resume_id = ${resumeId}
    RETURNING token
  `
  return rows.length > 0
}

export type ResumeShareAdminItem = {
  token: string
  userId: string
  resumeId: string
  title: string
  createdAt: string
  expiresAt?: string
  expired: boolean
}

export async function listAllResumeSharesAdmin(): Promise<ResumeShareAdminItem[]> {
  if (!isPgEnabled()) {
    const shares = loadJsonDb().resumeShares ?? []
    return shares
      .map((s) => ({
        token: s.token,
        userId: s.userId,
        resumeId: s.resumeId,
        title: s.title,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        expired: isExpired(s),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const db = getSql()
  const rows = await db`SELECT * FROM resume_shares ORDER BY created_at DESC`
  return rows.map((r) => {
    const share = mapShareRow(r as Record<string, unknown>)
    return {
      token: share.token,
      userId: share.userId,
      resumeId: share.resumeId,
      title: share.title,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      expired: isExpired(share),
    }
  })
}

export async function revokeShareByToken(token: string): Promise<boolean> {
  if (!isPgEnabled()) {
    const shares = loadJsonDb().resumeShares ?? []
    const next = shares.filter((s) => s.token !== token)
    if (next.length === shares.length) return false
    saveJsonShares(next)
    return true
  }
  const db = getSql()
  const rows = await db`DELETE FROM resume_shares WHERE token = ${token} RETURNING token`
  return rows.length > 0
}

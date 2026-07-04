import { getSql, isPgEnabled } from '../db/client.js'
import { newId } from './store-json.js'
import { decryptSecret, encryptSecret } from './boss-crypto.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/db.json')

export type BossSessionRecord = {
  userId: string
  cookieHeader: string
  bossUid?: string
  bossName?: string
  status: 'active' | 'expired' | 'invalid' | 'need_rebind'
  profileDir?: string
  rebindReason?: string
  lastKeepaliveAt?: string
  lastValidatedAt?: string
  updatedAt: string
}

export type BossBindToken = {
  token: string
  userId: string
  expiresAt: string
}

type JsonDb = {
  bossSessions?: BossSessionRecord[]
  bossBindTokens?: BossBindToken[]
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

function mapSessionRow(r: Record<string, unknown>): BossSessionRecord {
  let cookieHeader = ''
  try {
    cookieHeader = decryptSecret(r.cookie_data as string)
  } catch {
    cookieHeader = ''
  }
  return {
    userId: r.user_id as string,
    cookieHeader,
    bossUid: (r.boss_uid as string) || undefined,
    bossName: (r.boss_name as string) || undefined,
    status: (r.status as BossSessionRecord['status']) ?? 'active',
    profileDir: (r.profile_dir as string) || undefined,
    rebindReason: (r.rebind_reason as string) || undefined,
    lastKeepaliveAt:
      ((r.last_keepalive_at as Date)?.toISOString?.() ?? (r.last_keepalive_at as string)) || undefined,
    lastValidatedAt:
      ((r.last_validated_at as Date)?.toISOString?.() ?? (r.last_validated_at as string)) || undefined,
    updatedAt: (r.updated_at as Date)?.toISOString?.() ?? (r.updated_at as string),
  }
}

export async function getBossSession(userId: string): Promise<BossSessionRecord | null> {
  if (!isPgEnabled()) {
    const row = loadJsonDb().bossSessions?.find((s) => s.userId === userId)
    return row?.cookieHeader ? row : null
  }
  const db = getSql()
  const rows = await db`SELECT * FROM boss_sessions WHERE user_id = ${userId}`
  if (!rows[0]) return null
  const s = mapSessionRow(rows[0] as Record<string, unknown>)
  return s.cookieHeader ? s : null
}

export async function saveBossSession(
  userId: string,
  cookieHeader: string,
  meta?: {
    bossUid?: string
    bossName?: string
    status?: BossSessionRecord['status']
    profileDir?: string
  },
) {
  const encrypted = encryptSecret(cookieHeader.trim())
  const status = meta?.status ?? 'active'
  const now = new Date().toISOString()

  if (!isPgEnabled()) {
    const sessions = loadJsonDb().bossSessions ?? []
    const record: BossSessionRecord = {
      userId,
      cookieHeader: cookieHeader.trim(),
      bossUid: meta?.bossUid,
      bossName: meta?.bossName,
      status,
      profileDir: meta?.profileDir,
      lastValidatedAt: now,
      updatedAt: now,
    }
    saveJsonDb({ bossSessions: [record, ...sessions.filter((s) => s.userId !== userId)] })
    return record
  }

  const db = getSql()
  await db`
    INSERT INTO boss_sessions (user_id, cookie_data, boss_uid, boss_name, status, profile_dir, last_validated_at, updated_at)
    VALUES (${userId}, ${encrypted}, ${meta?.bossUid ?? null}, ${meta?.bossName ?? null}, ${status}, ${meta?.profileDir ?? null}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      cookie_data = EXCLUDED.cookie_data,
      boss_uid = EXCLUDED.boss_uid,
      boss_name = EXCLUDED.boss_name,
      status = EXCLUDED.status,
      profile_dir = COALESCE(EXCLUDED.profile_dir, boss_sessions.profile_dir),
      rebind_reason = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE boss_sessions.rebind_reason END,
      last_validated_at = NOW(),
      updated_at = NOW()
  `
  return (await getBossSession(userId))!
}

export async function updateBossSessionProfile(userId: string, profileDir: string) {
  if (!isPgEnabled()) {
    const sessions = loadJsonDb().bossSessions ?? []
    saveJsonDb({
      bossSessions: sessions.map((s) =>
        s.userId === userId ? { ...s, profileDir, status: 'active' as const, updatedAt: new Date().toISOString() } : s,
      ),
    })
    return
  }
  const db = getSql()
  await db`
    UPDATE boss_sessions SET profile_dir = ${profileDir}, status = 'active', rebind_reason = NULL, updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function markBossNeedRebind(userId: string, reason: string) {
  if (!isPgEnabled()) {
    const sessions = loadJsonDb().bossSessions ?? []
    saveJsonDb({
      bossSessions: sessions.map((s) =>
        s.userId === userId
          ? { ...s, status: 'need_rebind' as const, rebindReason: reason, updatedAt: new Date().toISOString() }
          : s,
      ),
    })
    return
  }
  const db = getSql()
  await db`
    UPDATE boss_sessions SET status = 'need_rebind', rebind_reason = ${reason.slice(0, 500)}, updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function updateBossSessionStatus(
  userId: string,
  status: BossSessionRecord['status'],
  meta?: { bossUid?: string; bossName?: string },
) {
  if (!isPgEnabled()) {
    const sessions = loadJsonDb().bossSessions ?? []
    saveJsonDb({
      bossSessions: sessions.map((s) =>
        s.userId === userId
          ? { ...s, status, ...meta, lastValidatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : s,
      ),
    })
    return
  }
  const db = getSql()
  await db`
    UPDATE boss_sessions SET
      status = ${status},
      boss_uid = COALESCE(${meta?.bossUid ?? null}, boss_uid),
      boss_name = COALESCE(${meta?.bossName ?? null}, boss_name),
      last_validated_at = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function deleteBossSession(userId: string) {
  if (!isPgEnabled()) {
    saveJsonDb({ bossSessions: (loadJsonDb().bossSessions ?? []).filter((s) => s.userId !== userId) })
    return
  }
  const db = getSql()
  await db`DELETE FROM boss_sessions WHERE user_id = ${userId}`
}

export async function createBossBindToken(userId: string, ttlHours = 72): Promise<BossBindToken> {
  const token = newId('bind')
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString()

  if (!isPgEnabled()) {
    const tokens = loadJsonDb().bossBindTokens ?? []
    const item = { token, userId, expiresAt }
    saveJsonDb({ bossBindTokens: [item, ...tokens.filter((t) => t.userId !== userId)] })
    return item
  }

  const db = getSql()
  await db`DELETE FROM boss_bind_tokens WHERE user_id = ${userId} AND expires_at < NOW()`
  await db`
    INSERT INTO boss_bind_tokens (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt})
  `
  return { token, userId, expiresAt }
}

export async function resolveBossBindToken(token: string): Promise<string | null> {
  if (!isPgEnabled()) {
    const item = loadJsonDb().bossBindTokens?.find((t) => t.token === token)
    if (!item || new Date(item.expiresAt) < new Date()) return null
    return item.userId
  }
  const db = getSql()
  const rows = await db`
    SELECT user_id FROM boss_bind_tokens
    WHERE token = ${token} AND expires_at > NOW()
  `
  return rows[0]?.user_id as string | null
}

export async function listUsersWithBossSession(): Promise<string[]> {
  if (!isPgEnabled()) {
    return (loadJsonDb().bossSessions ?? [])
      .filter((s) => s.status === 'active')
      .map((s) => s.userId)
  }
  const db = getSql()
  const rows = await db<{ user_id: string }[]>`
    SELECT user_id FROM boss_sessions
    WHERE status = 'active' AND profile_dir IS NOT NULL AND profile_dir <> ''
  `
  return rows.map((r) => r.user_id)
}

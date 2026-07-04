import { getSql, isPgEnabled } from '../db/client.js'
import { encryptSecret, decryptSecret } from './boss-crypto.js'
import { newId } from './store-json.js'

export type BossConnectSession = {
  id: string
  status: 'pending' | 'waiting_scan' | 'success' | 'failed' | 'expired'
  cookieHeader?: string
  bossUid?: string
  bossName?: string
  qrImageBase64?: string
  loginUrl?: string
  error?: string
  userId?: string
  consumedByUserId?: string
  createdAt: number
  expiresAt: number
}

const TTL_MS = 30 * 60 * 1000

/** QR 截图体积大，仅内存缓存；DB 存绑定结果与状态 */
const qrCache = new Map<string, string>()
const memorySessions = new Map<string, BossConnectSession>()

function cleanupMemory() {
  const now = Date.now()
  for (const [id, s] of memorySessions) {
    if (s.expiresAt < now) {
      memorySessions.delete(id)
      qrCache.delete(id)
    }
  }
}

function rowToSession(r: Record<string, unknown>): BossConnectSession {
  let cookieHeader: string | undefined
  const rawCookie = r.cookie_data as string | null
  if (rawCookie) {
    try {
      cookieHeader = decryptSecret(rawCookie)
    } catch {
      cookieHeader = undefined
    }
  }
  const id = r.id as string
  return {
    id,
    status: r.status as BossConnectSession['status'],
    cookieHeader,
    bossUid: (r.boss_uid as string) || undefined,
    bossName: (r.boss_name as string) || undefined,
    qrImageBase64: qrCache.get(id),
    loginUrl: (r.login_url as string) || undefined,
    error: (r.error as string) || undefined,
    userId: (r.user_id as string) || undefined,
    consumedByUserId: (r.consumed_by_user_id as string) || undefined,
    createdAt: new Date(r.created_at as string | Date).getTime(),
    expiresAt: new Date(r.expires_at as string | Date).getTime(),
  }
}

export async function createBossConnectSession(userId?: string): Promise<BossConnectSession> {
  cleanupMemory()
  const id = newId('bconn')
  const now = Date.now()
  const session: BossConnectSession = {
    id,
    status: 'pending',
    createdAt: now,
    expiresAt: now + TTL_MS,
    loginUrl: 'https://www.zhipin.com/web/user/?ka=header-login',
    userId,
  }

  const loginUrl = session.loginUrl ?? 'https://www.zhipin.com/web/user/?ka=header-login'
  if (isPgEnabled()) {
    const db = getSql()
    await db`
      INSERT INTO boss_connect_sessions (
        id, status, login_url, user_id, created_at, expires_at
      ) VALUES (
        ${id}, ${session.status}, ${loginUrl}, ${userId ?? null},
        ${new Date(now).toISOString()}, ${new Date(session.expiresAt).toISOString()}
      )
    `
  } else {
    memorySessions.set(id, session)
  }
  return session
}

export async function getBossConnectSession(id: string): Promise<BossConnectSession | null> {
  cleanupMemory()
  const now = Date.now()

  if (isPgEnabled()) {
    const db = getSql()
    const rows = await db`
      SELECT * FROM boss_connect_sessions
      WHERE id = ${id} AND expires_at > ${new Date(now).toISOString()}
    `
    if (!rows[0]) return null
    return rowToSession(rows[0] as Record<string, unknown>)
  }

  const s = memorySessions.get(id)
  if (!s || s.expiresAt < now) {
    memorySessions.delete(id)
    qrCache.delete(id)
    return null
  }
  return { ...s, qrImageBase64: qrCache.get(id) ?? s.qrImageBase64 }
}

export async function updateBossConnectSession(id: string, patch: Partial<BossConnectSession>) {
  const current = await getBossConnectSession(id)
  if (!current) return null

  if (patch.qrImageBase64 !== undefined) {
    if (patch.qrImageBase64) qrCache.set(id, patch.qrImageBase64)
    else qrCache.delete(id)
  }

  const merged: BossConnectSession = {
    ...current,
    ...patch,
    qrImageBase64: qrCache.get(id) ?? patch.qrImageBase64 ?? current.qrImageBase64,
  }

  if (isPgEnabled()) {
    const db = getSql()
    await db`
      UPDATE boss_connect_sessions SET
        status = ${merged.status},
        boss_uid = ${merged.bossUid ?? null},
        boss_name = ${merged.bossName ?? null},
        error = ${merged.error ?? null},
        user_id = COALESCE(${patch.userId ?? null}, user_id),
        consumed_by_user_id = ${merged.consumedByUserId ?? null},
        cookie_data = ${merged.cookieHeader ? encryptSecret(merged.cookieHeader) : null}
      WHERE id = ${id}
    `
  } else {
    memorySessions.set(id, merged)
  }
  return merged
}

/** 读取 connect 成功后的 Cookie，不删除；登录/complete 失败可重试 */
export async function peekBossConnectCookies(
  id: string,
  userId?: string,
): Promise<{ cookieHeader: string; bossName?: string; bossUid?: string } | null> {
  const s = await getBossConnectSession(id)
  if (!s || s.status !== 'success' || !s.cookieHeader) return null
  if (s.consumedByUserId && userId && s.consumedByUserId !== userId) return null
  if (s.consumedByUserId && !userId) return null
  return { cookieHeader: s.cookieHeader, bossName: s.bossName, bossUid: s.bossUid }
}

/** @deprecated use peek + markBossConnectConsumed */
export async function claimBossConnectCookies(
  id: string,
  userId?: string,
): Promise<{ cookieHeader: string; bossName?: string; bossUid?: string } | null> {
  return peekBossConnectCookies(id, userId)
}

export async function markBossConnectConsumed(id: string, userId: string) {
  await updateBossConnectSession(id, { consumedByUserId: userId })
}

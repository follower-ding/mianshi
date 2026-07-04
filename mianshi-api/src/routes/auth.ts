import { Hono } from 'hono'
import { registerSchema, loginSchema } from '../schemas/index.js'
import { loginUser, registerUser } from '../services/auth.js'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import { isPgEnabled } from '../db/client.js'
import { saveBossSession, updateBossSessionProfile } from '../services/boss-session-store.js'
import { initPersistentProfile } from '../services/boss-persistent-profile.js'
import { testBossSession } from '../services/boss-client.js'
import { upsertJobPreference } from '../services/job-preferences-store.js'
import { markBossConnectConsumed, peekBossConnectCookies } from '../services/boss-connect-store.js'

// Rate limiting for auth endpoints: max 10 attempts per IP per minute
const authRateMap = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT = 10
const AUTH_RATE_WINDOW_MS = 60_000

function checkAuthRate(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  const now = Date.now()
  const entry = authRateMap.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= AUTH_RATE_LIMIT) return false
    entry.count++
  } else {
    authRateMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS })
  }
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of authRateMap) {
    if (now >= entry.resetAt) authRateMap.delete(ip)
  }
}, 120_000)

async function bindBossOnAuth(
  userId: string,
  opts?: { bossCookie?: string; bossConnectId?: string },
) {
  let cookie = opts?.bossCookie?.trim()
  if (!cookie && opts?.bossConnectId) {
    const claimed = await peekBossConnectCookies(opts.bossConnectId, userId)
    if (claimed) cookie = claimed.cookieHeader
  }
  if (!cookie) return { bossBound: false as const }
  const check = await testBossSession(cookie)
  if (!check.valid) return { bossBound: false as const, bossError: check.message }
  await saveBossSession(userId, cookie, {
    bossUid: check.uid,
    bossName: check.name,
    status: 'active',
  })
  let profileDir: string | undefined
  try {
    profileDir = await initPersistentProfile(userId, cookie)
    await updateBossSessionProfile(userId, profileDir)
  } catch (e) {
    console.warn('[bindBoss] persistent profile init failed:', e)
  }
  await upsertJobPreference(userId, {})
  if (opts?.bossConnectId) {
    await markBossConnectConsumed(opts.bossConnectId, userId)
  }
  return { bossBound: true as const, bossName: check.name, profileDir }
}

export const authRoutes = new Hono<{ Variables: AuthVariables }>()

authRoutes.use('*', authMiddleware)

authRoutes.get('/status', (c) => {
  return c.json({ enabled: isPgEnabled(), user: c.get('user') })
})

authRoutes.post('/register', async (c) => {
  if (!checkAuthRate(c)) return c.json({ error: '请求过于频繁，请稍后再试' }, 429)
  if (!isPgEnabled()) return c.json({ error: 'Auth requires PostgreSQL' }, 503)
  const body = registerSchema.parse(await c.req.json())
  const { bossCookie, bossConnectId, ...reg } = body
  const result = await registerUser(reg)
  const boss = await bindBossOnAuth(result.user.id, { bossCookie, bossConnectId })
  return c.json({ ...result, ...boss }, 201)
})

authRoutes.post('/login', async (c) => {
  if (!checkAuthRate(c)) return c.json({ error: '请求过于频繁，请稍后再试' }, 429)
  if (!isPgEnabled()) return c.json({ error: 'Auth requires PostgreSQL' }, 503)
  const body = loginSchema.parse(await c.req.json())
  const { bossCookie, bossConnectId, ...cred } = body
  const result = await loginUser(cred)
  const boss = await bindBossOnAuth(result.user.id, { bossCookie, bossConnectId })
  return c.json({ ...result, ...boss })
})

authRoutes.get('/me', (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  return c.json({ user })
})

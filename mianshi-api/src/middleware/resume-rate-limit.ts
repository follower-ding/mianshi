import type { Context, Next } from 'hono'
import type { AuthVariables } from './auth.js'

const rateMap = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 30
const WINDOW_MS = 60_000

function clientKey(c: Context<{ Variables: AuthVariables }>): string {
  const user = c.get('user')
  if (user?.id) return `user:${user.id}`
  return `ip:${c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'}`
}

export async function resumeRateLimit(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const key = clientKey(c)
  const now = Date.now()
  const entry = rateMap.get(key)
  if (entry && now < entry.resetAt) {
    if (entry.count >= LIMIT) {
      return c.json({ error: '操作过于频繁，请稍后再试' }, 429)
    }
    entry.count++
  } else {
    rateMap.set(key, { count: 1, resetAt: now + WINDOW_MS })
  }
  await next()
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateMap) {
    if (now >= entry.resetAt) rateMap.delete(key)
  }
}, 120_000)

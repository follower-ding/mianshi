import { Hono } from 'hono'
import { authMiddleware, optionalUser, requireAuth, type AuthVariables } from '../middleware/auth.js'
import {
  cancelBossConnect,
  completeBossConnectForUser,
  getBossConnectStatus,
  refreshBossConnectQr,
  startBossConnectLogin,
} from '../services/boss-playwright-login.js'
import { syncDrissionLoginStatus } from '../services/boss-drission-login.js'

export const bossConnectRoutes = new Hono<{ Variables: AuthVariables }>()

bossConnectRoutes.post('/start', authMiddleware, async (c) => {
  const user = optionalUser(c)
  const origin = c.req.header('Origin') ?? undefined
  const result = await startBossConnectLogin(user?.id, origin)
  return c.json(result)
})

bossConnectRoutes.get('/:connectId/status', authMiddleware, async (c) => {
  const connectId = c.req.param('connectId') ?? ''
  if (!connectId) return c.json({ error: 'Missing connectId' }, 400)
  return c.json(await getBossConnectStatus(connectId))
})

bossConnectRoutes.post('/:connectId/sync', authMiddleware, async (c) => {
  const connectId = c.req.param('connectId') ?? ''
  if (!connectId) return c.json({ error: 'Missing connectId' }, 400)
  await syncDrissionLoginStatus(connectId)
  return c.json(await getBossConnectStatus(connectId))
})

bossConnectRoutes.post('/:connectId/refresh', authMiddleware, async (c) => {
  const connectId = c.req.param('connectId') ?? ''
  if (!connectId) return c.json({ error: 'Missing connectId' }, 400)
  return c.json(await refreshBossConnectQr(connectId))
})

bossConnectRoutes.post('/:connectId/complete', authMiddleware, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const connectId = c.req.param('connectId')
  if (!connectId) return c.json({ error: 'Missing connectId' }, 400)
  const result = await completeBossConnectForUser(connectId, user.id)
  if (!result.ok) return c.json(result, 400)
  return c.json(result)
})

bossConnectRoutes.delete('/:connectId', authMiddleware, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const connectId = c.req.param('connectId') ?? ''
  if (!connectId) return c.json({ error: 'Missing connectId' }, 400)
  await cancelBossConnect(connectId)
  return c.json({ ok: true })
})

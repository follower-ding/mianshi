import { Hono } from 'hono'
import { getMetrics, getQualityMetrics } from '../services/metrics.js'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'

export const metricsRoutes = new Hono<{ Variables: AuthVariables }>()

metricsRoutes.get('/', authMiddleware, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const detailed = c.req.query('detailed') === '1'
  return c.json(detailed ? await getQualityMetrics() : await getMetrics())
})

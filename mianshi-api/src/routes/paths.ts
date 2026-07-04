import { Hono } from 'hono'
import { authMiddleware, optionalUser, type AuthVariables } from '../middleware/auth.js'
import { getLearningPaths } from '../services/paths.js'

export const pathRoutes = new Hono<{ Variables: AuthVariables }>()

pathRoutes.use('*', authMiddleware)

pathRoutes.get('/', async (c) => {
  const user = optionalUser(c)
  const items = await getLearningPaths(user?.id)
  return c.json({ items })
})

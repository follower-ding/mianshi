import { Hono } from 'hono'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import { getUserProfile } from '../services/profile.js'
import { isPgEnabled } from '../db/client.js'

export const profileRoutes = new Hono<{ Variables: AuthVariables }>()

profileRoutes.use('*', authMiddleware)

profileRoutes.get('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  if (!isPgEnabled()) {
    return c.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      stats: { practiced: 0, mastered: 0, favorites: 0, reports: 0, interviews: 0 },
      categoryProgress: {},
      questionTotal: 0,
      recentReports: [],
      favorites: [],
      syncEnabled: false,
    })
  }

  const profile = await getUserProfile(user.id)
  if (!profile) return c.json({ error: 'User not found' }, 404)
  return c.json(profile)
})

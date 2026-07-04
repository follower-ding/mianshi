import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import {
  getUserProgressStats,
  listUserProgress,
  syncUserProgress,
  upsertUserProgress,
  type PracticeStatus,
} from '../services/practice.js'
import { getQuestion } from '../services/store.js'
import { isPgEnabled } from '../db/client.js'

export const practiceRoutes = new Hono<{ Variables: AuthVariables }>()

practiceRoutes.use('*', authMiddleware)

practiceRoutes.get('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) {
    return c.json({ items: [], stats: { practiced: 0, mastered: 0, favorites: 0 }, syncEnabled: false })
  }
  const [items, stats] = await Promise.all([
    listUserProgress(user.id),
    getUserProgressStats(user.id),
  ])
  return c.json({ items, stats, syncEnabled: true })
})

const progressPatchSchema = z.object({
  status: z.enum(['practiced', 'mastered']).optional(),
  favorite: z.boolean().optional(),
})

practiceRoutes.put('/:questionId', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) return c.json({ error: 'Practice sync requires PostgreSQL' }, 503)

  const questionId = c.req.param('questionId')
  const question = await getQuestion(questionId)
  if (!question || question.status !== 'published') {
    return c.json({ error: 'Question not found' }, 404)
  }

  const patch = progressPatchSchema.parse(await c.req.json())
  const item = await upsertUserProgress(user.id, questionId, patch as { status?: PracticeStatus; favorite?: boolean })
  const stats = await getUserProgressStats(user.id)
  return c.json({ item, stats })
})

const syncSchema = z.object({
  items: z.array(
    z.object({
      questionId: z.string(),
      status: z.enum(['practiced', 'mastered']),
      favorite: z.boolean(),
      updatedAt: z.string(),
    }),
  ),
})

practiceRoutes.post('/sync', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) return c.json({ error: 'Practice sync requires PostgreSQL' }, 503)

  const body = syncSchema.parse(await c.req.json())
  const items = await syncUserProgress(user.id, body.items)
  const stats = await getUserProgressStats(user.id)
  return c.json({ items, stats })
})

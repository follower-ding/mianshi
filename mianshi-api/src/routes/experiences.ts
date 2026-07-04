import { Hono } from 'hono'
import { experiencePatchSchema, experienceSchema } from '../schemas/index.js'
import {
  createExperience,
  deleteExperience,
  getExperience,
  listExperiences,
  updateExperience,
} from '../services/store.js'
import { authMiddleware, optionalUser, type AuthVariables } from '../middleware/auth.js'

export const experienceRoutes = new Hono<{ Variables: AuthVariables }>()

experienceRoutes.use('*', authMiddleware)

experienceRoutes.get('/', async (c) => {
  const user = optionalUser(c)
  const includeAll = user?.role === 'admin'
  return c.json({ items: await listExperiences({ includeAll }) })
})

experienceRoutes.get('/:id', async (c) => {
  const item = await getExperience(c.req.param('id'))
  if (!item) return c.json({ error: 'Not found' }, 404)
  const user = optionalUser(c)
  if (item.status && item.status !== 'published' && user?.role !== 'admin') {
    if (item.userId !== user?.id) {
      return c.json({ error: 'Not found' }, 404)
    }
  }
  return c.json(item)
})

experienceRoutes.post('/', async (c) => {
  const body = experienceSchema.parse(await c.req.json())
  const user = optionalUser(c)
  const isAdmin = user?.role === 'admin'
  const item = await createExperience({
    ...body,
    userId: user?.id,
    status: isAdmin ? 'published' : 'pending',
  })
  return c.json(item, 201)
})

experienceRoutes.put('/:id', async (c) => {
  const patch = experiencePatchSchema.parse(await c.req.json())
  const user = optionalUser(c)
  const existing = await getExperience(c.req.param('id'))
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (user?.role !== 'admin' && existing.userId && existing.userId !== user?.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const item = await updateExperience(c.req.param('id'), patch)
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

experienceRoutes.delete('/:id', async (c) => {
  const user = optionalUser(c)
  const existing = await getExperience(c.req.param('id'))
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (user?.role !== 'admin' && existing.userId && existing.userId !== user?.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const ok = await deleteExperience(c.req.param('id'))
  if (!ok) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

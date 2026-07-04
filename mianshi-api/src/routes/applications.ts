import { Hono } from 'hono'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import {
  jobApplySchema,
  jobApplicationPatchSchema,
  jobGreetingPreviewSchema,
} from '../schemas/index.js'
import { generateJobGreeting } from '../services/job-greeting.js'
import { saveBossChatMessage } from '../services/boss-chat-store.js'
import {
  createJobApplication,
  findApplicationByUserAndJob,
  getJobApplication,
  getJobPosting,
  listJobApplications,
  updateJobApplication,
} from '../services/jobs-store.js'
import { getUserById } from '../services/store.js'
import { isPgEnabled } from '../db/client.js'
import { isDemoJob } from '../services/job-demo.js'

export const applicationRoutes = new Hono<{ Variables: AuthVariables }>()

applicationRoutes.use('*', authMiddleware)

applicationRoutes.get('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) {
    return c.json({ items: [], syncEnabled: false })
  }
  let items = await listJobApplications(user.id)
  items = items.filter((a) => !isDemoJob(a.job))
  return c.json({ items, syncEnabled: true })
})

applicationRoutes.get('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const app = await getJobApplication(c.req.param('id'))
  if (!app || app.userId !== user.id) return c.json({ error: 'Not found' }, 404)
  return c.json(app)
})

applicationRoutes.post('/greeting-preview', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const body = jobGreetingPreviewSchema.parse(await c.req.json())
  const job = await getJobPosting(body.jobId)
  if (!job || job.status !== 'published') return c.json({ error: 'Job not found' }, 404)
  const fullUser = await getUserById(user.id)
  if (!fullUser) return c.json({ error: 'User not found' }, 404)
  const greeting = await generateJobGreeting(job, fullUser, body.resumeSummary)
  return c.json({ greeting })
})

applicationRoutes.post('/apply', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) {
    return c.json({ error: '投递功能需 PostgreSQL 模式（登录注册）' }, 503)
  }
  const body = jobApplySchema.parse(await c.req.json())
  const job = await getJobPosting(body.jobId)
  if (!job || job.status !== 'published') return c.json({ error: 'Job not found' }, 404)

  const existing = await findApplicationByUserAndJob(user.id, body.jobId)
  if (existing?.bossApplyStatus === 'sent') {
    return c.json({ error: '已投递过该岗位', application: existing }, 409)
  }

  const fullUser = await getUserById(user.id)
  if (!fullUser) return c.json({ error: 'User not found' }, 404)

  const greeting =
    body.greeting?.trim() ||
    (await generateJobGreeting(job, fullUser, body.resumeSummary))

  let application = existing
  if (!application) {
    application = await createJobApplication({
      userId: user.id,
      jobId: body.jobId,
      greeting,
      resumeSummary: body.resumeSummary,
    })
  } else {
    await updateJobApplication(application.id, {
      greeting,
      bossApplyStatus: 'pending',
      bossApplyError: '',
    })
  }

  const { applyViaBossSession } = await import('../services/boss-sync.js')
  const bossResult = await applyViaBossSession(user.id, body.jobId, greeting, application.id)
  const updated = await getJobApplication(application.id)

  if (bossResult.ok && job.externalId) {
    await saveBossChatMessage({
      userId: user.id,
      bossJobId: job.externalId,
      company: job.company,
      jobTitle: job.title,
      role: 'user',
      content: greeting,
    })
  }

  return c.json(
    {
      ...(updated ?? application),
      bossUrl: bossResult.inApp ? undefined : job.externalUrl,
      jobSource: job.source,
      bossApply: bossResult,
    },
    201,
  )
})

applicationRoutes.patch('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const app = await getJobApplication(c.req.param('id'))
  if (!app || app.userId !== user.id) return c.json({ error: 'Not found' }, 404)
  const patch = jobApplicationPatchSchema.parse(await c.req.json())
  const updated = await updateJobApplication(app.id, patch)
  return c.json(updated)
})

applicationRoutes.post('/:id/mark-interview', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const app = await getJobApplication(c.req.param('id'))
  if (!app || app.userId !== user.id) return c.json({ error: 'Not found' }, 404)
  const updated = await updateJobApplication(app.id, { status: 'interview_invited' })
  return c.json(updated)
})

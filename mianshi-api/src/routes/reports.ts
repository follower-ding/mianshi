import { Hono } from 'hono'
import { shareReportExperienceSchema } from '../schemas/index.js'
import {
  buildExperienceDraftFromReport,
  buildExperienceContentFromReport,
} from '../services/report-to-experience.js'
import {
  createExperience,
  deleteReport,
  findExperienceByReportId,
  getReport,
  listReports,
} from '../services/store.js'
import { authMiddleware, optionalUser, requireAuth, type AuthVariables } from '../middleware/auth.js'

export const reportRoutes = new Hono<{ Variables: AuthVariables }>()

reportRoutes.use('*', authMiddleware)

reportRoutes.get('/', async (c) => {
  const user = optionalUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const items = await listReports(user.role === 'admin' ? undefined : user.id)
  return c.json({
    items: items.map((r) => ({
      id: r.id,
      position: r.position,
      experience: r.experience,
      totalScore: r.totalScore,
      answerCount: r.answerCount,
      overallRating: r.overallRating,
      summary: r.summary,
      createdAt: r.createdAt,
    })),
  })
})

reportRoutes.get('/:id/share-preview', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const report = await getReport(c.req.param('id'))
  if (!report) return c.json({ error: 'Report not found' }, 404)
  if (user.role !== 'admin' && report.userId && report.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const existing = await findExperienceByReportId(report.id)
  if (existing) {
    return c.json({
      alreadyShared: true,
      experienceId: existing.id,
      status: existing.status ?? 'published',
    })
  }
  const draft = buildExperienceDraftFromReport(report, user.name)
  return c.json({ alreadyShared: false, draft })
})

reportRoutes.post('/:id/share-experience', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const report = await getReport(c.req.param('id'))
  if (!report) return c.json({ error: 'Report not found' }, 404)
  if (user.role !== 'admin' && report.userId && report.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const existing = await findExperienceByReportId(report.id)
  if (existing) {
    return c.json(
      {
        error: '该报告已分享过面经',
        experienceId: existing.id,
        status: existing.status ?? 'published',
      },
      409,
    )
  }

  const body = shareReportExperienceSchema.parse(await c.req.json())
  const draft = buildExperienceDraftFromReport(report, user.name)
  const content = body.content ?? draft.content ?? buildExperienceContentFromReport(report)

  const item = await createExperience({
    company: body.company,
    position: draft.position,
    result: body.result ?? draft.result,
    rounds: draft.rounds,
    author: body.author ?? draft.author,
    date: body.date ?? draft.date,
    summary: body.summary ?? draft.summary,
    content,
    userId: user.id,
    status: user.role === 'admin' ? 'published' : 'pending',
    sourceReportId: report.id,
    sourceType: 'simulation',
  })

  return c.json(
    {
      experience: item,
      message:
        user.role === 'admin'
          ? '已发布到面经社区'
          : '已提交审核，通过后将在面经社区展示',
    },
    201,
  )
})

reportRoutes.get('/:id', async (c) => {
  const report = await getReport(c.req.param('id'))
  if (!report) return c.json({ error: 'Report not found' }, 404)
  const user = optionalUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  if (user.role !== 'admin' && report.userId && report.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const shared = await findExperienceByReportId(report.id)
  return c.json({
    ...report,
    sharedExperienceId: shared?.id ?? null,
    sharedExperienceStatus: shared?.status ?? null,
  })
})

reportRoutes.delete('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  const report = await getReport(c.req.param('id'))
  if (!report) return c.json({ error: 'Report not found' }, 404)
  if (user.role !== 'admin' && report.userId && report.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const ok = await deleteReport(c.req.param('id'))
  if (!ok) return c.json({ error: 'Report not found' }, 404)
  return c.json({ ok: true })
})

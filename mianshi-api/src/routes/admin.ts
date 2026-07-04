import { Hono } from 'hono'
import { authMiddleware, requireAdmin, type AuthVariables } from '../middleware/auth.js'
import {
  countQuestionsByStatus,
  getAllMetricCounters,
  listCandidateQuestions,
  listQuestions,
  listReports,
  listSessions,
  listUsers,
  getUserById,
  updateUserRole,
  purgeExpiredLlmCache,
  updateCandidateQuestion,
  updateQuestion,
} from '../services/store.js'
import {
  mergeRecentActivity,
  weekOverWeekTrend,
  type AdminActivityItem,
} from '../services/admin-dashboard-helpers.js'
import { countTypeCoverage } from '../services/question-selector.js'
import { generateQuestionsFromExperience } from '../services/experience-to-question.js'
import { getGatewayStats } from '../services/llm-gateway.js'
import { getQualityMetrics } from '../services/metrics.js'
import { runQualityRegression } from '../services/question-quality.js'
import { isPgEnabled } from '../db/client.js'
import { jobPostingSchema } from '../schemas/index.js'
import { listUserResumes } from '../services/resume-store.js'
import {
  listAllResumeSharesAdmin,
  revokeShareByToken,
} from '../services/resume-share-store.js'
import {
  createJobPosting,
  deleteJobPosting,
  listJobApplications,
  updateJobPosting,
} from '../services/jobs-store.js'
import { saveQuestionImage, validateQuestionImage } from '../services/question-image-store.js'

export const adminRoutes = new Hono<{ Variables: AuthVariables }>()

adminRoutes.use('*', authMiddleware)

adminRoutes.get('/questions/overview', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user

  const [items, byStatus] = await Promise.all([listQuestions(), countQuestionsByStatus()])
  const byCategory: Record<string, number> = {}
  const byDifficulty: Record<string, number> = {}
  let qualityComplete = 0

  for (const q of items) {
    byCategory[q.category] = (byCategory[q.category] ?? 0) + 1
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1
    if (q.keyPoints?.length && q.referenceAnswer?.trim()) qualityComplete++
  }

  return c.json({
    total: items.length,
    byCategory,
    byDifficulty,
    byStatus,
    qualityComplete,
  })
})

adminRoutes.get('/dashboard', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user

  const counters = await getAllMetricCounters()
  const sessions = await listSessions()
  const reports = await listReports()
  const questions = await listQuestions()
  const questionsByStatus = await countQuestionsByStatus()
  const candidates = await listCandidateQuestions('review')
  const gateway = await getGatewayStats()
  const users = isPgEnabled() ? await listUsers() : []

  const started = Math.max(counters['interview.session_started'] ?? 0, sessions.length)
  const finished = counters['interview.session_finished'] ?? 0
  const recentSessions = sessions.slice(0, 50)
  const avgCoverage =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + countTypeCoverage(s.questionPlan), 0) / recentSessions.length
      : 0

  const sessionDated = sessions.map((s) => ({ createdAt: s.createdAt }))
  const reportDated = reports.map((r) => ({ createdAt: r.createdAt }))
  const questionDated = questions.map((q) => ({ createdAt: q.createdAt }))
  const userDated = users.map((u) => ({ createdAt: u.createdAt }))

  const activity: AdminActivityItem[] = mergeRecentActivity([
    ...questions.slice(0, 20).map((q) => ({
      id: `q-${q.id}`,
      type: 'question' as const,
      title: q.title,
      subtitle: q.category,
      createdAt: q.createdAt,
      href: `/admin/manage/${q.id}`,
    })),
    ...reports.slice(0, 20).map((r) => ({
      id: `r-${r.id}`,
      type: 'report' as const,
      title: r.position || '面试报告',
      subtitle: `${r.totalScore} 分 · ${r.overallRating}`,
      createdAt: r.createdAt,
      href: `/reports/${r.id}`,
    })),
    ...sessions.slice(0, 20).map((s) => ({
      id: `s-${s.id}`,
      type: 'session' as const,
      title: s.position || '模拟面试',
      subtitle: `${s.answerCount} 轮 · ${s.totalScore} 分`,
      createdAt: new Date(s.createdAt).toISOString(),
    })),
    ...users.slice(0, 10).map((u) => ({
      id: `u-${u.id}`,
      type: 'user' as const,
      title: u.name,
      subtitle: u.email,
      createdAt: u.createdAt,
      href: `/admin/users/${u.id}`,
    })),
    ...candidates.slice(0, 10).map((q) => ({
      id: `c-${q.id}`,
      type: 'candidate' as const,
      title: q.title,
      subtitle: '待审核候选题',
      createdAt: q.createdAt,
      href: '/admin/candidates',
    })),
  ])

  return c.json({
    counters,
    gateway,
    quality: {
      sessionCompletionRate: started > 0 ? Math.round((finished / started) * 1000) / 10 : 0,
      avgTypeCoverage: Math.round(avgCoverage * 10) / 10,
      avgInterviewScore:
        reports.length > 0
          ? Math.round(reports.reduce((s, r) => s + r.totalScore, 0) / reports.length)
          : 0,
      totalReports: reports.length,
      pendingReviewQuestions: candidates.length,
    },
    questionsByStatus,
    trends: {
      questions: weekOverWeekTrend(questionDated),
      reports: weekOverWeekTrend(reportDated),
      sessions: weekOverWeekTrend(sessionDated),
      users: weekOverWeekTrend(userDated),
    },
    recentActivity: activity,
  })
})

adminRoutes.get('/notifications', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user

  const [reviewQuestions, candidates, reports] = await Promise.all([
    listQuestions({ status: 'review' }),
    listCandidateQuestions('review'),
    listReports(),
  ])

  const items: {
    id: string
    type: string
    title: string
    body?: string
    href?: string
    createdAt: string
  }[] = []

  if (reviewQuestions.length > 0) {
    items.push({
      id: 'notif-review-batch',
      type: 'review',
      title: `${reviewQuestions.length} 道题待审核`,
      body: '审核队列中有题目等待发布确认',
      href: '/admin/questions',
      createdAt: reviewQuestions[0]?.createdAt ?? new Date().toISOString(),
    })
  }

  if (candidates.length > 0) {
    items.push({
      id: 'notif-candidates-batch',
      type: 'candidate',
      title: `${candidates.length} 道候选题待审核`,
      body: '面经 AI 抽取的候选题等待入库',
      href: '/admin/candidates',
      createdAt: candidates[0]?.createdAt ?? new Date().toISOString(),
    })
  }

  for (const r of reports.slice(0, 5)) {
    items.push({
      id: `notif-report-${r.id}`,
      type: 'report',
      title: `新面试报告：${r.position}`,
      body: `${r.totalScore} 分 · ${r.overallRating}`,
      href: `/reports/${r.id}`,
      createdAt: r.createdAt,
    })
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return c.json({ items: items.slice(0, 20) })
})

adminRoutes.get('/questions/review', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const status = c.req.query('status') ?? 'review'
  const items = await listQuestions({ status })
  return c.json({ items })
})

adminRoutes.post('/questions/:id/review', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const body = (await c.req.json()) as { action: 'approve' | 'reject' | 'archive' }
  const statusMap = { approve: 'published', reject: 'draft', archive: 'archived' } as const
  const item = await updateQuestion(c.req.param('id'), { status: statusMap[body.action] })
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

adminRoutes.get('/candidates', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const status = c.req.query('status') ?? 'review'
  const items = await listCandidateQuestions(status)
  return c.json({ items })
})

adminRoutes.post('/candidates/:id/review', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const body = (await c.req.json()) as { action: 'approve' | 'reject' }
  const candidate = await updateCandidateQuestion(c.req.param('id'), {
    status: body.action === 'approve' ? 'published' : 'rejected',
  })
  if (!candidate) return c.json({ error: 'Not found' }, 404)

  if (body.action === 'approve') {
    const { createQuestion } = await import('../services/store.js')
    const question = await createQuestion({
      title: candidate.title,
      category: candidate.category,
      difficulty: candidate.difficulty,
      tags: candidate.tags,
      content: candidate.content,
      type: candidate.type,
      status: 'published',
      referenceAnswer: candidate.referenceAnswer,
      keyPoints: candidate.keyPoints,
      scoringRubric: candidate.scoringRubric,
      followUpTemplates: candidate.followUpTemplates,
      sourceExperienceId: candidate.experienceId,
    })
    return c.json({ candidate, question })
  }

  return c.json({ candidate })
})

adminRoutes.post('/experiences/:id/generate-questions', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const items = await generateQuestionsFromExperience(c.req.param('id'))
  return c.json({ items }, 201)
})

adminRoutes.get('/users', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const items = await listUsers()
  return c.json({ items })
})

adminRoutes.patch('/users/:id/role', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  if (!isPgEnabled()) {
    return c.json({ error: 'User management requires PostgreSQL' }, 503)
  }

  const body = (await c.req.json()) as { role: 'user' | 'admin' }
  if (body.role !== 'user' && body.role !== 'admin') {
    return c.json({ error: 'Invalid role' }, 400)
  }

  const targetId = c.req.param('id')
  if (targetId === admin.id && body.role !== 'admin') {
    return c.json({ error: '不能修改自己的管理员权限' }, 400)
  }

  const updated = await updateUserRole(targetId, body.role)
  if (!updated) return c.json({ error: 'Not found' }, 404)
  return c.json(updated)
})

adminRoutes.post('/quality/regression', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  return c.json(await runQualityRegression())
})

adminRoutes.get('/gateway', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  return c.json(await getGatewayStats())
})

adminRoutes.get('/metrics', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  return c.json(await getQualityMetrics())
})

adminRoutes.post('/questions/bulk-status', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const body = (await c.req.json()) as { ids: string[]; status: string }
  const allowed = ['draft', 'review', 'published', 'archived']
  if (!allowed.includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }
  let updated = 0
  for (const id of body.ids ?? []) {
    const item = await updateQuestion(id, { status: body.status as 'draft' | 'review' | 'published' | 'archived' })
    if (item) updated++
  }
  return c.json({ updated })
})

adminRoutes.post('/cache/purge', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  if (!isPgEnabled()) {
    return c.json({ ok: true, message: 'JSON mode: no cache table' })
  }
  await purgeExpiredLlmCache()
  return c.json({ ok: true })
})

adminRoutes.post('/experiences/:id/review', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const body = (await c.req.json()) as { action: 'approve' | 'reject' }
  const status = body.action === 'approve' ? 'published' : 'rejected'
  const { updateExperience } = await import('../services/store.js')
  const item = await updateExperience(c.req.param('id'), { status })
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

adminRoutes.get('/job-applications', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const { listAllJobApplications } = await import('../services/jobs-store.js')
  return c.json({ items: await listAllJobApplications() })
})

adminRoutes.get('/users/:id', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  const target = await getUserById(c.req.param('id'))
  if (!target) return c.json({ error: 'Not found' }, 404)

  const [reports, resumes, applications] = await Promise.all([
    listReports(target.id),
    listUserResumes(target.id),
    listJobApplications(target.id),
  ])

  return c.json({
    user: target,
    stats: {
      reports: reports.length,
      resumes: resumes.length,
      applications: applications.length,
    },
    recentReports: reports.slice(0, 5).map((r) => ({
      id: r.id,
      position: r.position,
      totalScore: r.totalScore,
      createdAt: r.createdAt,
    })),
    resumes: resumes.map((r) => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt,
    })),
  })
})

adminRoutes.get('/resume-shares', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  return c.json({ items: await listAllResumeSharesAdmin() })
})

adminRoutes.delete('/resume-shares/:token', async (c) => {
  const user = requireAdmin(c)
  if (user instanceof Response) return user
  const ok = await revokeShareByToken(c.req.param('token'))
  if (!ok) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

adminRoutes.post('/jobs', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  const body = jobPostingSchema.parse(await c.req.json())
  const item = await createJobPosting({ ...body, status: body.status ?? 'published' })
  return c.json(item, 201)
})

adminRoutes.put('/jobs/:id', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  const body = jobPostingSchema.partial().parse(await c.req.json())
  const item = await updateJobPosting(c.req.param('id'), body)
  if (!item) return c.json({ error: 'Not found or Boss 岗位不可编辑' }, 404)
  return c.json(item)
})

adminRoutes.delete('/jobs/:id', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  const ok = await deleteJobPosting(c.req.param('id'))
  if (!ok) return c.json({ error: 'Not found or Boss 岗位不可删除' }, 404)
  return c.json({ ok: true })
})

/** 题库 Markdown 插图上传（JPEG/PNG/WebP/GIF，最大 5MB） */
adminRoutes.post('/uploads/image', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const formData = await c.req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return c.json({ error: '请上传图片文件' }, 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const guard = validateQuestionImage(file.name || 'image.png', buffer)
  if (!guard.ok) return c.json({ error: guard.error }, guard.status as 400)

  const saved = saveQuestionImage(buffer, guard.mime)
  return c.json({
    url: saved.url,
    filename: saved.filename,
    size: saved.size,
  })
})

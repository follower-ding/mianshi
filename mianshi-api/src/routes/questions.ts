import { Hono } from 'hono'
import { questionPatchSchema, questionSchema } from '../schemas/index.js'
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  incrementQuestionViews,
  listQuestions,
  listQuestionsPage,
  updateQuestion,
} from '../services/store.js'
import { findDuplicateQuestion, validateQuestionQuality } from '../services/question-quality.js'
import { authMiddleware, optionalUser, requireAdmin, type AuthVariables } from '../middleware/auth.js'

export const questionRoutes = new Hono<{ Variables: AuthVariables }>()

questionRoutes.use('*', authMiddleware)

questionRoutes.get('/stats', async (c) => {
  const user = optionalUser(c)
  const items = await listQuestions({ status: user?.role === 'admin' ? undefined : 'published' })
  const byCategory: Record<string, number> = {}
  const byDifficulty: Record<string, number> = {}
  for (const q of items) {
    byCategory[q.category] = (byCategory[q.category] ?? 0) + 1
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1
  }
  return c.json({ total: items.length, byCategory, byDifficulty })
})

questionRoutes.get('/', async (c) => {
  const category = c.req.query('category') ?? undefined
  const search = c.req.query('search') ?? undefined
  const difficulty = c.req.query('difficulty') ?? undefined
  const user = optionalUser(c)
  const queryStatus = c.req.query('status') ?? undefined
  const effectiveStatus = user?.role === 'admin' ? queryStatus : 'published'

  const pageRaw = c.req.query('page')
  const pageSizeRaw = c.req.query('pageSize') ?? c.req.query('limit')
  const wantsPage = pageRaw !== undefined || pageSizeRaw !== undefined

  if (wantsPage) {
    let result = await listQuestionsPage({
      category,
      search,
      status: effectiveStatus,
      page: pageRaw ? Number(pageRaw) : 1,
      pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    })
    if (difficulty) {
      result = {
        ...result,
        items: result.items.filter((q) => q.difficulty === difficulty),
      }
    }
    return c.json(result)
  }

  let items = await listQuestions({ category, search, status: effectiveStatus })
  if (difficulty) items = items.filter((q) => q.difficulty === difficulty)
  return c.json({ items })
})

questionRoutes.get('/:id', async (c) => {
  const item = await getQuestion(c.req.param('id'))
  if (!item) return c.json({ error: 'Not found' }, 404)
  const user = optionalUser(c)
  if (item.status !== 'published' && user?.role !== 'admin') {
    return c.json({ error: 'Not found' }, 404)
  }
  await incrementQuestionViews(item.id)
  return c.json(item)
})

questionRoutes.post('/', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const parsed = questionSchema.parse(await c.req.json())
  const body = {
    ...parsed,
    tags: parsed.tags.length ? parsed.tags : [parsed.category],
    status: parsed.status ?? 'draft',
  }
  const dup = await findDuplicateQuestion(body.title, body.content)
  if (dup) {
    return c.json({ error: `题目与已有题「${dup.title}」高度相似`, duplicateId: dup.id }, 409)
  }
  const quality = validateQuestionQuality(body)
  if (!quality.ok && (body.status === 'published' || body.status === 'review')) {
    return c.json({ error: '质检未通过', issues: quality.issues }, 422)
  }
  const item = await createQuestion({
    ...body,
    type: body.type ?? '基础',
    userId: admin.id,
  })
  return c.json(item, 201)
})

questionRoutes.put('/:id', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const patch = questionPatchSchema.parse(await c.req.json())
  const existing = await getQuestion(c.req.param('id'))
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const merged = {
    ...existing,
    ...patch,
    tags: patch.tags?.length ? patch.tags : existing.tags.length ? existing.tags : [patch.category ?? existing.category],
  }
  const dup = await findDuplicateQuestion(merged.title, merged.content, existing.id)
  if (dup) {
    return c.json({ error: `题目与已有题「${dup.title}」高度相似`, duplicateId: dup.id }, 409)
  }
  const quality = validateQuestionQuality(merged)
  if (!quality.ok && (merged.status === 'published' || merged.status === 'review')) {
    return c.json({ error: '质检未通过', issues: quality.issues }, 422)
  }

  const item = await updateQuestion(c.req.param('id'), {
    ...patch,
    tags: merged.tags,
  })
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

questionRoutes.delete('/:id', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const ok = await deleteQuestion(c.req.param('id'))
  if (!ok) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

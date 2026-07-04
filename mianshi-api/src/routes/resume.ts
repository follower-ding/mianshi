import { Hono } from 'hono'
import { authMiddleware, requireAuth, type AuthVariables } from '../middleware/auth.js'
import { isPgEnabled } from '../db/client.js'
import {
  resumeCreateSchema,
  resumeGenerateSchema,
  resumeOptimizeSchema,
  resumeParseTextSchema,
  resumeUpsertSchema,
} from '../schemas/index.js'
import { incrementMetric } from '../services/metrics.js'
import { getLlmInfo } from '../services/llm.js'
import { getJobPosting } from '../services/jobs-store.js'
import { upsertJobPreference } from '../services/job-preferences-store.js'
import {
  extractTextFromFile,
  generateResume,
  isResumeAiDemoMode,
  optimizeResume,
  parseResumeText,
  contentToText,
} from '../services/resume-optimize.js'
import { isResumeExtractError, SCANNED_PDF_CODE } from '../services/resume-extract-errors.js'
import {
  createUserResume,
  deleteUserResume,
  getResumeById,
  getUserResume,
  listUserResumes,
  updateUserResume,
  upsertUserResume,
} from '../services/resume-store.js'
import {
  createResumeShare,
  getResumeShareForUser,
  revokeResumeShare,
} from '../services/resume-share-store.js'
import { htmlToPdfBuffer, isResumePdfAvailable } from '../services/resume-pdf.js'
import { z } from 'zod'
import { validateResumeUpload } from '../services/resume-file-guard.js'
import { resumeRateLimit } from '../middleware/resume-rate-limit.js'
import {
  allowedResumeExtensionsLabel,
  isAllowedResumeExtension,
} from '../services/resume-file-types.js'
import type { ResumeContent, ResumeLayoutConfig } from '../types/entities.js'

export const resumeRoutes = new Hono<{ Variables: AuthVariables }>()

resumeRoutes.use('*', authMiddleware)

const heavy = resumeRateLimit

resumeRoutes.get('/health', async (c) => {
  const base = {
    llmConfigured: getLlmInfo().configured,
    demoMode: isResumeAiDemoMode(),
    syncEnabled: isPgEnabled(),
  }
  if (c.req.query('probe') !== '1') return c.json(base)
  const { probeLlmReachable } = await import('../services/llm.js')
  const probe = await probeLlmReachable()
  return c.json({ ...base, ...probe })
})

resumeRoutes.get('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resumes = await listUserResumes(user.id)
  return c.json({ resumes, resume: resumes[0] ?? null, syncEnabled: isPgEnabled() })
})

resumeRoutes.post('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeCreateSchema.parse(await c.req.json().catch(() => ({})))
  const resume = await createUserResume(user.id, body)
  await incrementMetric('resume.create')
  return c.json({ resume })
})

/** 仅抽取文本，不结构化解析 */
resumeRoutes.post('/extract', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const contentType = c.req.header('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: '请上传文件' }, 400)

    const fileName = file.name || 'resume'
    const buffer = Buffer.from(await file.arrayBuffer())
    const guard = validateResumeUpload(fileName, buffer)
    if (!guard.ok) return c.json({ error: guard.error }, guard.status)

    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    try {
      const text = await extractTextFromFile(buffer, ext)
      const trimmed = text.trim()
      if (trimmed.length < 30) {
        return c.json({
          error: '未能提取足够文本（至少 30 字符）。扫描版 PDF 请粘贴文本。',
          code: SCANNED_PDF_CODE,
        }, 422)
      }
      await incrementMetric('resume.extract')
      return c.json({ text: trimmed, fileName, charCount: trimmed.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '提取失败'
      if (isResumeExtractError(e)) {
        return c.json({ error: msg, code: e.code }, 422)
      }
      return c.json({ error: msg }, 422)
    }
  }

  const body = resumeParseTextSchema.parse(await c.req.json())
  const trimmed = body.text.trim()
  return c.json({ text: trimmed, charCount: trimmed.length })
})

const shareCreateSchema = z.object({
  expiresInDays: z.number().int().min(0).max(365).nullable().optional(),
})

resumeRoutes.get('/:id/share', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resumeId = c.req.param('id')
  if (!resumeId) return c.json({ error: '无效 ID' }, 400)
  const resume = await getResumeById(user.id, resumeId)
  if (!resume) return c.json({ error: '简历不存在' }, 404)

  const share = await getResumeShareForUser(user.id, resumeId)
  if (!share) return c.json({ share: null })
  return c.json({
    share: {
      token: share.token,
      sharedAt: share.createdAt,
      expiresAt: share.expiresAt ?? null,
    },
  })
})

resumeRoutes.post('/:id/share', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resumeId = c.req.param('id')
  if (!resumeId) return c.json({ error: '无效 ID' }, 400)
  const resume = await getResumeById(user.id, resumeId)
  if (!resume) return c.json({ error: '简历不存在' }, 404)

  const body = shareCreateSchema.parse(await c.req.json().catch(() => ({})))

  const share = await createResumeShare({
    userId: user.id,
    resumeId: resume.id,
    title: resume.title,
    templateId: resume.templateId,
    content: resume.content,
    layoutConfig: resume.layoutConfig,
    expiresInDays: body.expiresInDays,
  })
  await incrementMetric('resume.share')
  return c.json({
    share: {
      token: share.token,
      sharedAt: share.createdAt,
      expiresAt: share.expiresAt ?? null,
    },
  })
})

resumeRoutes.delete('/:id/share', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resumeId = c.req.param('id')
  if (!resumeId) return c.json({ error: '无效 ID' }, 400)
  const resume = await getResumeById(user.id, resumeId)
  if (!resume) return c.json({ error: '简历不存在' }, 404)

  await revokeResumeShare(user.id, resumeId)
  await incrementMetric('resume.share_revoke')
  return c.json({ ok: true })
})

const exportPdfSchema = z.object({
  html: z.string().min(20, '缺少 HTML 内容').max(500_000, 'HTML 内容过大'),
  filename: z.string().max(120).optional(),
})

resumeRoutes.post('/:id/export-pdf', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resumeId = c.req.param('id')
  if (!resumeId) return c.json({ error: '无效 ID' }, 400)
  const resume = await getResumeById(user.id, resumeId)
  if (!resume) return c.json({ error: '简历不存在' }, 404)

  const body = exportPdfSchema.parse(await c.req.json())
  const pdf = await htmlToPdfBuffer(body.html, body.filename ?? resume.title)
  await incrementMetric('resume.export_pdf')
  await incrementMetric('resume.export')
  const safeName = (body.filename ?? resume.title).replace(/[\\/:*?"<>|]/g, '_') || 'resume'
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}.pdf"`,
    },
  })
})

resumeRoutes.get('/export-pdf/health', async (c) => {
  const available = await isResumePdfAvailable()
  return c.json({ available })
})

const trackExportSchema = z.object({
  format: z.enum(['pdf', 'png', 'jpg', 'server-pdf']),
})

resumeRoutes.post('/track-export', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = trackExportSchema.parse(await c.req.json())
  if (body.format === 'server-pdf') {
    await incrementMetric('resume.export_pdf')
  } else {
    await incrementMetric('resume.export_client')
  }
  await incrementMetric('resume.export')
  return c.json({ ok: true })
})

resumeRoutes.get('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resume = await getResumeById(user.id, c.req.param('id'))
  if (!resume) return c.json({ error: '简历不存在' }, 404)
  return c.json({ resume })
})

resumeRoutes.put('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeUpsertSchema.parse(await c.req.json())
  const resume = await updateUserResume(user.id, c.req.param('id'), {
    title: body.title,
    templateId: body.templateId,
    content: body.content as ResumeContent | undefined,
    rawText: body.rawText,
    summary: body.summary,
    optimizedText: body.optimizedText,
    layoutConfig: body.layoutConfig as ResumeLayoutConfig | undefined,
  })
  return c.json({ resume })
})

resumeRoutes.delete('/:id', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  try {
    await deleteUserResume(user.id, c.req.param('id'))
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : '删除失败' }, 400)
  }
})

/** 兼容旧客户端 PUT /resumes */
resumeRoutes.put('/', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeUpsertSchema.parse(await c.req.json())
  const list = await listUserResumes(user.id)
  const targetId = list[0]?.id
  if (!targetId) {
    const resume = await createUserResume(user.id, {
      title: body.title,
      templateId: body.templateId,
      content: body.content as ResumeContent | undefined,
      rawText: body.rawText,
      summary: body.summary,
      optimizedText: body.optimizedText,
    })
    return c.json({ resume })
  }
  const resume = await updateUserResume(user.id, targetId, {
    title: body.title,
    templateId: body.templateId,
    content: body.content as ResumeContent | undefined,
    rawText: body.rawText,
    summary: body.summary,
    optimizedText: body.optimizedText,
  })
  return c.json({ resume })
})

resumeRoutes.post('/parse-preview', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeParseTextSchema.pick({ text: true }).parse(await c.req.json())
  const parsed = await parseResumeText(body.text)
  return c.json(parsed)
})

resumeRoutes.post('/parse-text', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeParseTextSchema.parse(await c.req.json())
  const parsed = await parseResumeText(body.text)
  const rawText = body.text.trim()
  const resumeId = body.resumeId

  let resume
  if (resumeId) {
    resume = await updateUserResume(user.id, resumeId, { content: parsed.content, rawText })
  } else {
    resume = await createUserResume(user.id, {
      title: '导入的简历',
      content: parsed.content,
      rawText,
    })
  }
  await incrementMetric('resume.parse_text')
  await incrementMetric('resume.parse')
  return c.json({ content: parsed.content, source: parsed.source, resume })
})

resumeRoutes.post('/generate', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeGenerateSchema.parse(await c.req.json())
  const result = await generateResume(body)
  const resume = await createUserResume(user.id, {
    title: result.title,
    content: result.content,
    rawText: result.rawText,
    summary: result.summary,
  })
  await incrementMetric('resume.generate')
  return c.json({ result, resume })
})

resumeRoutes.post('/upload', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const resumeId = formData.get('resumeId') as string | null
  const parseFlag = formData.get('parse') as string | null
  const shouldParse = parseFlag !== 'false' && parseFlag !== '0'
  if (!file) return c.json({ error: '请上传文件' }, 400)

  const fileName = file.name || 'resume'
  const buffer = Buffer.from(await file.arrayBuffer())
  const guard = validateResumeUpload(fileName, buffer)
  if (!guard.ok) return c.json({ error: guard.error }, guard.status)

  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  try {
    const text = await extractTextFromFile(buffer, ext)
    const trimmed = text.trim()

    if (trimmed.length < 30) {
      return c.json({
        error: '未能提取足够文本（至少 30 字符）。扫描版 PDF 请粘贴文本。',
        code: SCANNED_PDF_CODE,
      }, 422)
    }

    if (!shouldParse) {
      await incrementMetric('resume.extract')
      return c.json({
        fileName,
        text: trimmed,
        extractedText: trimmed.slice(0, 3000),
        charCount: trimmed.length,
      })
    }

    const parsed = await parseResumeText(trimmed)
    let resume
    if (resumeId) {
      resume = await updateUserResume(user.id, resumeId, { content: parsed.content, rawText: trimmed })
    } else {
      resume = await createUserResume(user.id, {
        title: `${fileName.replace(/\.[^.]+$/, '')} 导入`,
        content: parsed.content,
        rawText: trimmed,
      })
    }
    await incrementMetric('resume.upload')
    return c.json({
      fileName,
      content: parsed.content,
      source: parsed.source,
      fieldCoverage: parsed.fieldCoverage,
      extractedText: trimmed.slice(0, 3000),
      resume,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失败'
    if (isResumeExtractError(e)) {
      return c.json({ error: msg, code: e.code }, 422)
    }
    return c.json({ error: msg }, 422)
  }
})

resumeRoutes.post('/optimize', heavy, async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const body = resumeOptimizeSchema.parse(await c.req.json())
  const existing = body.resumeId
    ? await getResumeById(user.id, body.resumeId)
    : await getUserResume(user.id)

  let input: string | ResumeContent
  if (body.text) {
    input = body.text
  } else if (body.content) {
    input = body.content as ResumeContent
  } else if (existing?.rawText) {
    input = existing.rawText
  } else if (existing?.content && Object.keys(existing.content).length > 0) {
    input = existing.content
  } else {
    return c.json({ error: '请先上传或粘贴简历内容' }, 400)
  }

  let job: Awaited<ReturnType<typeof getJobPosting>> | undefined
  if (body.jobId) {
    job = await getJobPosting(body.jobId)
    if (!job) return c.json({ error: '岗位不存在' }, 404)
  }

  const result = await optimizeResume(input, job ?? undefined)
  const resume = existing
    ? await updateUserResume(user.id, existing.id, {
        content: result.content,
        optimizedText: result.optimizedText,
        summary: result.summary,
        rawText: typeof input === 'string' ? input : contentToText(input),
      })
    : await createUserResume(user.id, {
        content: result.content,
        optimizedText: result.optimizedText,
        summary: result.summary,
        rawText: typeof input === 'string' ? input : contentToText(input),
      })

  await incrementMetric(body.jobId ? 'resume.optimize_for_job' : 'resume.optimize')
  return c.json({ result, resume, job: job ? { id: job.id, company: job.company, title: job.title } : null })
})

resumeRoutes.post('/sync-summary', async (c) => {
  const user = requireAuth(c)
  if (user instanceof Response) return user

  const resume = await getUserResume(user.id)
  if (!resume?.summary?.trim()) {
    return c.json({ error: '暂无简历亮点摘要，请先进行 AI 优化' }, 400)
  }

  const pref = await upsertJobPreference(user.id, { resumeSummary: resume.summary })
  await incrementMetric('resume.sync_summary')
  return c.json({ ok: true, resumeSummary: pref.resumeSummary })
})

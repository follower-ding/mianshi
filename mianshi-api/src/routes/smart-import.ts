import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, requireAdmin, type AuthVariables } from '../middleware/auth.js'
import { isLlmConfigured, probeLlmReachable, tryCompleteChat } from '../services/llm.js'
import { incrementMetric } from '../services/metrics.js'
import {
  demoGenerateContent,
  demoParseTextToQuestions,
  demoSuggestFields,
} from '../services/smart-import-demo.js'
import {
  computeImportQuestionWarnings,
  runBatchImport,
  sliceTextForParse,
  unwrapLlmQuestionList,
  validateImportUpload,
} from '../services/smart-import-batch.js'
import { extractTextFromFile } from '../services/resume-optimize.js'
import { isResumeExtractError, SCANNED_PDF_CODE } from '../services/resume-extract-errors.js'

export const smartImportRoutes = new Hono<{ Variables: AuthVariables }>()

smartImportRoutes.use('*', authMiddleware)

const parseTextSchema = z.object({
  text: z.string().min(50).max(50000),
  category: z.string().min(1).default('Java'),
})

const generateContentSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.string().min(1),
  difficulty: z.string().min(1),
})

const suggestFieldsSchema = z.object({
  title: z.string().min(2, '标题至少 2 字'),
  content: z.string().min(2, '题干至少 2 字'),
  category: z.string().min(1),
  difficulty: z.string().min(1),
})

const batchImportSchema = z.object({
  questions: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        content: z.string().min(10),
        category: z.string().min(1),
        difficulty: z.string().min(1),
        type: z.string().default('基础'),
        tags: z.array(z.string()).default([]),
        keyPoints: z.array(z.string()).default([]),
        referenceAnswer: z.string().default(''),
        scoringRubric: z.string().default(''),
        followUpTemplates: z.array(z.string()).default([]),
        status: z.enum(['draft', 'review', 'published']).default('draft'),
      }),
    )
    .min(1)
    .max(50),
  autoPublish: z.boolean().default(false),
})

function buildParsePrompt(category: string, text: string) {
  return `你是一位资深面试官和技术专家。请从以下文本中提取面试题。

**要求**：
1. 每道题独立、完整、可直接用于面试
2. 题目覆盖核心知识点
3. 每道题附带：题目内容、难度(简单/中等/困难)、题型(基础/项目/系统设计/算法/开放)、标签
4. 领域偏好：${category}

**输入文本**：
${text}

请以 JSON 对象返回（只返回 JSON，不要 markdown 或其它说明）：
{
  "questions": [
    {
      "title": "题目名称",
      "content": "完整面试提问",
      "difficulty": "中等",
      "type": "基础",
      "tags": ["标签1", "标签2"],
      "keyPoints": ["面试官期望听到的要点1", "要点2"],
      "referenceAnswer": "参考答案内容",
      "followUpTemplates": ["追问1", "追问2"]
    }
  ]
}
提取 3-10 道题，宁缺毋滥。`
}

function mapLlmQuestion(q: Record<string, unknown>, category: string) {
  const mapped = {
    title: String(q.title ?? ''),
    content: String(q.content ?? ''),
    difficulty: String(q.difficulty ?? '中等'),
    type: String(q.type ?? '基础'),
    tags: Array.isArray(q.tags) ? q.tags.slice(0, 5).map(String) : [category],
    keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.slice(0, 10).map(String) : [],
    referenceAnswer: String(q.referenceAnswer ?? ''),
    scoringRubric: String(q.scoringRubric ?? ''),
    followUpTemplates: Array.isArray(q.followUpTemplates)
      ? q.followUpTemplates.slice(0, 5).map(String)
      : [],
    category,
    status: 'draft' as const,
  }
  return { ...mapped, warnings: computeImportQuestionWarnings(mapped) }
}

async function parseTextWithFallback(category: string, rawText: string) {
  const sliced = sliceTextForParse(rawText)

  if (isLlmConfigured()) {
    try {
      const raw = await tryCompleteChat(
        [
          { role: 'system', content: '你是一位资深技术面试官。只返回要求的 JSON 对象，不要解释。' },
          { role: 'user', content: buildParsePrompt(category, sliced.text) },
        ],
        { json: true, maxTokens: 4000 },
      )
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        const list = unwrapLlmQuestionList(parsed)
        if (list && list.length > 0) {
          return {
            questions: list.map((q) => mapLlmQuestion(q, category)),
            count: list.length,
            sliced,
            source: 'llm' as const,
          }
        }
        console.warn('[import] LLM returned JSON but no question list; sample:', raw.slice(0, 200))
      } else {
        console.warn('[import] LLM request returned empty (check API key, quota, network)')
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) {
        console.warn('[import] LLM parse failed, falling back to rules:', e)
      }
    }
  }

  const demo = demoParseTextToQuestions(sliced.text, category)
  if (demo.length === 0) {
    return {
      error: '未能从文本中提取有效题目。可尝试缩短噪音段落，或使用「快速录入」手动添加。',
      status: 422 as const,
      sliced,
    }
  }

  console.warn('[import] using rule-based demo parser (LLM unavailable or empty result)')
  return {
    questions: demo.map((q) => ({ ...q, warnings: computeImportQuestionWarnings(q) })),
    count: demo.length,
    sliced,
    source: 'demo' as const,
  }
}

smartImportRoutes.get('/health', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin
  const base = {
    llmConfigured: isLlmConfigured(),
    demoFallback: true,
  }
  if (c.req.query('probe') !== '1') return c.json(base)
  const probe = await probeLlmReachable()
  return c.json({ ...base, ...probe })
})

smartImportRoutes.post('/parse-text', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const body = parseTextSchema.parse(await c.req.json())

  try {
    const result = await parseTextWithFallback(body.category, body.text)
    if ('error' in result) {
      return c.json({ error: result.error, ...result.sliced }, result.status)
    }
    await incrementMetric(result.source === 'llm' ? 'import.parse_text' : 'import.parse_text_demo')
    return c.json({
      questions: result.questions,
      count: result.count,
      truncated: result.sliced.truncated,
      originalLength: result.sliced.originalLength,
      source: result.source,
    })
  } catch {
    return c.json({ error: '解析失败' }, 502)
  }
})

smartImportRoutes.post('/generate-content', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const body = generateContentSchema.parse(await c.req.json())

  const prompt = `作为资深技术面试官，请为以下题目完善内容：

**题目**：${body.title}
**方向**：${body.category}
**难度**：${body.difficulty}

请生成完整题目，JSON 格式返回：
{
  "content": "完整的面试提问表述（不要太长，50-200字）",
  "keyPoints": ["回答要点1（8-15字）", "要点2", "要点3", "要点4"],
  "referenceAnswer": "参考答案（100-500字，准确、结构化、可含代码）",
  "scoringRubric": "评分标准描述（30-80字）",
  "followUpTemplates": ["追问1", "追问2"]
}`

  try {
    let source: 'llm' | 'demo' = 'demo'
    let payload = demoGenerateContent(body.title, body.category, body.difficulty)

    if (isLlmConfigured()) {
      const raw = await tryCompleteChat(
        [
          { role: 'system', content: '你是一位资深技术面试官。只返回要求的 JSON，不要解释。' },
          { role: 'user', content: prompt },
        ],
        { json: true, maxTokens: 2000 },
      )
      if (raw) {
        const result = JSON.parse(raw) as Record<string, unknown>
        payload = {
          content: String(result.content ?? ''),
          keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.map(String) : [],
          referenceAnswer: String(result.referenceAnswer ?? ''),
          scoringRubric: String(result.scoringRubric ?? ''),
          followUpTemplates: Array.isArray(result.followUpTemplates)
            ? result.followUpTemplates.map(String)
            : [],
        }
        source = 'llm'
      } else {
        console.warn('[import] LLM generate unavailable, using demo template')
      }
    }

    await incrementMetric(source === 'llm' ? 'import.generate_content' : 'import.generate_content_demo')
    return c.json({ ...payload, source })
  } catch {
    return c.json({ ...demoGenerateContent(body.title, body.category, body.difficulty), source: 'demo' })
  }
})

smartImportRoutes.post('/suggest-fields', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const body = suggestFieldsSchema.parse(await c.req.json())

  const prompt = `请为以下面试题补充评分要素：

**题目**：${body.title}
**方向**：${body.category}，难度：${body.difficulty}
**提问内容**：${body.content}

只返回 JSON：
{
  "keyPoints": ["要点1", "要点2", "要点3", "要点4"],
  "referenceAnswer": "参考答案（100-300字）",
  "scoringRubric": "评分标准（30-80字）",
  "followUpTemplates": ["追问1", "追问2"]
}`

  try {
    let source: 'llm' | 'demo' = 'demo'
    let payload = demoSuggestFields(body.title, body.content)

    if (isLlmConfigured()) {
      const raw = await tryCompleteChat(
        [
          { role: 'system', content: '你是资深面试官。只返回要求的 JSON。' },
          { role: 'user', content: prompt },
        ],
        { json: true, maxTokens: 1500 },
      )
      if (raw) {
        const result = JSON.parse(raw) as Record<string, unknown>
        payload = {
          keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.map(String) : [],
          referenceAnswer: String(result.referenceAnswer ?? ''),
          scoringRubric: String(result.scoringRubric ?? ''),
          followUpTemplates: Array.isArray(result.followUpTemplates)
            ? result.followUpTemplates.map(String)
            : [],
        }
        source = 'llm'
      }
    }

    await incrementMetric('import.suggest_fields')
    return c.json({ ...payload, source })
  } catch {
    return c.json({ ...demoSuggestFields(body.title, body.content), source: 'demo' })
  }
})

smartImportRoutes.post('/batch', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const body = batchImportSchema.parse(await c.req.json())
  const { results, summary } = await runBatchImport(body.questions, {
    autoPublish: body.autoPublish,
    userId: admin.id,
  })

  await incrementMetric('import.batch')
  return c.json({ results, summary })
})

smartImportRoutes.post('/upload-file', async (c) => {
  const admin = requireAdmin(c)
  if (admin instanceof Response) return admin

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const category = (formData.get('category') as string) || 'Java'

  if (!file) {
    return c.json({ error: '请上传文件' }, 400)
  }

  const fileName = file.name || 'unknown'
  const guard = validateImportUpload(fileName, file.size)
  if (!guard.ok) {
    return c.json({ error: guard.error }, 400)
  }

  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
      try {
        text = await extractTextFromFile(buffer, ext)
      } catch (e) {
        if (isResumeExtractError(e)) {
          return c.json({ error: e.message, code: e.code }, 422)
        }
        return c.json(
          { error: `文件解析失败: ${e instanceof Error ? e.message : '未知错误'}` },
          422,
        )
      }
    } else {
      text = new TextDecoder().decode(buffer)
    }

    if (!text || text.trim().length < 50) {
      return c.json(
        {
          error:
            '文件中未提取到足够文本（至少 50 字符）。PDF 可能是扫描图片版，建议手动粘贴文本。',
          code: SCANNED_PDF_CODE,
        },
        422,
      )
    }

    const result = await parseTextWithFallback(category, text)
    if ('error' in result) {
      const sliced = sliceTextForParse(text)
      return c.json(
        {
          error: result.error,
          extractedText: sliced.text.slice(0, 8000),
          truncated: sliced.truncated,
          originalLength: sliced.originalLength,
        },
        result.status,
      )
    }

    await incrementMetric(result.source === 'llm' ? 'import.upload_file' : 'import.upload_file_demo')
    return c.json({
      fileName,
      questions: result.questions,
      count: result.count,
      truncated: result.sliced.truncated,
      originalLength: result.sliced.originalLength,
      source: result.source,
      extractedTextPreview: text.slice(0, 500),
    })
  } catch (e) {
    if (e instanceof SyntaxError) {
      return c.json({ error: 'AI 返回格式异常，已尝试规则解析仍失败' }, 502)
    }
    throw e
  }
})

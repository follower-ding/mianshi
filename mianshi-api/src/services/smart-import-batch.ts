import { createQuestion } from './store.js'
import {
  findDuplicateQuestion,
  titleSimilarity,
  validateQuestionQuality,
} from './question-quality.js'
import type { QuestionType } from '../types/entities.js'

export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024
export const PARSE_TEXT_SLICE = 8000
const DUPLICATE_THRESHOLD = 0.85

export function sliceTextForParse(text: string) {
  const trimmed = text.trim()
  return {
    text: trimmed.slice(0, PARSE_TEXT_SLICE),
    truncated: trimmed.length > PARSE_TEXT_SLICE,
    originalLength: trimmed.length,
  }
}

export function validateImportUpload(fileName: string, size: number): { ok: true } | { ok: false; error: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const allowed = ['pdf', 'txt', 'md', 'markdown']
  if (!allowed.includes(ext)) {
    return { ok: false, error: `不支持的文件格式: .${ext}，支持: ${allowed.join(', ')}` }
  }
  if (size > IMPORT_MAX_FILE_BYTES) {
    return { ok: false, error: `文件过大（最大 ${Math.round(IMPORT_MAX_FILE_BYTES / 1024 / 1024)}MB）` }
  }
  return { ok: true }
}

/** LLM json_object 模式常返回 { questions: [...] }，兼容多种包裹结构 */
/** 导入题目字段完整性 — 用于前端低置信度标注 */
export function computeImportQuestionWarnings(q: {
  keyPoints?: unknown[]
  referenceAnswer?: string
  scoringRubric?: string
  followUpTemplates?: unknown[]
}): string[] {
  const warnings: string[] = []
  if (!Array.isArray(q.keyPoints) || q.keyPoints.length === 0) warnings.push('缺少回答要点')
  if (!String(q.referenceAnswer ?? '').trim()) warnings.push('缺少参考答案')
  if (!String(q.scoringRubric ?? '').trim()) warnings.push('缺少评分标准')
  if (!Array.isArray(q.followUpTemplates) || q.followUpTemplates.length === 0) {
    warnings.push('缺少追问模板')
  }
  return warnings
}

export function unwrapLlmQuestionList(parsed: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(parsed)) {
    return parsed.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  }
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>
    for (const key of ['questions', 'items', 'data', 'results', 'list']) {
      const val = o[key]
      if (Array.isArray(val)) return val as Record<string, unknown>[]
    }
  }
  return null
}

export function isDuplicateInBatch(
  title: string,
  content: string,
  batch: { title: string; content: string }[],
): boolean {
  for (const q of batch) {
    if (titleSimilarity(title, q.title) >= DUPLICATE_THRESHOLD) return true
    if (titleSimilarity(content.slice(0, 80), q.content.slice(0, 80)) >= DUPLICATE_THRESHOLD) return true
  }
  return false
}

export type BatchQuestionInput = {
  title: string
  content: string
  category: string
  difficulty: string
  type: string
  tags: string[]
  keyPoints: string[]
  referenceAnswer: string
  scoringRubric: string
  followUpTemplates: string[]
  status: 'draft' | 'review' | 'published'
}

export type BatchImportResultItem = {
  id: string
  title: string
  status: 'created' | 'skipped' | 'failed'
  error?: string
  warnings?: string[]
}

export async function runBatchImport(
  questions: BatchQuestionInput[],
  opts: { autoPublish: boolean; userId: string },
): Promise<{
  results: BatchImportResultItem[]
  summary: { total: number; created: number; skipped: number; failed: number }
}> {
  const results: BatchImportResultItem[] = []
  const createdInBatch: { title: string; content: string }[] = []

  for (const q of questions) {
    try {
      const title = q.title.trim()
      const content = q.content.trim()

      if (title.length < 2) {
        results.push({ id: '', title: title || '(无标题)', status: 'skipped', error: '标题无效' })
        continue
      }
      if (content.length < 10) {
        results.push({ id: '', title, status: 'skipped', error: '内容过短（至少 10 字）' })
        continue
      }

      const dup = await findDuplicateQuestion(title, content)
      if (dup) {
        results.push({
          id: '',
          title,
          status: 'skipped',
          error: `与已有题「${dup.title}」高度相似`,
        })
        continue
      }

      if (isDuplicateInBatch(title, content, createdInBatch)) {
        results.push({ id: '', title, status: 'skipped', error: '与本批待导入题目重复' })
        continue
      }

      const targetStatus = opts.autoPublish ? 'published' : q.status
      const quality = validateQuestionQuality({
        title,
        content,
        keyPoints: q.keyPoints,
        referenceAnswer: q.referenceAnswer,
        scoringRubric: q.scoringRubric,
        status: targetStatus,
      })
      const warnings = quality.ok ? [] : [...quality.issues]

      if (!quality.ok && opts.autoPublish) {
        results.push({
          id: '',
          title,
          status: 'skipped',
          error: `质检未通过: ${quality.issues.join('; ')}`,
        })
        continue
      }

      const item = await createQuestion({
        title,
        content,
        category: q.category,
        difficulty: q.difficulty,
        type: (q.type as QuestionType) ?? '基础',
        tags: q.tags,
        status: targetStatus,
        userId: opts.userId,
        keyPoints: q.keyPoints,
        referenceAnswer: q.referenceAnswer,
        scoringRubric: q.scoringRubric,
        followUpTemplates: q.followUpTemplates,
      })

      createdInBatch.push({ title, content })
      results.push({
        id: item.id,
        title,
        status: 'created',
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    } catch (e) {
      results.push({
        id: '',
        title: q.title,
        status: 'failed',
        error: e instanceof Error ? e.message : '创建失败',
      })
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const failed = results.filter((r) => r.status === 'failed').length
  return { results, summary: { total: results.length, created, skipped, failed } }
}

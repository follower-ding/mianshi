import { listQuestions, type Question } from './store.js'

function normalizeTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[？?。，,、；;：:！!]/g, '')
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length > nb.length ? na : nb
  if (longer.includes(shorter)) {
    // 避免「HashMap 底层原理」误判为「HashMap 底层原理与线程安全」重复
    const ratio = shorter.length / longer.length
    if (ratio >= 0.88) return 0.92
    return ratio * 0.7
  }

  let hit = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) hit++
  }
  return hit / longer.length
}

const DUPLICATE_THRESHOLD = 0.85

export async function findDuplicateQuestion(
  title: string,
  content: string,
  excludeId?: string,
): Promise<Question | null> {
  for (const q of await listQuestions()) {
    if (excludeId && q.id === excludeId) continue
    const titleSim = titleSimilarity(title, q.title)
    if (titleSim >= DUPLICATE_THRESHOLD) return q
    const contentSim = titleSimilarity(content.slice(0, 80), q.content.slice(0, 80))
    if (contentSim >= DUPLICATE_THRESHOLD) return q
  }
  return null
}

export type QuestionQualityCheck = {
  ok: boolean
  issues: string[]
}

export function validateQuestionQuality(input: {
  title: string
  content: string
  keyPoints?: string[]
  referenceAnswer?: string
  scoringRubric?: string
  status?: string
}): QuestionQualityCheck {
  const issues: string[] = []

  if (input.title.trim().length < 4) issues.push('标题过短，建议至少 4 字')
  if (input.content.length < 20) issues.push('题干过短，建议至少 20 字')
  if (input.status === 'published' || input.status === 'review') {
    if (!input.keyPoints?.length) issues.push('发布/审核题目需填写得分要点 keyPoints')
    else if (input.keyPoints.length < 2) issues.push('得分要点至少 2 条')
    if (!input.referenceAnswer?.trim()) issues.push('发布/审核题目需填写参考答案 referenceAnswer')
    else if (input.referenceAnswer.trim().length < 30) issues.push('参考答案过短，建议至少 30 字')
    if (!input.scoringRubric?.trim()) issues.push('建议填写评分标准 scoringRubric')
  }

  return { ok: issues.length === 0, issues }
}

export type QualityRegressionItem = {
  id: string
  title: string
  status?: string
  issues: string[]
}

export type QualityRegressionReport = {
  total: number
  passed: number
  failed: number
  duplicates: { id: string; title: string; duplicateOf: { id: string; title: string } }[]
  items: QualityRegressionItem[]
  ranAt: string
}

export async function runQualityRegression(): Promise<QualityRegressionReport> {
  const questions = await listQuestions()
  const items: QualityRegressionItem[] = []
  const duplicates: QualityRegressionReport['duplicates'] = []
  const seen = new Set<string>()

  for (const q of questions) {
    if (q.status !== 'published' && q.status !== 'review') continue

    const check = validateQuestionQuality({
      title: q.title,
      content: q.content,
      keyPoints: q.keyPoints,
      referenceAnswer: q.referenceAnswer,
      scoringRubric: q.scoringRubric,
      status: q.status,
    })
    if (!check.ok) {
      items.push({ id: q.id, title: q.title, status: q.status, issues: check.issues })
    }

    for (const other of questions) {
      if (other.id >= q.id) continue
      if (other.status !== 'published' && other.status !== 'review') continue
      const pairKey = [q.id, other.id].sort().join(':')
      if (seen.has(pairKey)) continue
      const sim = titleSimilarity(q.title, other.title)
      if (sim >= DUPLICATE_THRESHOLD) {
        seen.add(pairKey)
        duplicates.push({
          id: q.id,
          title: q.title,
          duplicateOf: { id: other.id, title: other.title },
        })
      }
    }
  }

  const failedIds = new Set([...items.map((i) => i.id), ...duplicates.map((d) => d.id)])
  const checked = questions.filter((q) => q.status === 'published' || q.status === 'review')

  return {
    total: checked.length,
    passed: checked.length - failedIds.size,
    failed: failedIds.size,
    duplicates,
    items,
    ranAt: new Date().toISOString(),
  }
}

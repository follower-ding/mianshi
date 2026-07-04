import { listQuestions, type Question, type QuestionType, type QuestionPlanItem } from './store.js'

export type { QuestionPlanItem }

const POSITION_CATEGORIES: Record<string, string[]> = {
  'Java 后端开发': ['Java', '数据库', '中间件', '计算机网络'],
  'Go 后端开发': ['中间件', '数据库', '计算机网络'],
  'Python 后端开发': ['数据库', '中间件', '计算机网络'],
  '前端开发': ['前端'],
}

const POSITION_DEFAULT = 'Java 后端开发'
const COVERAGE_TYPES: QuestionType[] = ['基础', '项目', '系统设计', '算法', '开放']

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function matchesPosition(q: Question, position: string): boolean {
  if (q.position?.length) {
    return q.position.includes(position)
  }
  const cats = POSITION_CATEGORIES[position] ?? POSITION_CATEGORIES[POSITION_DEFAULT]
  return cats.includes(q.category)
}

function isInterviewReady(q: Question): boolean {
  if (q.status && q.status !== 'published') return false
  return Boolean(q.content?.trim())
}

export function targetDifficulties(experience: string): string[] {
  const exp = experience.toLowerCase()
  if (/应届|实习|在校|0\s*[-~到]?1\s*年|1\s*年以内|未指定|不限/.test(exp)) {
    return ['简单', '中等']
  }
  if (/[1-3]\s*年|一到三|1\s*[-~到]\s*3/.test(exp)) {
    return ['简单', '中等']
  }
  if (/[3-5]\s*年|三到五|3\s*[-~到]\s*5/.test(exp)) {
    return ['中等', '困难']
  }
  if (/[5-9]\d*\s*年|五|资深|高级|专家|架构/.test(exp)) {
    return ['中等', '困难']
  }
  return ['简单', '中等', '困难']
}

function difficultyFit(q: Question, targets: string[]): number {
  const idx = targets.indexOf(q.difficulty)
  return idx >= 0 ? targets.length - idx : 0
}

function toPlanItem(q: Question): QuestionPlanItem {
  return {
    questionId: q.id,
    title: q.title,
    content: q.content,
    keyPoints: q.keyPoints ?? [],
    scoringRubric: q.scoringRubric ?? '按要点覆盖度与表达深度综合评分',
    referenceAnswer: q.referenceAnswer ?? '',
    difficulty: q.difficulty,
    type: q.type ?? '基础',
    followUpTemplates: q.followUpTemplates ?? [],
    category: q.category,
  }
}

export function pickFollowUp(missingPoints: string[], templates: string[]): string {
  if (!templates.length) {
    return missingPoints[0]
      ? `能再详细说说「${missingPoints[0]}」这部分吗？`
      : '能再补充一些细节吗？'
  }

  for (const point of missingPoints) {
    const keyword = point.slice(0, 4)
    const matched = templates.find(
      (t) => t.includes(keyword) || point.split(/[，,、\s]+/).some((term) => term.length >= 2 && t.includes(term)),
    )
    if (matched) return matched
  }

  return templates[Math.abs(missingPoints.join('').length) % templates.length]
}

export function countTypeCoverage(plan: QuestionPlanItem[]): number {
  return new Set(plan.map((q) => q.type)).size
}

export async function buildPlanWithPinnedQuestion(
  pinnedId: string,
  position: string,
  totalCount: number,
  experience = '未指定',
): Promise<QuestionPlanItem[]> {
  const all = await listQuestions()
  const pinned = all.find((q) => q.id === pinnedId)
  if (!pinned || !isInterviewReady(pinned)) {
    return selectQuestionsForInterview(position, totalCount, [], experience)
  }
  const restCount = Math.max(0, totalCount - 1)
  const rest = await selectQuestionsForInterview(position, restCount, [pinnedId], experience)
  return [toPlanItem(pinned), ...rest]
}

export async function selectQuestionsForInterview(
  position: string,
  count = 4,
  excludeIds: string[] = [],
  experience = '未指定',
): Promise<QuestionPlanItem[]> {
  const pool = (await listQuestions()).filter(
    (q) => isInterviewReady(q) && matchesPosition(q, position) && !excludeIds.includes(q.id),
  )

  const withKeyPoints = pool.filter((q) => q.keyPoints?.length)
  const source = withKeyPoints.length >= count ? withKeyPoints : pool
  if (!source.length) return []

  const targets = targetDifficulties(experience)
  const ranked = [...source].sort((a, b) => difficultyFit(b, targets) - difficultyFit(a, targets))

  const picked: Question[] = []
  const usedIds = new Set<string>()

  const coverageTarget = Math.min(3, count)
  const availableTypes = shuffle(
    COVERAGE_TYPES.filter((type) => ranked.some((q) => (q.type ?? '基础') === type)),
  )

  for (const type of availableTypes) {
    if (picked.length >= coverageTarget) break
    const candidate = ranked.find((q) => (q.type ?? '基础') === type && !usedIds.has(q.id))
    if (candidate) {
      picked.push(candidate)
      usedIds.add(candidate.id)
    }
  }

  for (const q of shuffle(ranked)) {
    if (picked.length >= count) break
    if (!usedIds.has(q.id)) {
      picked.push(q)
      usedIds.add(q.id)
    }
  }

  return picked.map(toPlanItem)
}

export function getCurrentPlanItem(plan: QuestionPlanItem[], index: number): QuestionPlanItem | null {
  return plan[index] ?? null
}

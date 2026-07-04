export type DimensionScores = {
  accuracy: number
  depth: number
  structure: number
  practice: number
}

export type RoundScoreResult = {
  dimensions: DimensionScores
  total: number
  feedback: string
  hitPoints: string[]
  missingPoints: string[]
}

const STRUCTURE_MARKERS = ['首先', '其次', '最后', '第一', '第二', '总结', '另外', '此外', '因此']
const PRACTICE_MARKERS = ['项目', '实践', '经验', '线上', '生产', '案例', '我们', '曾经', '实际']

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, '')
}

/** 判断 keyPoint 是否被回答命中（关键词子串匹配） */
export function isKeyPointHit(answer: string, keyPoint: string): boolean {
  const a = normalize(answer)
  if (!a || a.length < 2) return false

  const terms = keyPoint
    .split(/[，,、；;。/\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)

  if (terms.length === 0) {
    return a.includes(normalize(keyPoint))
  }

  const hitCount = terms.filter((t) => a.includes(normalize(t))).length
  return hitCount >= Math.ceil(terms.length * 0.5)
}

function scoreDimensions(answer: string, hitRatio: number): DimensionScores {
  const len = answer.trim().length
  const accuracy = Math.min(5, Math.round(hitRatio * 5))
  const depth = len >= 200 ? 5 : len >= 120 ? 4 : len >= 60 ? 3 : len >= 30 ? 2 : 1
  const structure = STRUCTURE_MARKERS.some((m) => answer.includes(m)) ? 4 : len >= 80 ? 3 : 2
  const practice = PRACTICE_MARKERS.some((m) => answer.includes(m)) ? 4 : 2

  return { accuracy, depth, structure, practice }
}

function buildFeedback(hit: string[], missing: string[], total: number): string {
  if (total >= 16) {
    return hit.length
      ? `回答较完整，命中要点：${hit.slice(0, 2).join('、')}。`
      : '回答较完整，表达清晰。'
  }
  if (total >= 12) {
    return missing.length
      ? `基础尚可，建议补充：${missing.slice(0, 2).join('、')}。`
      : '基础掌握不错，可再深入底层原理。'
  }
  if (total >= 8) {
    return missing.length
      ? `要点遗漏较多，需加强：${missing.slice(0, 2).join('、')}。`
      : '回答偏浅，建议结合项目经验展开。'
  }
  return missing.length
    ? `回答不足，关键要点：${missing.slice(0, 2).join('、')}。`
    : '回答过于简略，请围绕考点展开。'
}

/** 基于 keyPoints 的规则评分（Demo 与 LLM fallback 共用） */
export function scoreByKeyPoints(
  answer: string,
  keyPoints: string[],
  referenceAnswer?: string,
): RoundScoreResult {
  const base = scoreByKeyPointsInternal(answer, keyPoints)
  if (!referenceAnswer?.trim() || answer.trim().length < 40) return base

  const refScore = scoreByKeyPointsInternal(referenceAnswer, keyPoints)
  const overlap = textOverlapRatio(answer, referenceAnswer)
  if (overlap >= 0.28 || (base.total >= 10 && refScore.total >= 14)) {
    const boosted = Math.max(base.total, Math.min(20, refScore.total))
    if (boosted > base.total) {
      return {
        ...base,
        total: boosted,
        feedback:
          boosted >= 16
            ? '回答较完整，要点覆盖较好。'
            : base.feedback || '基础掌握不错，可再补充细节与案例。',
        hitPoints: refScore.hitPoints.length > base.hitPoints.length ? refScore.hitPoints : base.hitPoints,
        missingPoints: base.missingPoints,
      }
    }
  }
  return base
}

function textOverlapRatio(a: string, b: string): number {
  const tokens = (text: string) =>
    [...new Set(text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, ' ').split(/\s+/).filter((t) => t.length >= 2))]
  const ta = tokens(a)
  const tb = new Set(tokens(b))
  if (ta.length === 0 || tb.size === 0) return 0
  const hit = ta.filter((t) => tb.has(t) || [...tb].some((u) => u.includes(t) || t.includes(u))).length
  return hit / ta.length
}

function scoreByKeyPointsInternal(answer: string, keyPoints: string[]): RoundScoreResult {
  if (!keyPoints.length) {
    const len = answer.trim().length
    const total = len >= 150 ? 14 : len >= 80 ? 11 : len >= 40 ? 8 : len >= 15 ? 5 : 2
    return {
      dimensions: scoreDimensions(answer, total / 20),
      total,
      feedback: buildFeedback([], [], total),
      hitPoints: [],
      missingPoints: [],
    }
  }

  const hitPoints = keyPoints.filter((kp) => isKeyPointHit(answer, kp))
  const missingPoints = keyPoints.filter((kp) => !isKeyPointHit(answer, kp))
  const hitRatio = hitPoints.length / keyPoints.length

  const dimensions = scoreDimensions(answer, hitRatio)
  const baseScore = Math.round((hitPoints.length / keyPoints.length) * 16)
  const depthBonus = answer.trim().length >= 100 ? 2 : answer.trim().length >= 50 ? 1 : 0
  const total = Math.min(20, Math.max(0, baseScore + depthBonus))
  const feedback = buildFeedback(hitPoints, missingPoints, total)

  return { dimensions, total, feedback, hitPoints, missingPoints }
}

export type LlmRubricScore = {
  accuracy?: number
  depth?: number
  structure?: number
  practice?: number
  total?: number
  feedback?: string
}

function clampDim(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.min(5, Math.max(0, Math.round(value)))
}

export function mergeLlmScore(
  ruleScore: RoundScoreResult,
  llmScore: number,
  llmFeedback: string,
  llmDims?: Pick<LlmRubricScore, 'accuracy' | 'depth' | 'structure' | 'practice'>,
): RoundScoreResult {
  const blended = Math.round(ruleScore.total * 0.6 + llmScore * 0.4)
  const total = Math.min(20, Math.max(0, blended))

  const dimensions: DimensionScores = {
    accuracy: clampDim(llmDims?.accuracy) ?? ruleScore.dimensions.accuracy,
    depth: clampDim(llmDims?.depth) ?? ruleScore.dimensions.depth,
    structure: clampDim(llmDims?.structure) ?? ruleScore.dimensions.structure,
    practice: clampDim(llmDims?.practice) ?? ruleScore.dimensions.practice,
  }

  return {
    ...ruleScore,
    dimensions,
    total,
    feedback: llmFeedback || ruleScore.feedback,
  }
}

export function buildRubricScorePrompt(
  position: string,
  question: string,
  answer: string,
  keyPoints: string[],
  scoringRubric: string,
) {
  const pointsText = keyPoints.length ? keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n') : '（无预置要点，按通用标准评）'
  return [
    {
      role: 'system' as const,
      content: `你是面试评分助手。按 Rubric 对候选人回答打分。
维度（各 0-5）：accuracy 准确性、depth 深度、structure 结构、practice 实战。
总分 total = 四维度之和，范围 0-20。
只输出 JSON：
{"accuracy":4,"depth":3,"structure":4,"practice":3,"total":14,"feedback":"一句中文反馈"}`,
    },
    {
      role: 'user' as const,
      content: `岗位：${position}
问题：${question}
得分要点：
${pointsText}
评分说明：${scoringRubric || '按技术准确性、深度、结构、实战综合评分'}
回答：${answer}`,
    },
  ]
}

import type { Question } from '../types/entities.js'
import { scoreByKeyPoints } from './scoring.js'

export type QuizScorePayload = {
  score: number
  accuracy: number
  depth: number
  structure: number
  practice: number
  feedback: string
  strengths: string[]
  weaknesses: string[]
  comparison: string
  source: 'llm' | 'demo'
}

function dimToPct(value: number, max: number) {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

/** 基于 keyPoints 的规则评分 — LLM 不可用时的降级 */
export function scoreQuizByRules(answer: string, question: Question): QuizScorePayload {
  const rule = scoreByKeyPoints(answer, question.keyPoints ?? [])
  return {
    score: dimToPct(rule.total, 20),
    accuracy: dimToPct(rule.dimensions.accuracy, 5),
    depth: dimToPct(rule.dimensions.depth, 5),
    structure: dimToPct(rule.dimensions.structure, 5),
    practice: dimToPct(rule.dimensions.practice, 5),
    feedback: `${rule.feedback}（规则评分，配置 LLM 后可获得更细 AI 评价）`,
    strengths: rule.hitPoints.slice(0, 3),
    weaknesses: rule.missingPoints.slice(0, 3),
    comparison:
      rule.missingPoints.length > 0
        ? `与参考答案要点相比，尚未覆盖：${rule.missingPoints.slice(0, 3).join('、')}。`
        : '要点覆盖较好，可结合具体项目细节进一步展开。',
    source: 'demo',
  }
}

export function mapLlmQuizResult(result: Record<string, unknown>): Omit<QuizScorePayload, 'source'> {
  return {
    score: Number(result.score ?? 0),
    accuracy: Number(result.accuracy ?? 0),
    depth: Number(result.depth ?? 0),
    structure: Number(result.structure ?? 0),
    practice: Number(result.practice ?? 0),
    feedback: String(result.feedback ?? '继续加油！'),
    strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.map(String) : [],
    comparison: String(result.comparison ?? ''),
  }
}

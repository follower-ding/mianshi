import type { Question } from '../../api/client'

export type QuestionQualityMeta = {
  complete: boolean
  missing: string[]
  keyPointCount: number
  hasAnswer: boolean
  hasRubric: boolean
  hasFollowUps: boolean
}

export function getQuestionQualityMeta(q: Question): QuestionQualityMeta {
  const missing: string[] = []
  if (!q.content?.trim()) missing.push('题干')
  if (!q.keyPoints?.length) missing.push('得分要点')
  else if (q.keyPoints.length < 2) missing.push('要点≥2条')
  if (!q.referenceAnswer?.trim()) missing.push('参考答案')
  else if (q.referenceAnswer.trim().length < 30) missing.push('答案≥30字')
  if (!q.scoringRubric?.trim()) missing.push('评分标准')
  if (!q.followUpTemplates?.length) missing.push('追问模板')

  const basicComplete = Boolean(q.keyPoints?.length) && Boolean(q.referenceAnswer?.trim())

  return {
    complete: basicComplete,
    missing,
    keyPointCount: q.keyPoints?.length ?? 0,
    hasAnswer: Boolean(q.referenceAnswer?.trim()),
    hasRubric: Boolean(q.scoringRubric?.trim()),
    hasFollowUps: Boolean(q.followUpTemplates?.length),
  }
}

export function truncateText(text: string | undefined, max = 80) {
  const t = text?.trim() ?? ''
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function formatQuestionDate(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatTagList(tags: string[] | undefined, max = 2) {
  const list = tags ?? []
  if (!list.length) return '—'
  if (list.length <= max) return list.join(' · ')
  return `${list.slice(0, max).join(' · ')} +${list.length - max}`
}

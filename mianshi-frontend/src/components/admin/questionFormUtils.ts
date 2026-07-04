import type { Question } from '../../api/client'
import { normalizeMarkdownImagePaths } from '../../lib/markdownImage'
import type { PublicPreviewQuestion } from '../question-bank/QuestionPublicPreview'
import { questionToPublicPreview } from '../../lib/questionPreviewUtils'

export const DIFFICULTIES = ['简单', '中等', '困难'] as const
export const QUESTION_TYPES = ['基础', '项目', '系统设计', '算法', '开放'] as const
/** 表单可选发布意图（不含 archived，归档在列表批量操作） */
export const QUESTION_PUBLISH_INTENTS = ['draft', 'review', 'published'] as const
export type QuestionPublishIntent = (typeof QUESTION_PUBLISH_INTENTS)[number]
export const QUESTION_STATUSES = ['draft', 'review', 'published', 'archived'] as const

export type QuestionFormData = {
  title: string
  category: string
  difficulty: (typeof DIFFICULTIES)[number]
  type: (typeof QUESTION_TYPES)[number]
  tags: string
  content: string
  status: (typeof QUESTION_STATUSES)[number]
  keyPoints: string
  referenceAnswer: string
  scoringRubric: string
  followUpTemplates: string
}

export const emptyQuestionForm: QuestionFormData = {
  title: '',
  category: 'Java',
  difficulty: '中等',
  type: '基础',
  tags: '',
  content: '',
  status: 'draft',
  keyPoints: '',
  referenceAnswer: '',
  scoringRubric: '',
  followUpTemplates: '',
}

export function questionToForm(q: Question): QuestionFormData {
  return {
    title: q.title,
    category: q.category,
    difficulty: q.difficulty as QuestionFormData['difficulty'],
    type: (q.type as QuestionFormData['type']) ?? '基础',
    tags: q.tags.join(', '),
    content: q.content,
    status: (q.status as QuestionFormData['status']) ?? 'draft',
    keyPoints: (q.keyPoints ?? []).join('\n'),
    referenceAnswer: q.referenceAnswer ?? '',
    scoringRubric: q.scoringRubric ?? '',
    followUpTemplates: (q.followUpTemplates ?? []).join('\n'),
  }
}

export function formToPayload(form: QuestionFormData) {
  const tags = form.tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean)
  return {
    title: form.title.trim(),
    category: form.category,
    difficulty: form.difficulty,
    type: form.type,
    tags: tags.length ? tags : [form.category],
    content: form.content.trim() || form.title.trim(),
    status: form.status,
    keyPoints: form.keyPoints.split(/\n/).map((t) => t.trim()).filter(Boolean),
    referenceAnswer: normalizeMarkdownImagePaths(form.referenceAnswer.trim()),
    scoringRubric: normalizeMarkdownImagePaths(form.scoringRubric.trim()),
    followUpTemplates: form.followUpTemplates.split(/\n/).map((t) => t.trim()).filter(Boolean),
  }
}

export type QuestionFormStep = 'stem' | 'answer' | 'publish'

export const QUESTION_FORM_STEPS: {
  id: QuestionFormStep
  anchor: string
  label: string
  hint: string
}[] = [
  { id: 'stem', anchor: 'section-stem', label: '题干', hint: '标题与面试提问' },
  { id: 'answer', anchor: 'section-answer', label: '参考答案', hint: '题库答案与得分要点' },
  { id: 'publish', anchor: 'section-publish', label: '分类与发布', hint: '方向、难度、状态' },
]

export function getStepCompletion(form: QuestionFormData) {
  const title = form.title.trim()
  const content = form.content.trim()
  const keyPoints = form.keyPoints
    .split(/\n/)
    .map((t) => t.trim())
    .filter(Boolean)
  const referenceAnswer = form.referenceAnswer.trim()
  const needsQuality = form.status === 'review' || form.status === 'published'

  return {
    stem: title.length >= 2 && content.length >= 2,
    answer:
      keyPoints.length >= (needsQuality ? 2 : 1) &&
      referenceAnswer.length >= (needsQuality ? 30 : 1),
    publish:
      Boolean(form.category && form.difficulty && form.type) &&
      (!needsQuality ||
        (keyPoints.length >= 2 && referenceAnswer.length >= 30)),
  }
}

/** 录入完成度 0–100，用于侧栏进度 */
export function getQuestionCompletionPct(form: QuestionFormData) {
  const c = getStepCompletion(form)
  return Math.round(([c.stem, c.answer, c.publish].filter(Boolean).length / 3) * 100)
}

/** 智能下一步 — 侧栏/引导条共用 */
export function getQuestionNextStep(form: QuestionFormData): {
  step: QuestionFormStep
  label: string
  anchor: string
} | null {
  const c = getStepCompletion(form)
  if (!c.stem) {
    return { step: 'stem', label: '填写题干', anchor: 'section-stem' }
  }
  if (!c.answer) {
    return { step: 'answer', label: '补全参考答案', anchor: 'section-answer' }
  }
  if (!c.publish) {
    return { step: 'publish', label: '完善分类与发布', anchor: 'section-publish' }
  }
  return null
}

/** 表单 → 用户端预览数据结构 */
export function formToPreviewQuestion(form: QuestionFormData): PublicPreviewQuestion {
  const tags = form.tags
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean)
  return {
    title: form.title.trim() || '（未填写标题）',
    content: form.content.trim(),
    category: form.category,
    difficulty: form.difficulty,
    type: form.type,
    tags: tags.length ? tags : [form.category],
    keyPoints: form.keyPoints.split(/\n/).map((t) => t.trim()).filter(Boolean),
    referenceAnswer: form.referenceAnswer.trim(),
    scoringRubric: form.scoringRubric.trim(),
    followUpTemplates: form.followUpTemplates.split(/\n/).map((t) => t.trim()).filter(Boolean),
  }
}

export function questionToPreviewQuestion(q: Question): PublicPreviewQuestion {
  return questionToPublicPreview(q)
}

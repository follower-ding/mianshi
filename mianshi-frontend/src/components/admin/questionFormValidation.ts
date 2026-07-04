import type { QuestionFormData } from './questionFormUtils'

export type QuestionFormErrors = Partial<Record<keyof QuestionFormData, string>>

export type QuestionFormValidation = {
  ok: boolean
  errors: QuestionFormErrors
  messages: string[]
  focusTab: 'basic' | 'quality'
}

function parseKeyPoints(form: QuestionFormData) {
  return form.keyPoints
    .split(/\n/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function validateQuestionForm(form: QuestionFormData): QuestionFormValidation {
  const errors: QuestionFormErrors = {}
  const messages: string[] = []
  let focusTab: 'basic' | 'quality' = 'basic'

  const title = form.title.trim()
  const content = form.content.trim() || title
  const keyPoints = parseKeyPoints(form)
  const referenceAnswer = form.referenceAnswer.trim()
  const status = form.status

  if (title.length < 2) {
    errors.title = '标题至少 2 字'
    messages.push(errors.title)
  }

  if (content.length < 2) {
    errors.content = '题干至少 2 字'
    messages.push(errors.content)
  }

  if (status === 'review' || status === 'published') {
    if (content.length < 10) {
      errors.content = '提交审核/发布时题干至少 10 字'
      messages.push(errors.content)
    }
    if (!keyPoints.length) {
      errors.keyPoints = '审核/发布需填写得分要点'
      messages.push(errors.keyPoints)
      focusTab = 'quality'
    } else if (keyPoints.length < 2) {
      errors.keyPoints = '得分要点至少 2 条'
      messages.push(errors.keyPoints)
      focusTab = 'quality'
    }
    if (!referenceAnswer) {
      errors.referenceAnswer = '审核/发布需填写参考答案'
      messages.push(errors.referenceAnswer)
      focusTab = 'quality'
    } else if (referenceAnswer.length < 30) {
      errors.referenceAnswer = '参考答案至少 30 字'
      messages.push(errors.referenceAnswer)
      focusTab = 'quality'
    }
  }

  const uniqueMessages = [...new Set(messages)]
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    messages: uniqueMessages,
    focusTab,
  }
}

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof Error && 'issues' in error) {
    const issues = (error as { issues?: { path?: string; message: string }[] }).issues
    if (issues?.length) {
      return issues.map((i) => i.message).join('；')
    }
  }
  if (error instanceof Error) return error.message
  return '保存失败'
}

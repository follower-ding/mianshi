import type { Tab } from './QuestionDetailPanel'
import type { Question } from '../../api/client'
import { extractMarkdownHeadings } from '../../lib/markdownHeadings'
import {
  referenceAnswerHasKeyPointsSection,
  shouldShowKeyPointsSection,
  shouldShowQuestionSection,
} from './questionDisplayUtils'

export function getTocForTab(tab: Tab, question?: Question): { id: string; label: string }[] {
  switch (tab) {
    case 'answer': {
      const items: { id: string; label: string }[] = []

      if (question && shouldShowQuestionSection(question.content, question.title)) {
        items.push({ id: 'section-question', label: '题目' })
      }

      if (question && shouldShowKeyPointsSection(question.keyPoints, question.referenceAnswer)) {
        items.push({ id: 'section-keypoints', label: '回答重点' })
      }

      if (question?.referenceAnswer) {
        if (!referenceAnswerHasKeyPointsSection(question.referenceAnswer)) {
          items.push({ id: 'section-ref', label: '参考答案' })
        }
        for (const h of extractMarkdownHeadings(question.referenceAnswer, 'ref')) {
          items.push({ id: h.id, label: h.label })
        }
      }

      if (question?.scoringRubric) {
        items.push({ id: 'section-rubric', label: '扩展知识' })
        for (const h of extractMarkdownHeadings(question.scoringRubric, 'rubric')) {
          items.push({ id: h.id, label: h.label })
        }
      }
      if (question?.followUpTemplates?.length) {
        items.push({ id: 'section-followup-preview', label: '面试官追问' })
      }
      return items.length ? items : [{ id: 'section-ref', label: '参考答案' }]
    }
    case 'quiz':
      return [
        { id: 'section-quiz', label: '题目' },
        { id: 'section-quiz-input', label: '你的回答' },
      ]
    case 'followup':
      return [{ id: 'section-followup', label: '面试问答' }]
    case 'interview':
      return [{ id: 'section-interview', label: '开始面试' }]
    default:
      return []
  }
}

import type { Question } from '../api/client'
import type { PublicPreviewQuestion } from '../components/question-bank/QuestionPublicPreview'

export function questionToPublicPreview(q: Question): PublicPreviewQuestion {
  return {
    title: q.title,
    content: q.content,
    category: q.category,
    difficulty: q.difficulty,
    type: q.type,
    tags: q.tags,
    keyPoints: q.keyPoints,
    referenceAnswer: q.referenceAnswer,
    scoringRubric: q.scoringRubric,
    followUpTemplates: q.followUpTemplates,
    views: q.views,
  }
}

import { computeImportQuestionWarnings } from '../src/services/smart-import-batch.js'
import { scoreQuizByRules } from '../src/services/quiz-score.js'
import type { Question } from '../src/types/entities.js'

let failed = false

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed = true
  }
}

const mockQuestion = {
  id: 'q1',
  title: 'HashMap 原理',
  content: '请说明 HashMap 底层结构',
  keyPoints: ['数组', '链表', '红黑树', '扩容'],
  referenceAnswer: '数组+链表/红黑树',
  scoringRubric: '',
  status: 'published' as const,
  category: 'Java',
  difficulty: '中等',
  type: '基础',
  tags: [],
  followUpTemplates: [],
  views: 0,
  createdAt: '',
  updatedAt: '',
} satisfies Question

const demoScore = scoreQuizByRules('HashMap 使用数组和链表，扩容时 rehash', mockQuestion)
assert(demoScore.source === 'demo', 'quiz demo source')
assert(demoScore.score >= 0 && demoScore.score <= 100, 'quiz score range')
assert(demoScore.feedback.length > 0, 'quiz feedback')

const warnings = computeImportQuestionWarnings({ title: 'x', keyPoints: [], referenceAnswer: '' })
assert(warnings.includes('缺少回答要点'), 'warnings detect missing keyPoints')
assert(warnings.includes('缺少参考答案'), 'warnings detect missing answer')

const fullWarnings = computeImportQuestionWarnings({
  keyPoints: ['a'],
  referenceAnswer: 'ans',
  scoringRubric: 'rubric',
  followUpTemplates: ['q1'],
})
assert(fullWarnings.length === 0, 'complete question has no warnings')

if (failed) process.exit(1)
console.log('quiz-score: ok')

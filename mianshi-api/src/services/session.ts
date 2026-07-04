import {
  getInterviewSession as loadSession,
  saveInterviewSession,
  deleteInterviewSession,
  newId,
  type RoundRecord,
} from './store.js'
import {
  buildPlanWithPinnedQuestion,
  selectQuestionsForInterview,
  type QuestionPlanItem,
} from './question-selector.js'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export type { RoundRecord, QuestionPlanItem }
export type { InterviewSession } from '../types/entities.js'

export async function createSession(
  position: string,
  experience: string,
  roundCount = 4,
  userId?: string,
  pinnedQuestionId?: string,
  applicationId?: string,
  companyName?: string,
) {
  const questionPlan = pinnedQuestionId
    ? await buildPlanWithPinnedQuestion(pinnedQuestionId, position, roundCount, experience)
    : await selectQuestionsForInterview(position, roundCount, [], experience)
  const session = {
    id: newId('sess_'),
    userId,
    position,
    experience,
    pinnedQuestionId,
    applicationId,
    companyName,
    questionIndex: 0,
    totalScore: 0,
    answerCount: 0,
    followUpActive: false,
    createdAt: Date.now(),
    questionPlan,
    rounds: [] as RoundRecord[],
  }
  await saveInterviewSession(session)
  return session
}

export async function getSession(id: string) {
  const session = await loadSession(id)
  if (!session) return null
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    await deleteInterviewSession(id)
    return null
  }
  return session
}

export async function updateSession(session: Parameters<typeof saveInterviewSession>[0]) {
  await saveInterviewSession(session)
}

export async function recordRound(
  sessionId: string,
  question: string,
  answer: string,
  score: number,
  feedback: string,
  questionId?: string,
  dimensions?: RoundRecord['dimensions'],
  options?: { advanceIndex?: boolean },
) {
  const session = await getSession(sessionId)
  if (!session) return
  const planItem = session.questionPlan[session.questionIndex]
  const topic =
    planItem?.title ??
    (question.replace(/[？?].*$/, '').slice(0, 40) || `第 ${session.answerCount + 1} 题`)
  session.rounds.push({ topic, question, answer, score, feedback, questionId, dimensions })
  session.totalScore += score
  session.answerCount += 1
  if (options?.advanceIndex !== false) {
    session.questionIndex += 1
  }
  await saveInterviewSession(session)
}

export function getCurrentQuestion(session: { questionPlan: QuestionPlanItem[]; questionIndex: number }) {
  return session.questionPlan[session.questionIndex] ?? null
}

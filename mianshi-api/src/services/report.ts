import { completeChat, isLlmConfigured } from './llm.js'
import {
  buildFinishPrompt,
  type RoundRecord,
} from './demo-interview.js'
import { getSession } from './session.js'
import {
  createInterviewReport,
  type InterviewReport,
  type TranscriptItem,
} from './store.js'
import { updateJobApplication } from './jobs-store.js'

export type ReportContent = {
  summary: string
  strengths: string[]
  improvements: string[]
  overallRating: string
  nextSteps: string[]
  scoreBreakdown: { topic: string; score: number; comment: string }[]
}

function buildDemoReportContent(
  position: string,
  rounds: RoundRecord[],
  totalScore: number,
): ReportContent {
  const avg = rounds.length ? Math.round(totalScore / rounds.length) : 0
  const rating = totalScore >= 80 ? '优秀' : totalScore >= 60 ? '良好' : totalScore >= 40 ? '合格' : '待提升'

  return {
    summary: `本次 ${position} 模拟面试共 ${rounds.length} 轮，总分 ${totalScore} 分（均分约 ${avg}）。${
      rounds.length >= 3
        ? '整体表现稳定，建议继续强化薄弱知识点。'
        : '轮次较少，建议多练几轮以全面评估。'
    }`,
    strengths: rounds.filter((r) => r.score >= 14).map((r) => `${r.topic}：回答较完整`),
    improvements: rounds.filter((r) => r.score < 12).map((r) => `${r.topic}：需加强`),
    overallRating: rating,
    nextSteps: [
      '复盘每道错题，整理标准答案要点',
      '结合项目经验补充实战案例',
      '针对薄弱项做专项刷题',
    ],
    scoreBreakdown: rounds.map((r) => ({
      topic: r.topic,
      score: r.score,
      comment: r.feedback,
    })),
  }
}

async function generateReportContent(
  position: string,
  history: string,
  rounds: RoundRecord[],
  totalScore: number,
): Promise<ReportContent> {
  if (!isLlmConfigured()) {
    return buildDemoReportContent(position, rounds, totalScore)
  }

  try {
    const raw = await completeChat(
      buildFinishPrompt(position, history, totalScore, rounds.length),
      { json: true, maxTokens: 800 },
    )
    const parsed = JSON.parse(raw) as Partial<ReportContent>
    const demo = buildDemoReportContent(position, rounds, totalScore)
    return {
      summary: parsed.summary ?? demo.summary,
      strengths: parsed.strengths?.length ? parsed.strengths : demo.strengths,
      improvements: parsed.improvements?.length ? parsed.improvements : demo.improvements,
      overallRating: parsed.overallRating ?? demo.overallRating,
      nextSteps: parsed.nextSteps?.length ? parsed.nextSteps : demo.nextSteps,
      scoreBreakdown: parsed.scoreBreakdown?.length ? parsed.scoreBreakdown : demo.scoreBreakdown,
    }
  } catch {
    return buildDemoReportContent(position, rounds, totalScore)
  }
}

export async function finalizeInterviewReport(
  sessionId: string,
  transcript: TranscriptItem[],
): Promise<InterviewReport | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  const history = transcript
    .map((m) => `${m.role === 'interviewer' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n')

  const content = await generateReportContent(
    session.position,
    history,
    session.rounds,
    session.totalScore,
  )

  const report = await createInterviewReport({
    sessionId,
    userId: session.userId,
    position: session.position,
    experience: session.experience,
    totalScore: session.totalScore,
    answerCount: session.answerCount,
    transcript,
    rounds: session.rounds,
    sourceQuestionId: session.pinnedQuestionId ?? session.questionPlan[0]?.questionId,
    sourceCategory: session.questionPlan[0]?.category,
    applicationId: session.applicationId,
    ...content,
  })

  if (session.applicationId) {
    await updateJobApplication(session.applicationId, {
      reportId: report.id,
      status: 'interview_done',
      sessionId: session.id,
    })
  }

  return report
}

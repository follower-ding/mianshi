import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
  interviewAssistSchema,
  interviewChatSchema,
  interviewModes,
  interviewStartSchema,
} from '../schemas/index.js'
import {
  buildAssistPrompt,
  buildInterviewSystemPrompt,
  getDemoAssist,
  getDemoOpeningMessage,
  getDemoReply,
  getAssistFromReference,
  isInterviewFinished,
  appendRoundHint,
  recordRound,
} from '../services/demo-interview.js'
import { createSession, getSession, getCurrentQuestion, updateSession } from '../services/session.js'
import { completeChat, isLlmConfigured, streamChat, tryCompleteChat } from '../services/llm.js'
import { finalizeInterviewReport } from '../services/report.js'
import { buildRubricScorePrompt, mergeLlmScore, scoreByKeyPoints, type LlmRubricScore } from '../services/scoring.js'
import { incrementMetric } from '../services/metrics.js'
import type { TranscriptItem, InterviewSession } from '../types/entities.js'
import { authMiddleware, optionalUser, type AuthVariables } from '../middleware/auth.js'

export const interviewRoutes = new Hono<{ Variables: AuthVariables }>()

interviewRoutes.use('*', authMiddleware)

function buildTranscript(
  history: TranscriptItem[],
  answer: string,
  reply: string,
): TranscriptItem[] {
  return [...history, { role: 'candidate', content: answer }, { role: 'interviewer', content: reply }]
}

function toReportPayload(saved: Awaited<ReturnType<typeof finalizeInterviewReport>>) {
  if (!saved) return { reportId: null, report: null }
  return {
    reportId: saved.id,
    report: {
      summary: saved.summary,
      strengths: saved.strengths,
      improvements: saved.improvements,
      overallRating: saved.overallRating,
      nextSteps: saved.nextSteps,
      scoreBreakdown: saved.scoreBreakdown,
    },
  }
}

async function maybeFinalize(
  sessionId: string,
  history: TranscriptItem[],
  answer: string,
  reply: string,
  finished: boolean,
) {
  if (!finished) return { reportId: null, report: null }
  await incrementMetric('interview.session_finished')
  const saved = await finalizeInterviewReport(sessionId, buildTranscript(history, answer, reply))
  return toReportPayload(saved)
}

function planItemForAnswer(session: InterviewSession) {
  const idx = session.questionIndex
  return session.questionPlan[idx] ?? session.questionPlan[idx - 1] ?? null
}

async function scoreAnswer(
  session: InterviewSession,
  question: string,
  answer: string,
): Promise<{
  scoreDelta: number
  feedback: string
  dimensions: ReturnType<typeof scoreByKeyPoints>['dimensions']
  missingPoints: string[]
}> {
  const item = planItemForAnswer(session)
  const keyPoints = item?.keyPoints ?? []
  const rubric = item?.scoringRubric ?? ''
  const ruleScore = scoreByKeyPoints(answer, keyPoints, item?.referenceAnswer)

  if (!isLlmConfigured()) {
    await incrementMetric('scoring.rule_only')
    return {
      scoreDelta: ruleScore.total,
      feedback: ruleScore.feedback,
      dimensions: ruleScore.dimensions,
      missingPoints: ruleScore.missingPoints,
    }
  }

  try {
    const scoreRaw = await completeChat(
      buildRubricScorePrompt(session.position, question, answer, keyPoints, rubric),
      { json: true, maxTokens: 250 },
    )
    const parsed = JSON.parse(scoreRaw) as LlmRubricScore
    const merged = mergeLlmScore(
      ruleScore,
      parsed.total ?? ruleScore.total,
      parsed.feedback ?? '',
      parsed,
    )
    await incrementMetric('scoring.llm_blended')
    return {
      scoreDelta: merged.total,
      feedback: merged.feedback,
      dimensions: merged.dimensions,
      missingPoints: ruleScore.missingPoints,
    }
  } catch {
    await incrementMetric('scoring.rule_only')
    return {
      scoreDelta: ruleScore.total,
      feedback: ruleScore.feedback,
      dimensions: ruleScore.dimensions,
      missingPoints: ruleScore.missingPoints,
    }
  }
}

async function scoreAndAdvance(
  session: InterviewSession,
  sessionId: string,
  question: string,
  answer: string,
) {
  const { scoreDelta, feedback, dimensions, missingPoints } = await scoreAnswer(session, question, answer)
  const item = planItemForAnswer(session)
  await recordRound(sessionId, question, answer, scoreDelta, feedback, item?.questionId, dimensions)
  const updated = await getSession(sessionId)
  if (updated) {
    session.totalScore = updated.totalScore
    session.answerCount = updated.answerCount
    session.questionIndex = updated.questionIndex
    session.rounds = updated.rounds
  }
  await incrementMetric('interview.round_scored')
  return { scoreDelta, feedback, missingPoints }
}

async function rollbackRound(session: InterviewSession) {
  session.totalScore -= session.rounds.at(-1)?.score ?? 0
  session.answerCount = Math.max(0, session.answerCount - 1)
  session.questionIndex = Math.max(0, session.questionIndex - 1)
  if (session.rounds.length) session.rounds.pop()
  await updateSession(session)
}

function systemPromptFor(session: InterviewSession) {
  const current = getCurrentQuestion(session)
  return buildInterviewSystemPrompt(
    session.position,
    session.experience,
    current?.content,
    session.questionPlan.map((q) => ({ title: q.title, type: q.type, difficulty: q.difficulty })),
  )
}

interviewRoutes.get('/status', (c) => {
  return c.json({
    llmConfigured: isLlmConfigured(),
    mode: isLlmConfigured() ? 'ai' : 'demo',
  })
})

interviewRoutes.post('/start', async (c) => {
  const body = interviewStartSchema.parse(await c.req.json())
  const rounds = interviewModes[body.mode].rounds
  const user = optionalUser(c)

  let companyName: string | undefined
  if (body.applicationId && user) {
    const { getJobApplication, getJobPosting, updateJobApplication } = await import('../services/jobs-store.js')
    const app = await getJobApplication(body.applicationId)
    if (app && app.userId === user.id) {
      const job = await getJobPosting(app.jobId)
      companyName = job?.company
    }
  }

  const session = await createSession(
    body.position,
    body.experience,
    rounds,
    user?.id,
    body.questionId,
    body.applicationId,
    companyName,
  )

  if (body.applicationId && user) {
    const { updateJobApplication } = await import('../services/jobs-store.js')
    await updateJobApplication(body.applicationId, { sessionId: session.id })
  }

  await incrementMetric('interview.session_started')

  if (!isLlmConfigured()) {
    return c.json({
      sessionId: session.id,
      message: getDemoOpeningMessage(session),
      demo: true,
      questionPlan: session.questionPlan.map((q) => ({ id: q.questionId, title: q.title })),
    })
  }

  const systemPrompt = systemPromptFor(session)
  const current = getCurrentQuestion(session)
  const opening = await tryCompleteChat([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: current
        ? `请开始面试，先做简短自我介绍，然后出第一个问题（题库题目，可口语化）：${current.content}`
        : '请开始面试，先做简短自我介绍，然后出第一个问题。',
    },
  ])

  if (!opening) {
    return c.json({
      sessionId: session.id,
      message: getDemoOpeningMessage(session),
      demo: true,
      llmFallback: true,
      questionPlan: session.questionPlan.map((q) => ({ id: q.questionId, title: q.title })),
    })
  }

  return c.json({
    sessionId: session.id,
    message: opening,
    demo: false,
    questionPlan: session.questionPlan.map((q) => ({ id: q.questionId, title: q.title })),
  })
})

interviewRoutes.post('/chat', async (c) => {
  const body = interviewChatSchema.parse(await c.req.json())
  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  const lastInterviewer = [...body.history].reverse().find((h) => h.role === 'interviewer')

  if (!isLlmConfigured()) {
    const result = await getDemoReply(body.sessionId, body.message)
    const { reportId, report } = await maybeFinalize(
      body.sessionId,
      body.history,
      body.message,
      result.reply,
      result.finished,
    )
    return c.json({ ...result, reportId, report })
  }

  const messages = [
    { role: 'system' as const, content: systemPromptFor(session) },
    ...body.history.flatMap((h) => [
      {
        role: (h.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content,
      },
    ]),
    { role: 'user' as const, content: body.message },
  ]

  let scoreDelta = 0
  let feedback = '回答收到，继续加油。'
  let missingPoints: string[] = []

  if (lastInterviewer) {
    const scored = await scoreAndAdvance(
      session,
      body.sessionId,
      lastInterviewer.content,
      body.message,
    )
    scoreDelta = scored.scoreDelta
    feedback = scored.feedback
    missingPoints = scored.missingPoints
  }

  const maxRounds = session.questionPlan.length
  const chatMessages = appendRoundHint(messages, session.answerCount, maxRounds, missingPoints)
  const reply = await tryCompleteChat(chatMessages)
  if (!reply) {
    if (lastInterviewer) await rollbackRound(session)
    const result = await getDemoReply(body.sessionId, body.message)
    const { reportId, report } = await maybeFinalize(
      body.sessionId,
      body.history,
      body.message,
      result.reply,
      result.finished,
    )
    await incrementMetric('interview.llm_fallback')
    return c.json({ ...result, reportId, report, llmFallback: true })
  }

  const finished =
    session.answerCount >= maxRounds || isInterviewFinished(reply, session.answerCount)
  const { reportId, report } = await maybeFinalize(
    body.sessionId,
    body.history,
    body.message,
    reply,
    finished,
  )

  return c.json({
    reply,
    scoreDelta,
    feedback,
    finished,
    totalScore: session.totalScore,
    reportId,
    report,
    demo: false,
  })
})

interviewRoutes.post('/assist', async (c) => {
  const body = interviewAssistSchema.parse(await c.req.json())
  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  const variant = body.variant ?? 0
  const current = session.questionPlan.find((q) => body.question.includes(q.content.slice(0, 20)))
    ?? planItemForAnswer(session)

  if (!isLlmConfigured()) {
    return c.json({
      suggestion: getAssistFromReference(
        current?.referenceAnswer ?? '',
        session.position,
        body.question,
        variant,
      ),
      demo: true,
    })
  }

  const suggestion = await tryCompleteChat(
    buildAssistPrompt(session.position, session.experience, body.question, variant),
    { maxTokens: 1200 },
  )

  if (!suggestion) {
    return c.json({
      suggestion: getAssistFromReference(
        current?.referenceAnswer ?? '',
        session.position,
        body.question,
        variant,
      ),
      demo: true,
      llmFallback: true,
    })
  }

  return c.json({ suggestion, demo: false })
})

interviewRoutes.post('/chat/stream', async (c) => {
  const body = interviewChatSchema.parse(await c.req.json())
  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  const lastInterviewer = [...body.history].reverse().find((h) => h.role === 'interviewer')

  if (!isLlmConfigured()) {
    const result = await getDemoReply(body.sessionId, body.message)
    const { reportId, report } = await maybeFinalize(
      body.sessionId,
      body.history,
      body.message,
      result.reply,
      result.finished,
    )
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: JSON.stringify({ type: 'meta', ...result, reply: '' }),
      })
      for (const char of result.reply) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'delta', text: char }),
        })
      }
      await stream.writeSSE({
        data: JSON.stringify({ type: 'done', finished: result.finished, totalScore: result.totalScore, reportId, report }),
      })
    })
  }

  const messages = [
    { role: 'system' as const, content: systemPromptFor(session) },
    ...body.history.flatMap((h) => [
      {
        role: (h.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content,
      },
    ]),
    { role: 'user' as const, content: body.message },
  ]

  let scoreDelta = 0
  let feedback = '回答收到，继续加油。'
  let missingPoints: string[] = []

  if (lastInterviewer) {
    const scored = await scoreAndAdvance(
      session,
      body.sessionId,
      lastInterviewer.content,
      body.message,
    )
    scoreDelta = scored.scoreDelta
    feedback = scored.feedback
    missingPoints = scored.missingPoints
  }

  const maxRounds = session.questionPlan.length

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        type: 'meta',
        scoreDelta,
        feedback,
        totalScore: session.totalScore,
      }),
    })

    let fullReply = ''
    try {
      const chatMessages = appendRoundHint(messages, session.answerCount, maxRounds, missingPoints)
      for await (const text of streamChat(chatMessages)) {
        fullReply += text
        await stream.writeSSE({
          data: JSON.stringify({ type: 'delta', text }),
        })
      }
    } catch (error) {
      console.warn('[LLM] stream failed, fallback to demo:', error)
      fullReply = ''
    }

    if (!fullReply) {
      if (lastInterviewer) await rollbackRound(session)
      const result = await getDemoReply(body.sessionId, body.message)
      const { reportId, report } = await maybeFinalize(
        body.sessionId,
        body.history,
        body.message,
        result.reply,
        result.finished,
      )
      for (const char of result.reply) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'delta', text: char }),
        })
      }
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'done',
          finished: result.finished,
          totalScore: result.totalScore,
          reportId,
          report,
          llmFallback: true,
        }),
      })
      return
    }

    try {
      const finished =
        session.answerCount >= maxRounds || isInterviewFinished(fullReply, session.answerCount)
      const { reportId, report } = await maybeFinalize(
        body.sessionId,
        body.history,
        body.message,
        fullReply,
        finished,
      )

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'done',
          finished,
          totalScore: session.totalScore,
          reportId,
          report,
        }),
      })
    } catch (error) {
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      })
    }
  })
})

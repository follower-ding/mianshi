import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'
import { getQuestion, incrementQuestionViews } from '../services/store.js'
import { isLlmConfigured, tryCompleteChat } from '../services/llm.js'
import { incrementMetric } from '../services/metrics.js'
import { mapLlmQuizResult, scoreQuizByRules } from '../services/quiz-score.js'

export const quizRoutes = new Hono<{ Variables: AuthVariables }>()

const quizScoreSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(5000),
})

quizRoutes.use('*', authMiddleware)

quizRoutes.post('/score', async (c) => {
  const body = quizScoreSchema.parse(await c.req.json())
  const question = await getQuestion(body.questionId)
  if (!question || question.status !== 'published') {
    return c.json({ error: 'Question not found' }, 404)
  }

  const keyPoints = question.keyPoints?.join('；') ?? '暂无'
  const reference = question.referenceAnswer ?? (question.content + ' 的参考答案暂缺')

  const prompt = `你是一位严格的面试评分官。请根据下面的标准，评分并评价用户的回答。

**题目**：${question.title}
**考察点**：${keyPoints}
**参考答案要点**：${reference.slice(0, 800)}
**评分标准（Rubric）**：${question.scoringRubric || '准确性、深度、结构化、实践'}

**用户回答**：${body.answer}

请以 JSON 对象返回（只返回 JSON，不返回其他内容）：
{
  "score": 数字(0-100),
  "accuracy": 数字(0-100),
  "depth": 数字(0-100),
  "structure": 数字(0-100),
  "practice": 数字(0-100),
  "feedback": "简短、鼓励性的评价和改进建议，100字以内",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "comparison": "简单对比用户回答与参考答案要点之间的差异, 150字以内"
}`

  try {
    if (isLlmConfigured()) {
      const raw = await tryCompleteChat(
        [
          { role: 'system', content: '你是一位专业面试评分官。只返回要求的 JSON 对象，不要解释。' },
          { role: 'user', content: prompt },
        ],
        { json: true, maxTokens: 600 },
      )
      if (raw) {
        const result = JSON.parse(raw) as Record<string, unknown>
        await incrementMetric('quiz.scored')
        await incrementQuestionViews(body.questionId)
        return c.json({ ...mapLlmQuizResult(result), source: 'llm' as const })
      }
      console.warn('[quiz] LLM unavailable, falling back to rule scoring')
    }

    const demo = scoreQuizByRules(body.answer, question)
    await incrementMetric('quiz.scored_demo')
    await incrementQuestionViews(body.questionId)
    return c.json(demo)
  } catch (e) {
    if (e instanceof SyntaxError) {
      const demo = scoreQuizByRules(body.answer, question)
      await incrementMetric('quiz.scored_demo')
      await incrementQuestionViews(body.questionId)
      return c.json(demo)
    }
    return c.json({ error: 'AI scoring failed' }, 502)
  }
})

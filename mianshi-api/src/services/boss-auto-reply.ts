import { completeChat, isLlmConfigured } from './llm.js'

export type HrIntent = 'reject' | 'request_resume' | 'interview' | 'question' | 'other'

export type HrAnalysis = {
  intent: HrIntent
  shouldReply: boolean
  suggestedReply: string
  summary: string
  needsHumanReview?: boolean
}

const INTERVIEW_KEYWORDS = /面试|约面|聊聊|电话|视频|到场|面聊|沟通时间|方便.*聊|何时方便/i

export function detectInterviewKeyword(text: string): boolean {
  return INTERVIEW_KEYWORDS.test(text)
}

function demoAnalyze(message: string, resumeSummary?: string): HrAnalysis {
  if (/不合适|未通过|感谢.*关注|遗憾/.test(message)) {
    return {
      intent: 'reject',
      shouldReply: true,
      suggestedReply: '感谢告知，也祝您招聘顺利，后续有合适机会再联系。',
      summary: 'HR 婉拒',
    }
  }
  if (/简历|附件|PDF|发一份/.test(message)) {
    return {
      intent: 'request_resume',
      shouldReply: true,
      suggestedReply: `好的，我稍后发送简历给您。${resumeSummary ? `简要背景：${resumeSummary.slice(0, 80)}` : ''}`,
      summary: 'HR 索要简历',
    }
  }
  if (detectInterviewKeyword(message)) {
    return {
      intent: 'interview',
      shouldReply: true,
      suggestedReply: '好的，我时间比较方便，可按您安排进行。请问具体是线上还是线下？',
      summary: 'HR 约面试',
    }
  }
  return {
    intent: 'question',
    shouldReply: true,
    suggestedReply: '感谢您的回复，我对该岗位很感兴趣，可随时进一步沟通。',
    summary: 'HR 一般回复',
  }
}

export async function analyzeHrMessage(
  message: string,
  context: { jobTitle: string; company: string; jd: string; resumeSummary?: string },
): Promise<HrAnalysis> {
  if (!isLlmConfigured()) return demoAnalyze(message, context.resumeSummary)

  try {
    const raw = await completeChat(
      [
        {
          role: 'system',
          content: `你是 iume 求职 Agent，负责分析 Boss 直聘 HR 消息并生成下一轮回复。

输出严格 JSON（无 markdown）：
{
  "intent": "reject|request_resume|interview|question|interest|other",
  "shouldReply": boolean,
  "suggestedReply": "80-120字专业中文回复，结合 JD 与简历亮点，语气礼貌",
  "summary": "10字内摘要",
  "needsHumanReview": boolean
}

规则：
- reject：礼貌感谢，不再纠缠
- request_resume：确认可发简历，简要概括背景
- interview：确认时间灵活，询问线上/线下
- question/interest：结合 JD 回答 HR 问题或表达匹配点
- 若 HR 问「还有什么要求/想了解什么」，应主动列出 1-2 个与岗位相关的专业问题
- 不编造具体项目数据；needsHumanReview=true 表示建议用户人工确认后再发`,
        },
        {
          role: 'user',
          content: `岗位：${context.jobTitle} @ ${context.company}
JD：${context.jd.slice(0, 600)}
候选人简历摘要：${context.resumeSummary ?? '未提供'}
HR 最新消息：${message}`,
        },
      ],
      { maxTokens: 500 },
    )
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as Partial<
      HrAnalysis & { needsHumanReview?: boolean }
    >
    return {
      intent: (parsed.intent as HrIntent) ?? 'other',
      shouldReply: parsed.shouldReply ?? true,
      suggestedReply: parsed.suggestedReply ?? demoAnalyze(message).suggestedReply,
      summary: parsed.summary ?? 'HR 回复',
      needsHumanReview: parsed.needsHumanReview ?? false,
    }
  } catch {
    return demoAnalyze(message, context.resumeSummary)
  }
}

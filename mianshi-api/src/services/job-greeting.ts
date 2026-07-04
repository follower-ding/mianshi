import { completeChat, isLlmConfigured } from './llm.js'
import type { JobPosting, User } from '../types/entities.js'

function demoGreeting(job: JobPosting, userName: string, resumeSummary?: string) {
  const highlight = resumeSummary?.slice(0, 60) || '具备扎实的工程实践与学习能力'
  return `您好，我是${userName}，关注到贵司「${job.title}」岗位（${job.company}）。${highlight}，与 JD 中${job.tags.slice(0, 2).join('、')}等要求较为匹配，希望能进一步沟通，感谢！`
}

export async function generateJobGreeting(
  job: JobPosting,
  user: Pick<User, 'name'>,
  resumeSummary?: string,
): Promise<string> {
  if (!isLlmConfigured()) {
    return demoGreeting(job, user.name, resumeSummary)
  }

  try {
    const raw = await completeChat(
      [
        {
          role: 'system',
          content: `你是求职顾问，帮候选人写 Boss 直聘/猎聘上的首次打招呼消息。
要求：80-150 字，真诚专业，突出与 JD 的匹配点，不要编造具体项目数据，不要 emoji，一段即可。`,
        },
        {
          role: 'user',
          content: `候选人：${user.name}
${resumeSummary ? `简介：${resumeSummary}` : ''}
公司：${job.company}
岗位：${job.title}
城市：${job.city}
JD：${job.jd}
标签：${job.tags.join('、')}`,
        },
      ],
      { maxTokens: 300 },
    )
    return raw.trim() || demoGreeting(job, user.name, resumeSummary)
  } catch {
    return demoGreeting(job, user.name, resumeSummary)
  }
}

import { completeChat, isLlmConfigured } from './llm.js'
import { scoreJobForUser } from './job-matcher.js'
import { getJobPreference } from './job-preferences-store.js'
import type { JobPosting } from '../types/entities.js'

export type JobAnalysis = {
  summary: string
  matchScore: number
  tier: string
  pros: string[]
  cons: string[]
  advice: string[]
  interviewFocus: string[]
  salaryInsight: string
  demo: boolean
}

function demoAnalysis(job: JobPosting, score: number, tier: string): JobAnalysis {
  return {
    summary: `${job.company} 的「${job.title}」岗位，薪资 ${job.salary}，位于 ${job.city}。与您的求职画像匹配度 ${score} 分（${tier} 级）。`,
    matchScore: score,
    tier,
    pros: ['岗位与目标方向相关', '公司知名度较高', 'JD 描述较完整'],
    cons: job.jd.includes('外包') ? ['JD 含外包相关描述'] : ['竞争可能较激烈'],
    advice: ['投递前突出与 JD 标签匹配的项目经验', '打招呼语控制在 150 字内', '准备该公司常见八股与项目追问'],
    interviewFocus: job.tags.slice(0, 5).length ? job.tags.slice(0, 5) : ['基础知识', '项目经历', '系统设计'],
    salaryInsight: `参考薪资 ${job.salary}，可结合城市与生活成本评估`,
    demo: true,
  }
}

export async function analyzeJobForUser(userId: string, job: JobPosting): Promise<JobAnalysis> {
  const pref = await getJobPreference(userId)
  const match = scoreJobForUser(job, pref)

  if (!isLlmConfigured()) {
    return demoAnalysis(job, match.score, match.tier)
  }

  try {
    const raw = await completeChat(
      [
        {
          role: 'system',
          content: `你是资深求职顾问。根据 JD 与用户画像输出 JSON，字段：
summary(2-3句), pros(数组3条), cons(数组2条), advice(数组3条), interviewFocus(数组4条), salaryInsight(1句)`,
        },
        {
          role: 'user',
          content: `用户目标公司：${pref.targetCompanies.join('、')}
目标岗位：${pref.targetPositions.join('、')}
简历亮点：${pref.resumeSummary ?? '未填写'}
匹配分：${match.score}（${match.tier}）
匹配理由：${match.reasons.join('；')}

岗位：${job.title}
公司：${job.company}
城市：${job.city}
薪资：${job.salary}
JD：${job.jd}
标签：${job.tags.join('、')}`,
        },
      ],
      { maxTokens: 800 },
    )

    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as Partial<JobAnalysis>
    return {
      summary: parsed.summary ?? demoAnalysis(job, match.score, match.tier).summary,
      matchScore: match.score,
      tier: match.tier,
      pros: parsed.pros ?? [],
      cons: parsed.cons ?? [],
      advice: parsed.advice ?? [],
      interviewFocus: parsed.interviewFocus ?? [],
      salaryInsight: parsed.salaryInsight ?? '',
      demo: false,
    }
  } catch {
    return demoAnalysis(job, match.score, match.tier)
  }
}

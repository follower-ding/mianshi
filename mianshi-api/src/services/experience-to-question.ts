import { getExperience, createCandidateQuestion, listCandidateQuestions } from './store.js'
import { tryGatewayCompleteChat, isLlmConfigured } from './llm-gateway.js'

type GeneratedQuestion = {
  title: string
  category: string
  difficulty: string
  tags: string[]
  content: string
  type: string
  referenceAnswer: string
  keyPoints: string[]
  scoringRubric: string
  followUpTemplates: string[]
}

function buildPrompt(experience: { company: string; position: string; summary: string; content: string }) {
  return [
    {
      role: 'system' as const,
      content: `你是面试题库编辑。从面经中提取 1-3 道可复用的面试题。
每题需包含完整质量字段，输出 JSON 数组：
[{"title":"","category":"","difficulty":"简单|中等|困难","tags":[],"content":"","type":"基础|项目|系统设计|算法|开放","referenceAnswer":"","keyPoints":[],"scoringRubric":"","followUpTemplates":[]}]
只输出 JSON 数组，不要其他文字。`,
    },
    {
      role: 'user' as const,
      content: `公司：${experience.company}
岗位：${experience.position}
摘要：${experience.summary}
详情：${experience.content}`,
    },
  ]
}

function demoExtract(experience: { summary: string; content: string; position: string }) {
  const text = `${experience.summary} ${experience.content}`
  const keywords = text.match(/[\u4e00-\u9fa5A-Za-z]{2,8}/g)?.slice(0, 6) ?? ['技术', '项目']
  return [
    {
      title: `${experience.position} 面经考点提炼`,
      category: 'Java',
      difficulty: '中等',
      tags: keywords.slice(0, 3),
      content: `根据面经「${experience.summary.slice(0, 40)}」，请详细回答相关技术问题。`,
      type: '项目',
      referenceAnswer: '结合面经中的考察点，从原理、实践、优化三个层面回答。',
      keyPoints: keywords.slice(0, 4),
      scoringRubric: '需覆盖面经提及的技术点，并结合项目场景',
      followUpTemplates: ['能举一个具体案例吗？', '如果规模扩大 10 倍怎么处理？'],
    },
  ] satisfies GeneratedQuestion[]
}

export async function generateQuestionsFromExperience(experienceId: string) {
  const experience = await getExperience(experienceId)
  if (!experience) throw new Error('Experience not found')

  let generated: GeneratedQuestion[] = []

  if (isLlmConfigured()) {
    const raw = await tryGatewayCompleteChat(buildPrompt(experience), { json: true, maxTokens: 1200 })
    if (raw) {
      try {
        generated = JSON.parse(raw) as GeneratedQuestion[]
      } catch {
        generated = demoExtract(experience)
      }
    } else {
      generated = demoExtract(experience)
    }
  } else {
    generated = demoExtract(experience)
  }

  const created = []
  for (const item of generated.slice(0, 3)) {
    const candidate = await createCandidateQuestion({
      experienceId,
      title: item.title,
      category: item.category || 'Java',
      difficulty: item.difficulty || '中等',
      tags: item.tags ?? [],
      content: item.content,
      type: (item.type as '项目') ?? '项目',
      referenceAnswer: item.referenceAnswer ?? '',
      keyPoints: item.keyPoints ?? [],
      scoringRubric: item.scoringRubric ?? '',
      followUpTemplates: item.followUpTemplates ?? [],
      status: 'review',
    })
    created.push(candidate)
  }

  return created
}

export async function listPendingCandidates() {
  return listCandidateQuestions('review')
}

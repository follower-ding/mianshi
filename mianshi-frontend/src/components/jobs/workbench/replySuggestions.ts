import type { HrAnalysis, JobPosting } from '../../../api/client'

export type ReplySuggestion = {
  id: string
  title: string
  preview: string
  fullText: string
}

export function shouldShowInspiration(hrMessage: string, intent?: string): boolean {
  if (/简历|附件|PDF|发一份|面谈|面试|聊聊|不合适|未通过|感谢.*关注|方便.*聊/.test(hrMessage)) {
    return true
  }
  return ['request_resume', 'interview', 'reject', 'question'].includes(intent ?? '')
}

export function buildReplySuggestions(
  analysis: HrAnalysis,
  job: JobPosting,
): ReplySuggestion[] {
  const skills = job.tags.slice(0, 4).join('、') || '相关技术栈'
  const primary: ReplySuggestion = {
    id: 'primary',
    title: `AI 推荐 · ${analysis.summary}`,
    preview: analysis.suggestedReply.slice(0, 72) + (analysis.suggestedReply.length > 72 ? '…' : ''),
    fullText: analysis.suggestedReply,
  }

  const variants: ReplySuggestion[] = []

  switch (analysis.intent) {
    case 'request_resume':
      variants.push(
        {
          id: 'resume-quick',
          title: '简洁确认发简历',
          preview: '好的，我马上通过 Boss 把简历发给您…',
          fullText: `好的 HR，我这就把简历发您。我有 ${job.experience} ${job.title} 经验，熟悉 ${skills}，与 JD 描述较匹配，期待进一步沟通。`,
        },
        {
          id: 'resume-highlight',
          title: '附亮点摘要',
          preview: '感谢回复！我对该岗位很感兴趣，简历已备好…',
          fullText: `感谢回复！我对 ${job.company} · ${job.title} 非常感兴趣。核心优势是 ${skills} 方向的项目实践，简历稍后发您，欢迎查阅。`,
        },
      )
      break
    case 'interview':
      variants.push(
        {
          id: 'interview-flex',
          title: '时间灵活确认',
          preview: '好的，我这边时间比较灵活，可按您安排…',
          fullText: `好的，我时间比较灵活，可按您安排进行。请问是线上视频还是现场面试？我提前准备好 ${skills} 相关的项目材料。`,
        },
        {
          id: 'interview-ask',
          title: '确认形式与流程',
          preview: '感谢邀请！想确认面试形式与大致流程…',
          fullText: `感谢邀请！我对 ${job.title} 岗位很有兴趣。想确认本次是技术面还是综合面，大约几轮？我好针对性准备。`,
        },
      )
      break
    case 'reject':
      variants.push(
        {
          id: 'reject-polite',
          title: '礼貌致谢',
          preview: '感谢告知，也祝您招聘顺利…',
          fullText: '感谢告知与沟通机会，也祝您招聘顺利。若后续有更合适的机会，欢迎再联系我。',
        },
        {
          id: 'reject-door',
          title: '保持联系',
          preview: '理解贵司当前安排，后续如有匹配岗位…',
          fullText: `理解贵司当前安排。我对 ${job.company} 仍保持关注，若后续有 ${job.position || job.title} 相关机会，欢迎再联系。`,
        },
      )
      break
    default:
      variants.push(
        {
          id: 'interest-jd',
          title: '结合 JD 表达匹配',
          preview: `看到 JD 中 ${skills} 的要求，与我背景较契合…`,
          fullText: `感谢您的回复！JD 中强调的 ${skills} 与我的经历较契合，我对 ${job.title} 岗位很有热情，可随时深入交流。`,
        },
        {
          id: 'ask-team',
          title: '主动提问团队',
          preview: '想进一步了解团队技术栈与业务方向…',
          fullText: `感谢回复！想进一步了解团队目前的技术栈与业务方向，以及该岗位短期内的核心目标，便于我评估匹配度。`,
        },
      )
  }

  return [primary, ...variants].slice(0, 3)
}

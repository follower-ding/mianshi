import type { InterviewReport } from '../types/entities.js'

export type ReportExperienceDraft = {
  company: string
  position: string
  result: '通过' | '待定' | '未通过'
  rounds: number
  author: string
  date: string
  summary: string
  content: string
  sourceType: 'simulation'
}

function ratingToResult(rating: string): ReportExperienceDraft['result'] {
  if (rating === '优秀' || rating === '良好') return '通过'
  if (rating === '合格') return '待定'
  return '未通过'
}

function formatMonth(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function buildExperienceContentFromReport(report: InterviewReport): string {
  const lines: string[] = []

  lines.push('## 面试概况')
  lines.push(`- 岗位：${report.position}`)
  lines.push(`- 经验：${report.experience}`)
  lines.push(`- 模拟得分：${report.totalScore} 分 · ${report.overallRating}`)
  lines.push(`- 问答轮次：${report.answerCount} 轮`)
  lines.push('')

  lines.push('## 整体评价')
  lines.push(report.summary)
  lines.push('')

  if (report.strengths.length > 0) {
    lines.push('## 表现亮点')
    for (const s of report.strengths) lines.push(`- ${s}`)
    lines.push('')
  }

  if (report.improvements.length > 0) {
    lines.push('## 待加强')
    for (const s of report.improvements) lines.push(`- ${s}`)
    lines.push('')
  }

  const rounds =
    report.rounds.length > 0
      ? report.rounds
      : report.scoreBreakdown.map((b) => ({
          topic: b.topic,
          question: b.topic,
          answer: '',
          score: b.score,
          feedback: b.comment,
        }))

  if (rounds.length > 0) {
    lines.push('## 逐题回顾')
    rounds.forEach((round, i) => {
      lines.push('')
      lines.push(`### 第 ${i + 1} 题 · ${round.topic}`)
      if (round.question && round.question !== round.topic) {
        lines.push(`**题目：** ${round.question}`)
      }
      if (round.answer?.trim()) {
        lines.push(`**我的回答：** ${round.answer.trim()}`)
      }
      lines.push(`**得分：** ${round.score}/20`)
      if (round.feedback) lines.push(`**点评：** ${round.feedback}`)
    })
    lines.push('')
  }

  if (report.nextSteps.length > 0) {
    lines.push('## 复盘建议')
    report.nextSteps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
    lines.push('')
  }

  lines.push('---')
  lines.push('*本文由 AI 模拟面试报告整理发布，供同岗位同学参考。*')

  return lines.join('\n')
}

export function buildExperienceDraftFromReport(
  report: InterviewReport,
  authorName: string,
): ReportExperienceDraft {
  const content = buildExperienceContentFromReport(report)
  const summary =
    report.summary.length > 500 ? `${report.summary.slice(0, 497)}…` : report.summary

  return {
    company: '',
    position: report.position,
    result: ratingToResult(report.overallRating),
    rounds: Math.max(1, report.answerCount || report.rounds.length || 1),
    author: authorName,
    date: formatMonth(report.createdAt),
    summary: summary.length >= 10 ? summary : `${report.position} 模拟面试复盘，共 ${report.answerCount} 轮问答。`,
    content: content.length >= 10 ? content : report.summary,
    sourceType: 'simulation',
  }
}

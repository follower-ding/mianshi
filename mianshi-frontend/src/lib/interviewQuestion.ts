/** 从面试官整段话里提取当前问题，便于 AI 辅助与题库匹配 */
export function extractInterviewQuestion(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const patterns = [
    /(?:第一个问题|下一个问题|追问)[：:]\s*([\s\S]+)/,
    /(?:请问|请描述|请谈谈|请解释)[，,]?\s*([\s\S]+)/,
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  const last = lines[lines.length - 1]
  if (last && last.length >= 8) return last.replace(/^[？?]+/, '')
  return trimmed
}

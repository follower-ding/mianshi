/** AI 录入 / 快速录入生成的模板题干 */
const BOILERPLATE_PATTERNS = [
  /^请结合.+方向.+说明「.+」的核心概念/,
  /^请结合.+方向.+围绕「.+」的核心概念/,
  /^请详细说明/,
]

export function isBoilerplateContent(content: string, title: string): boolean {
  const c = content.trim()
  const t = title.trim()
  if (!c) return true
  if (c === t) return true
  if (BOILERPLATE_PATTERNS.some((re) => re.test(c))) return true
  if (t.length > 4 && c.includes(`「${t}」`)) return true
  return false
}

export function referenceAnswerHasKeyPointsSection(referenceAnswer: string): boolean {
  return /^#{1,3}\s*(回答重点|回答要点|Key Points?)/im.test(referenceAnswer.trim())
}

export function shouldShowKeyPointsSection(
  keyPoints: string[] | undefined,
  referenceAnswer: string | undefined,
): boolean {
  if (!keyPoints?.length) return false
  if (referenceAnswerHasKeyPointsSection(referenceAnswer ?? '')) return false
  return true
}

/** 题干是否需要在正文区单独展示（避免与标题区副标题重复） */
export function shouldShowQuestionSection(content: string, title: string): boolean {
  if (isBoilerplateContent(content, title)) return false
  const c = content.trim()
  const t = title.trim()
  if (c === t) return false
  if (c.length <= 200) return false
  return true
}

/** 标题下方一行副标题（短题干 / 非模板） */
export function questionSubtitle(content: string, title: string): string | null {
  if (isBoilerplateContent(content, title)) return null
  const c = content.trim()
  const t = title.trim()
  if (!c || c === t) return null
  if (c.length > 200) return null
  return c
}

export function searchSnippet(q: {
  title: string
  content: string
  referenceAnswer?: string
  keyPoints?: string[]
}): string {
  const sub = questionSubtitle(q.content, q.title)
  if (sub) return sub
  if (!isBoilerplateContent(q.content, q.title)) return q.content.trim()
  const ref = q.referenceAnswer?.trim()
  if (ref) return ref.replace(/^#+\s+/gm, '').slice(0, 120)
  if (q.keyPoints?.length) return q.keyPoints.slice(0, 2).join(' · ')
  return q.title
}

export function hasImagesInMarkdown(text: string | undefined): boolean {
  return Boolean(text?.match(/!\[[^\]]*\]\([^)]+\)/))
}

import type { ResumeContent } from '../../api/client'
import type { ResumePreviewSettings } from './resumePreviewSettings'
import { A4_CONTENT_HEIGHT } from './resumePreviewSettings'

function cleanText(s: string): { text: string; fixed: boolean } {
  let text = s
  let fixed = false
  const next = text
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/,,+/g, '，')
    .replace(/\.{2,}/g, '。')
    .trim()
  if (next !== text) fixed = true
  text = next
  return { text, fixed }
}

export function proofreadResumeContent(content: ResumeContent): {
  content: ResumeContent
  fixes: string[]
} {
  const fixes: string[] = []
  const basic = { ...content.basic }

  for (const key of ['name', 'title', 'city', 'phone', 'email'] as const) {
    const val = basic[key] ?? ''
    const { text, fixed } = cleanText(val)
    if (fixed) fixes.push(`修正「${key}」多余空格`)
    basic[key] = text
  }

  if (basic.email?.includes(' ')) {
    basic.email = basic.email.replace(/\s/g, '')
    fixes.push('修正邮箱中的空格')
  }

  let selfIntro = content.selfIntro ?? ''
  {
    const r = cleanText(selfIntro)
    if (r.fixed) fixes.push('修正个人简介格式')
    selfIntro = r.text
  }

  const experience = (content.experience ?? []).map((e) => {
    const highlights = e.highlights
      .map((h) => {
        const r = cleanText(h)
        if (r.fixed) fixes.push('修正工作经历描述格式')
        return r.text
      })
      .filter(Boolean)
    return { ...e, company: cleanText(e.company ?? '').text, title: cleanText(e.title ?? '').text, highlights }
  })

  const projects = (content.projects ?? []).map((p) => {
    const highlights = p.highlights
      .map((h) => {
        const r = cleanText(h)
        if (r.fixed) fixes.push('修正项目描述格式')
        return r.text
      })
      .filter(Boolean)
    return {
      ...p,
      name: cleanText(p.name ?? '').text,
      role: cleanText(p.role ?? '').text,
      desc: p.desc ? cleanText(p.desc).text : p.desc,
      highlights,
    }
  })

  const education = (content.education ?? []).map((e) => ({
    ...e,
    school: cleanText(e.school ?? '').text,
    major: cleanText(e.major ?? '').text,
    degree: cleanText(e.degree ?? '').text,
  }))

  const skills = (content.skills ?? []).map((s) => cleanText(s).text).filter(Boolean)

  const uniqueFixes = [...new Set(fixes)]
  return {
    content: { ...content, basic, selfIntro, experience, projects, education, skills },
    fixes: uniqueFixes.length ? uniqueFixes : ['未发现明显错误，内容格式良好'],
  }
}

/** 根据内容高度估算一页适配参数 */
export function suggestOnePageSettings(
  contentHeight: number,
  current: ResumePreviewSettings,
): ResumePreviewSettings {
  const target = A4_CONTENT_HEIGHT - current.pageMarginTop * 2
  if (contentHeight <= target) {
    return { ...current, onePageFit: true }
  }

  let fontSize = current.fontSize
  let lineHeight = current.lineHeight
  let pageMarginTop = current.pageMarginTop
  let pageMarginLeft = current.pageMarginLeft
  let pageMarginRight = current.pageMarginRight
  let h = contentHeight

  for (let i = 0; i < 24 && h > target; i++) {
    if (fontSize > 11) fontSize -= 0.5
    if (lineHeight > 16) lineHeight -= 1
    if (pageMarginTop > 18) pageMarginTop -= 1
    if (pageMarginLeft > 18) pageMarginLeft -= 1
    if (pageMarginRight > 18) pageMarginRight -= 1
    const scale = (fontSize / current.fontSize) * (lineHeight / current.lineHeight)
    h = contentHeight * scale * 0.92
  }

  return {
    ...current,
    fontSize: Math.round(fontSize * 2) / 2,
    lineHeight,
    pageMargin: pageMarginTop,
    pageMarginTop,
    pageMarginLeft,
    pageMarginRight,
    moduleGap: Math.max(8, current.moduleGap - 2),
    onePageFit: true,
  }
}

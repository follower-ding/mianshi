import type { ResumeContent } from '../types/entities.js'

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 分享快照入库前剥离 HTML，降低公开页 XSS 面 */
export function sanitizeResumeContentForShare(content: ResumeContent): ResumeContent {
  const next: ResumeContent = JSON.parse(JSON.stringify(content))
  if (next.selfIntro) next.selfIntro = stripHtml(next.selfIntro)
  if (next.experience) {
    next.experience = next.experience.map((e) => ({
      ...e,
      detail: e.detail ? stripHtml(e.detail) : e.detail,
    }))
  }
  if (next.customSections) {
    next.customSections = next.customSections.map((s) => ({
      ...s,
      body: s.body ? stripHtml(s.body) : s.body,
    }))
  }
  return next
}

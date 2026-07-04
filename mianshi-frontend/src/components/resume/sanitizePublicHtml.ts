/** 公开页渲染：剥离 HTML 标签，防止 Stored XSS */
export function stripHtmlToPlain(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** 编辑页仍可用 HTML；公开页强制纯文本 */
export function publicSafeRichText(text: string, publicSafe?: boolean): string {
  if (!publicSafe) return text
  return stripHtmlToPlain(text)
}

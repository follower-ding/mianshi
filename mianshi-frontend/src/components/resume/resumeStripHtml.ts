/** 清除富文本样式 — 参考鱼鸢 2.13，粘贴时剥离 HTML 保留纯文本 */
export function stripRichText(input: string): string {
  if (!input.includes('<')) return input.trim()

  const doc = new DOMParser().parseFromString(input, 'text/html')
  const text = doc.body.textContent ?? ''

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

export function pastePlainText(e: React.ClipboardEvent<HTMLTextAreaElement>): string | null {
  const html = e.clipboardData.getData('text/html')
  const plain = e.clipboardData.getData('text/plain')
  if (html && html.includes('<')) {
    e.preventDefault()
    return stripRichText(html || plain)
  }
  return null
}

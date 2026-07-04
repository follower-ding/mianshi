/** Resolve markdown image src — diagrams API, uploads, public assets, or external URLs. */
export function resolveMarkdownImageSrc(src?: string): string | undefined {
  if (!src?.trim()) return undefined
  const trimmed = src.trim()
  if (
    trimmed.startsWith('/api/diagrams/') ||
    trimmed.startsWith('/api/uploads/question-images/') ||
    trimmed.startsWith('/question-images/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed
  }
  return `/api/uploads/question-images/${trimmed.replace(/^\/+/, '')}`
}

/** Migrate legacy public paths to API-served diagrams. */
export function normalizeMarkdownImageSrc(src?: string): string | undefined {
  const resolved = resolveMarkdownImageSrc(src)
  if (!resolved) return undefined
  return resolved.replace(/^\/question-images\//, '/api/diagrams/')
}

export function isSafeImageSrc(src?: string): boolean {
  const resolved = normalizeMarkdownImageSrc(src)
  if (!resolved) return false
  if (resolved.startsWith('/')) return true
  try {
    const url = new URL(resolved)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isSvgSrc(src?: string): boolean {
  const resolved = normalizeMarkdownImageSrc(src) ?? ''
  return /\.svg(\?|$)/i.test(resolved)
}

export function normalizeMarkdownImagePaths(markdown: string): string {
  return markdown.replace(/(\]\()\/?question-images\//g, '$1/api/diagrams/')
}

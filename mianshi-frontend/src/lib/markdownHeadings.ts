/** Extract ## / ### headings from markdown for in-page TOC (ids match MarkdownContent). */
export function extractMarkdownHeadings(
  markdown: string,
  prefix: string,
): { id: string; label: string; level: number }[] {
  const items: { id: string; label: string; level: number }[] = []
  const counts = new Map<string, number>()

  for (const line of markdown.split('\n')) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const level = match[1].length
    const label = match[2].replace(/\*\*/g, '').replace(/`/g, '').trim()
    if (!label) continue

    const base = slugifyHeading(label)
    const n = (counts.get(base) ?? 0) + 1
    counts.set(base, n)
    const id = n > 1 ? `${prefix}-${base}-${n}` : `${prefix}-${base}`
    items.push({ id, label, level })
  }

  return items
}

/** Slugify heading text for anchor ids inside rendered markdown. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48)
}

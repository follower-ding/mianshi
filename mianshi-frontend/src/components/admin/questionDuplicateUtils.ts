import { DUPLICATE_TITLE_THRESHOLD, titleSimilarity } from '../../lib/titleSimilarity'

export { titleSimilarity, DUPLICATE_TITLE_THRESHOLD }

/** questionId → 相似题目标题 */
export function findDuplicateTitleHints(
  items: { id: string; title: string }[],
): Map<string, string> {
  const hints = new Map<string, string>()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (titleSimilarity(a.title, b.title) >= DUPLICATE_TITLE_THRESHOLD) {
        if (!hints.has(a.id)) hints.set(a.id, b.title)
        if (!hints.has(b.id)) hints.set(b.id, a.title)
      }
    }
  }
  return hints
}

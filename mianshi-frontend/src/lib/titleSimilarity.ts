/** 与 API question-quality 一致的标题相似度算法 */

function normalizeTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[？?。，,、；;：:！!]/g, '')
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length > nb.length ? nb : na
  if (longer.includes(shorter)) {
    const ratio = shorter.length / longer.length
    if (ratio >= 0.88) return 0.92
    return ratio * 0.7
  }

  let hit = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) hit++
  }
  return hit / longer.length
}

export const DUPLICATE_TITLE_THRESHOLD = 0.85

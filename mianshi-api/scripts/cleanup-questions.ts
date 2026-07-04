/**
 * 清理重复/测试题目
 * 运行：cd mianshi-api && npx tsx scripts/cleanup-questions.ts
 * 预览：npx tsx scripts/cleanup-questions.ts --dry-run
 */
import 'dotenv/config'
import { initDatabase } from '../src/db/init.js'
import { deleteQuestion, listQuestions } from '../src/services/store.js'
import { titleSimilarity } from '../src/services/question-quality.js'

/** 精确删除：测试占位标题 */
const EXACT_TITLES = new Set(['11', 'javatest'])

const FUZZY_THRESHOLD = 0.85

type Q = Awaited<ReturnType<typeof listQuestions>>[number]

function pickKeeper(items: Q[]) {
  return [...items].sort((a, b) => {
    const lenA = (a.referenceAnswer?.length ?? 0) + (a.content?.length ?? 0)
    const lenB = (b.referenceAnswer?.length ?? 0) + (b.content?.length ?? 0)
    if (lenB !== lenA) return lenB - lenA
    const statusScore = (s?: string) => (s === 'published' ? 2 : s === 'review' ? 1 : 0)
    const sa = statusScore(a.status)
    const sb = statusScore(b.status)
    if (sb !== sa) return sb - sa
    return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '')
  })[0]
}

function buildFuzzyDuplicateGroups(items: Q[]): Q[][] {
  const groups: Q[][] = []
  const assigned = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(items[i].id)) continue
    const cluster: Q[] = [items[i]]
    assigned.add(items[i].id)

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(items[j].id)) continue
      const a = items[i]
      const b = items[j]
      const titleSim = titleSimilarity(a.title, b.title)
      const contentSim = titleSimilarity(
        a.content.slice(0, 80),
        b.content.slice(0, 80),
      )
      if (titleSim >= FUZZY_THRESHOLD || contentSim >= FUZZY_THRESHOLD) {
        cluster.push(b)
        assigned.add(b.id)
      }
    }

    if (cluster.length > 1) groups.push(cluster)
  }

  return groups
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  await initDatabase()
  const all = await listQuestions({})

  const toDelete = new Set<string>()
  const reasons = new Map<string, string>()

  for (const q of all) {
    const t = q.title.trim()
    if (EXACT_TITLES.has(t) || t.length <= 2) {
      toDelete.add(q.id)
      reasons.set(q.id, '测试/占位标题')
    }
  }

  const remaining = all.filter((q) => !toDelete.has(q.id))

  const byExactTitle = new Map<string, Q[]>()
  for (const q of remaining) {
    const key = q.title.trim().toLowerCase()
    const group = byExactTitle.get(key) ?? []
    group.push(q)
    byExactTitle.set(key, group)
  }

  for (const [, group] of byExactTitle) {
    if (group.length <= 1) continue
    const keeper = pickKeeper(group)
    for (const q of group) {
      if (q.id !== keeper.id) {
        toDelete.add(q.id)
        reasons.set(q.id, `与「${keeper.title}」标题完全相同`)
      }
    }
  }

  const fuzzyPool = remaining.filter((q) => !toDelete.has(q.id))
  for (const group of buildFuzzyDuplicateGroups(fuzzyPool)) {
    const keeper = pickKeeper(group)
    for (const q of group) {
      if (q.id !== keeper.id) {
        toDelete.add(q.id)
        const sim = titleSimilarity(q.title, keeper.title)
        reasons.set(
          q.id,
          `与「${keeper.title}」相似 (${Math.round(sim * 100)}%)`,
        )
      }
    }
  }

  if (toDelete.size === 0) {
    console.log('无需清理的题目')
    return
  }

  console.log(`${dryRun ? '[预览] ' : ''}将删除 ${toDelete.size} 条题目：`)
  for (const id of toDelete) {
    const q = all.find((x) => x.id === id)
    console.log(`  - [${id}] ${q?.title ?? '?'} — ${reasons.get(id) ?? ''}`)
    if (!dryRun) await deleteQuestion(id)
  }
  console.log(dryRun ? '预览完成（未实际删除）' : '清理完成')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

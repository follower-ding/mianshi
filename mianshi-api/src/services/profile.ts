import { listQuestions, listReports, getUserById } from './store.js'
import { getUserProgressStats, listUserProgress } from './practice.js'
import { isPgEnabled } from '../db/client.js'

export async function getUserProfile(userId: string) {
  const user = await getUserById(userId)
  if (!user) return null

  const [reports, progressItems, stats, questions] = await Promise.all([
    listReports(userId),
    isPgEnabled() ? listUserProgress(userId) : Promise.resolve([]),
    isPgEnabled() ? getUserProgressStats(userId) : Promise.resolve({ practiced: 0, mastered: 0, favorites: 0 }),
    listQuestions({ status: 'published' }),
  ])

  const byCategory: Record<string, number> = {}
  for (const q of questions) byCategory[q.category] = (byCategory[q.category] ?? 0) + 1
  const questionStats = { total: questions.length, byCategory }
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const categoryProgress: Record<
    string,
    { practiced: number; mastered: number; favorites: number; total: number }
  > = {}

  for (const [cat, total] of Object.entries(questionStats.byCategory)) {
    categoryProgress[cat] = { practiced: 0, mastered: 0, favorites: 0, total }
  }

  for (const item of progressItems) {
    const q = questionById.get(item.questionId)
    if (!q) continue
    if (!categoryProgress[q.category]) {
      categoryProgress[q.category] = { practiced: 0, mastered: 0, favorites: 0, total: 0 }
    }
    const bucket = categoryProgress[q.category]
    if (item.status === 'mastered') bucket.mastered++
    else bucket.practiced++
    if (item.favorite) bucket.favorites++
  }

  const favorites = progressItems
    .filter((p) => p.favorite)
    .map((p) => {
      const q = questionById.get(p.questionId)
      return q
        ? { id: q.id, title: q.title, category: q.category, difficulty: q.difficulty }
        : null
    })
    .filter(Boolean)
    .slice(0, 10)

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    stats: {
      ...stats,
      reports: reports.length,
      interviews: reports.length,
    },
    categoryProgress,
    questionTotal: questionStats.total,
    recentReports: reports.slice(0, 5).map((r) => ({
      id: r.id,
      position: r.position,
      totalScore: r.totalScore,
      overallRating: r.overallRating,
      createdAt: r.createdAt,
      sourceQuestionId: r.sourceQuestionId,
      sourceCategory: r.sourceCategory,
    })),
    favorites,
    syncEnabled: isPgEnabled(),
  }
}

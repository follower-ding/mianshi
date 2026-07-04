import { listQuestions } from './store.js'
import { listUserProgress } from './practice.js'
import { isPgEnabled } from '../db/client.js'

const PATH_META = [
  {
    id: 'java',
    title: 'Java 后端工程师',
    category: 'Java',
    slug: 'java',
    color: 'from-orange-400 to-red-500',
    stageTitles: ['Java 基础', '并发与 JVM', 'Spring 与框架', '综合进阶'],
  },
  {
    id: 'database',
    title: '数据库专项',
    category: '数据库',
    slug: 'database',
    color: 'from-blue-400 to-cyan-500',
    stageTitles: ['SQL 与索引', '事务与锁', '架构与优化'],
  },
  {
    id: 'middleware',
    title: '中间件 & 分布式',
    category: '中间件',
    slug: 'middleware',
    color: 'from-violet-400 to-purple-500',
    stageTitles: ['Redis 缓存', '消息队列', '分布式方案'],
  },
  {
    id: 'network',
    title: '计算机基础',
    category: '计算机网络',
    slug: 'network',
    color: 'from-green-400 to-emerald-500',
    stageTitles: ['网络协议', 'HTTP 与安全'],
  },
  {
    id: 'frontend',
    title: '前端开发工程师',
    category: '前端',
    slug: 'frontend',
    color: 'from-pink-400 to-rose-500',
    stageTitles: ['JS 基础', 'React 与工程化'],
  },
  {
    id: 'ai',
    title: 'AI Vibing',
    category: 'AI',
    slug: 'ai-vibing',
    color: 'from-indigo-400 to-blue-500',
    stageTitles: ['LLM 基础', 'Prompt 与 RAG', 'Agent 与安全'],
  },
] as const

function chunk<T>(items: T[], parts: number): T[][] {
  if (!items.length) return Array.from({ length: parts }, () => [])
  const size = Math.ceil(items.length / parts)
  const result: T[][] = []
  for (let i = 0; i < parts; i++) {
    result.push(items.slice(i * size, (i + 1) * size))
  }
  return result.filter((g) => g.length > 0)
}

export async function getLearningPaths(userId?: string) {
  const allQuestions = await listQuestions({ status: 'published' })
  const progressItems =
    userId && isPgEnabled() ? await listUserProgress(userId) : []
  const progressMap = new Map(progressItems.map((p) => [p.questionId, p]))

  return PATH_META.map((meta) => {
    const categoryQuestions = allQuestions
      .filter((q) => q.category === meta.category)
      .sort((a, b) => a.id.localeCompare(b.id))

    const groups = chunk(categoryQuestions, meta.stageTitles.length)
    const stages = groups.map((questions, i) => {
      let mastered = 0
      let practiced = 0
      for (const q of questions) {
        const p = progressMap.get(q.id)
        if (p?.status === 'mastered') mastered++
        else if (p) practiced++
      }
      const total = questions.length
      const completed = mastered + practiced
      return {
        id: `${meta.id}-s${i + 1}`,
        title: meta.stageTitles[i] ?? `阶段 ${i + 1}`,
        questionIds: questions.map((q) => q.id),
        total,
        mastered,
        practiced,
        completed,
        progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })

    const totalQuestions = stages.reduce((s, st) => s + st.total, 0)
    const completedQuestions = stages.reduce((s, st) => s + st.completed, 0)

    return {
      id: meta.id,
      title: meta.title,
      category: meta.category,
      slug: meta.slug,
      color: meta.color,
      stages,
      totalQuestions,
      completedQuestions,
      progressPct:
        totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0,
    }
  })
}

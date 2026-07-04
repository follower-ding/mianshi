import type { InterviewReportDetail } from '../api/client'
import { categoryToSlug } from '../components/question-bank/bankCatalog'

type DimKey = 'accuracy' | 'depth' | 'structure' | 'practice'

export type PracticeLink = {
  label: string
  description?: string
  href: string
}

const DIM_LABELS: Record<DimKey, string> = {
  accuracy: '准确性',
  depth: '深度',
  structure: '结构表达',
  practice: '实战经验',
}

const DIM_HINT: Record<DimKey, string> = {
  accuracy: '基础概念',
  depth: '原理深入',
  structure: '答题结构',
  practice: '项目实战',
}

const TECH_TERMS = [
  'JVM', 'Spring', 'Spring Boot', 'MySQL', 'Redis', 'Kafka', '并发', '多线程', '线程',
  '锁', '索引', '事务', 'HTTP', 'HTTPS', 'TCP', 'DNS', 'React', 'Vue', '浏览器',
  '性能优化', '分布式', '微服务', 'Docker', 'Kubernetes', 'Golang', 'Python', 'C++',
  '算法', '链表', '二叉树', '动态规划', 'HashMap', 'ArrayList', 'GC', '垃圾回收',
  'Prompt', 'LLM', '大模型', '消息队列', '缓存', 'CAP', '一致性',
]

export function positionToBankSlug(position: string): string {
  if (/前端/.test(position)) return 'frontend'
  if (/算法|AI/.test(position)) return 'ai-vibing'
  if (/网络/.test(position)) return 'network'
  if (/Java|C\+\+|Go|Python|后端|测试/.test(position)) return 'java'
  return 'java'
}

export function topicToBankSlug(topic: string, fallback: string): string {
  if (/MySQL|数据库|索引|事务|SQL|存储/i.test(topic)) return 'database'
  if (/Redis|MQ|Kafka|中间件|分布式|缓存|消息/i.test(topic)) return 'middleware'
  if (/TCP|HTTP|网络|DNS|握手/i.test(topic)) return 'network'
  if (/React|前端|浏览器|JS|CSS|渲染/i.test(topic)) return 'frontend'
  if (/Prompt|LLM|大模型|Agent|AI/i.test(topic)) return 'ai-vibing'
  return fallback
}

export function extractSearchKeyword(text: string): string {
  const lower = text.toLowerCase()
  for (const term of TECH_TERMS) {
    if (lower.includes(term.toLowerCase()) || text.includes(term)) return term
  }
  const m = text.match(/[A-Za-z][A-Za-z0-9+#.]*/)
  if (m) return m[0]
  const cn = text.match(/[\u4e00-\u9fa5]{2,8}/)
  return cn ? cn[0] : text.slice(0, 10)
}

export function practiceBankUrl(slug: string, query: string): string {
  const q = query.trim()
  if (!q) return `/questions/${slug}`
  return `/questions/${slug}?q=${encodeURIComponent(q)}`
}

export function practiceSearchUrl(query: string): string {
  return `/questions?q=${encodeURIComponent(query.trim())}`
}

function resolveBankSlug(report: InterviewReportDetail): string {
  if (report.sourceCategory) {
    const fromSource = categoryToSlug(report.sourceCategory)
    if (fromSource) return fromSource
  }
  return positionToBankSlug(report.position)
}

type Dim = { accuracy: number; depth: number; structure: number; practice: number }

function avgDimensions(rounds: InterviewReportDetail['rounds']): Dim | null {
  const dims = rounds.map((r) => r.dimensions).filter(Boolean) as Dim[]
  if (!dims.length) return null
  const sum = dims.reduce(
    (acc, d) => ({
      accuracy: acc.accuracy + d.accuracy,
      depth: acc.depth + d.depth,
      structure: acc.structure + d.structure,
      practice: acc.practice + d.practice,
    }),
    { accuracy: 0, depth: 0, structure: 0, practice: 0 },
  )
  const n = dims.length
  return {
    accuracy: sum.accuracy / n,
    depth: sum.depth / n,
    structure: sum.structure / n,
    practice: sum.practice / n,
  }
}

function weakestDimension(dim: Dim): DimKey {
  const entries: DimKey[] = ['accuracy', 'depth', 'structure', 'practice']
  return entries.reduce((min, k) => (dim[k] < dim[min] ? k : min), entries[0])
}

function lowScoreTopics(report: InterviewReportDetail): { topic: string; score: number }[] {
  const fromRounds = report.rounds
    .filter((r) => r.score < 12)
    .map((r) => ({ topic: r.topic || r.question, score: r.score }))
  const fromBreakdown = report.scoreBreakdown
    .filter((b) => b.score < 12)
    .map((b) => ({ topic: b.topic, score: b.score }))
  const merged = [...fromRounds, ...fromBreakdown]
  const seen = new Set<string>()
  return merged.filter((item) => {
    const key = item.topic.trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export type ReportPracticePlan = {
  defaultBankSlug: string
  primary: PracticeLink
  suggestions: PracticeLink[]
  improvementLinks: Array<{ text: string; href: string; label: string }>
  roundLinks: Array<{ topic: string; score: number; href: string }>
  interviewAgainUrl: string
}

export function buildReportPracticePlan(report: InterviewReportDetail): ReportPracticePlan {
  const defaultBankSlug = resolveBankSlug(report)
  const dimAvg = avgDimensions(report.rounds)
  const weakTopics = lowScoreTopics(report)

  let primary: PracticeLink
  if (weakTopics.length > 0) {
    const top = weakTopics.sort((a, b) => a.score - b.score)[0]
    const slug = topicToBankSlug(top.topic, defaultBankSlug)
    const keyword = extractSearchKeyword(top.topic)
    primary = {
      label: `补强「${top.topic}」相关题`,
      description: `本题得分 ${top.score}/20，建议针对性刷题`,
      href: practiceBankUrl(slug, keyword),
    }
  } else if (dimAvg) {
    const weak = weakestDimension(dimAvg)
    if (dimAvg[weak] < 3.5) {
      primary = {
        label: `针对「${DIM_LABELS[weak]}」薄弱项刷题`,
        description: `当前均值 ${dimAvg[weak].toFixed(1)}/5，推荐刷 ${DIM_HINT[weak]} 类题目`,
        href: practiceBankUrl(defaultBankSlug, DIM_HINT[weak]),
      }
    } else {
      primary = {
        label: `继续刷 ${report.position} 相关题`,
        description: '按目标岗位巩固高频考点',
        href: `/questions/${defaultBankSlug}`,
      }
    }
  } else {
    primary = {
      label: `刷 ${report.position} 题库`,
      description: '从岗位分类开始系统练习',
      href: `/questions/${defaultBankSlug}`,
    }
  }

  const suggestions: PracticeLink[] = []
  const usedHrefs = new Set([primary.href])

  for (const topic of weakTopics.slice(0, 3)) {
    const slug = topicToBankSlug(topic.topic, defaultBankSlug)
    const keyword = extractSearchKeyword(topic.topic)
    const href = practiceBankUrl(slug, keyword)
    if (usedHrefs.has(href)) continue
    usedHrefs.add(href)
    suggestions.push({
      label: topic.topic,
      description: `${topic.score}/20 分`,
      href,
    })
  }

  if (dimAvg) {
    const weak = weakestDimension(dimAvg)
    if (dimAvg[weak] < 4 && dimAvg[weak] >= 3.5) {
      const href = practiceBankUrl(defaultBankSlug, DIM_HINT[weak])
      if (!usedHrefs.has(href)) {
        suggestions.push({
          label: `提升${DIM_LABELS[weak]}`,
          href,
        })
        usedHrefs.add(href)
      }
    }
  }

  const improvementLinks = report.improvements.map((text) => {
    const keyword = extractSearchKeyword(text)
    const slug = topicToBankSlug(text, defaultBankSlug)
    return {
      text,
      href: practiceBankUrl(slug, keyword),
      label: `刷「${keyword}」相关题`,
    }
  })

  const roundSources =
    report.rounds.length > 0
      ? report.rounds.map((r) => ({ topic: r.topic || r.question, score: r.score }))
      : report.scoreBreakdown.map((b) => ({ topic: b.topic, score: b.score }))

  const roundLinks = roundSources
    .filter((r) => r.topic && r.score < 14)
    .map((r) => {
      const keyword = extractSearchKeyword(r.topic)
      const slug = topicToBankSlug(r.topic, defaultBankSlug)
      return {
        topic: r.topic,
        score: r.score,
        href: practiceBankUrl(slug, keyword),
      }
    })

  const interviewParams = new URLSearchParams()
  if (report.position) interviewParams.set('position', report.position)
  if (report.experience) interviewParams.set('experience', report.experience)

  return {
    defaultBankSlug,
    primary,
    suggestions,
    improvementLinks,
    roundLinks,
    interviewAgainUrl: `/interview?${interviewParams.toString()}`,
  }
}

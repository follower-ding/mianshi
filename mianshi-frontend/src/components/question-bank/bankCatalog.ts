import {
  Code2,
  Database,
  Layers,
  Monitor,
  Network,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type QuestionBankDef = {
  slug: string
  title: string
  subtitle: string
  description: string
  /** 对应 API category 筛选字段 */
  category: string
  icon: LucideIcon
  /** 无题时仍展示，点击进入筹备页 */
  preview?: boolean
}

export const QUESTION_BANKS: QuestionBankDef[] = [
  {
    slug: 'java',
    title: 'Java 后端',
    subtitle: 'JVM · 并发 · Spring',
    description: '集合、多线程、JVM 调优、Spring 全家桶等高频后端考点。',
    category: 'Java',
    icon: Code2,
  },
  {
    slug: 'database',
    title: '数据库',
    subtitle: 'MySQL · 索引 · 事务',
    description: 'SQL 优化、索引设计、事务隔离、主从复制与分库分表。',
    category: '数据库',
    icon: Database,
  },
  {
    slug: 'middleware',
    title: '中间件',
    subtitle: 'Redis · MQ · 分布式',
    description: '缓存、消息队列、分布式锁、CAP 与一致性方案。',
    category: '中间件',
    icon: Layers,
  },
  {
    slug: 'network',
    title: '计算机网络',
    subtitle: 'TCP · HTTP · 安全',
    description: 'OSI 分层、TCP 握手、HTTP/HTTPS、DNS 与网络安全基础。',
    category: '计算机网络',
    icon: Network,
  },
  {
    slug: 'frontend',
    title: '前端开发',
    subtitle: 'React · 浏览器 · 性能',
    description: 'JS 基础、React 原理、浏览器渲染、性能优化与工程化。',
    category: '前端',
    icon: Monitor,
  },
  {
    slug: 'ai-vibing',
    title: 'AI Vibing',
    subtitle: 'Prompt · Agent · LLM',
    description: '大模型原理、Prompt 工程、Agent 编排与 AI 辅助开发实践。',
    category: 'AI',
    icon: Sparkles,
  },
]

export const SLUG_BY_CATEGORY: Record<string, string> = Object.fromEntries(
  QUESTION_BANKS.map((b) => [b.category, b.slug]),
)

export function getBankBySlug(slug: string): QuestionBankDef | undefined {
  return QUESTION_BANKS.find((b) => b.slug === slug)
}

/** 将方向名转为 URL slug；已知方向用固定 slug，新方向自动生成 */
export function slugFromCategory(category: string): string {
  const known = SLUG_BY_CATEGORY[category]
  if (known) return known
  const slug = category
    .trim()
    .toLowerCase()
    .replace(/[\s_/\\]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/gi, '')
  return slug || 'other'
}

/** 从 slug 反查方向名（需传入当前库中所有方向） */
export function resolveCategoryFromSlug(slug: string, categories: string[]): string | undefined {
  const bank = getBankBySlug(slug)
  if (bank) return bank.category
  return categories.find((c) => slugFromCategory(c) === slug)
}

/** 支持动态方向的题库定义（含未在 QUESTION_BANKS 注册的新方向） */
export function resolveBankDef(slug: string, categories: string[]): QuestionBankDef | undefined {
  const known = getBankBySlug(slug)
  if (known) return known
  const category = resolveCategoryFromSlug(slug, categories)
  if (!category) return undefined
  return {
    slug,
    title: category,
    subtitle: '自定义题库',
    description: `${category} 相关面试真题与解析，持续更新中。`,
    category,
    icon: Sparkles,
    preview: true,
  }
}

/** 统计中有题、但未在 QUESTION_BANKS 展示的方向 */
export function getExtraCategoryBanks(
  byCategory: Record<string, number>,
): { category: string; count: number; slug: string }[] {
  const known = new Set(QUESTION_BANKS.map((b) => b.category))
  return Object.entries(byCategory)
    .filter(([cat, count]) => count > 0 && !known.has(cat))
    .map(([category, count]) => ({
      category,
      count,
      slug: slugFromCategory(category),
    }))
    .sort((a, b) => b.count - a.count)
}

export function categoryToSlug(category: string): string | undefined {
  return slugFromCategory(category)
}

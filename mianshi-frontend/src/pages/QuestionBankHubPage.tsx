import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronRight, Map, Search, Sparkles } from 'lucide-react'
import { api, type Question } from '../api/client'
import {
  QUESTION_BANKS,
  categoryToSlug,
  getExtraCategoryBanks,
  type QuestionBankDef,
} from '../components/question-bank/bankCatalog'
import { ContinuePracticeBanner } from '../components/question-bank/ContinuePracticeBanner'
import { QuestionBankCard } from '../components/question-bank/QuestionBankCard'
import { Badge } from '../components/ui/Badge'
import { QuestionBankHubSkeleton, QuestionSearchSkeleton } from '../components/ui/Skeleton'
import {
  hasImagesInMarkdown,
  searchSnippet,
} from '../components/question-bank/questionDisplayUtils'
import { DifficultyTag } from '../components/question-bank/QuestionTags'

export function QuestionBankHubPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const globalQuery = searchParams.get('q')?.trim() ?? ''
  const [stats, setStats] = useState<{
    total: number
    byCategory: Record<string, number>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<Question[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    const legacyCategory = searchParams.get('category')
    const legacyId = searchParams.get('id')
    if (legacyCategory) {
      const slug = categoryToSlug(legacyCategory) ?? legacyCategory.toLowerCase()
      const params = new URLSearchParams()
      if (legacyId) params.set('id', legacyId)
      const qs = params.toString()
      navigate(`/questions/${slug}${qs ? `?${qs}` : ''}`, { replace: true })
      return
    }
  }, [searchParams, navigate])

  useEffect(() => {
    api
      .getQuestionStats()
      .then(setStats)
      .catch(() => setStats({ total: 0, byCategory: {} }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!globalQuery) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    api
      .listQuestions({ search: globalQuery })
      .then((res) => setSearchResults(res.items.slice(0, 30)))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false))
  }, [globalQuery])

  const bankCards = useMemo(() => {
    if (!stats) return []
    return QUESTION_BANKS.map((bankDef) => ({
      bank: bankDef,
      count: stats.byCategory[bankDef.category] ?? 0,
    }))
  }, [stats])

  const extraBanks = useMemo(() => {
    if (!stats) return []
    return getExtraCategoryBanks(stats.byCategory)
  }, [stats])

  const handleEnter = (bankDef: QuestionBankDef, count: number) => {
    if (count === 0 && !bankDef.preview) return
    navigate(`/questions/${bankDef.slug}`)
  }

  const openQuestion = (q: Question) => {
    const slug = categoryToSlug(q.category) ?? 'java'
    const params = new URLSearchParams()
    if (globalQuery) params.set('q', globalQuery)
    params.set('id', q.id)
    navigate(`/questions/${slug}?${params.toString()}`)
  }

  if (loading) return <QuestionBankHubSkeleton />

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page">
      <div className="border-b border-border bg-elevated">
        <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
          <div>
            <p className="text-sm font-medium text-brand">面试题库</p>
              <h1 className="mt-1 text-2xl font-bold text-text lg:text-3xl">
                {globalQuery ? `搜索「${globalQuery}」` : '选择你的刷题方向'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                {globalQuery
                  ? '在全站题库中搜索匹配题目，点击可进入对应分类继续刷题。'
                  : `按技术栈分类精选真题，进入后可左侧选题、中间阅读解析、右侧目录跳转。平台共 ${stats?.total ?? 0} 道题，持续扩充中。`}
              </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
        {globalQuery && (
          <section className="mb-8">
            {searchLoading ? (
              <QuestionSearchSkeleton />
            ) : searchResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg-subtle px-6 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-3 font-medium text-text-secondary">未找到相关题目</p>
                <p className="mt-1 text-sm text-muted">试试更短的关键词，或浏览下方分类题库</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {searchResults.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => openQuestion(q)}
                      className="flex w-full cursor-pointer items-start gap-4 rounded-xl border border-border bg-elevated px-4 py-4 text-left transition-all hover:border-brand/30 hover:bg-bg-subtle hover:shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-text">{q.title}</p>
                          <DifficultyTag difficulty={q.difficulty} />
                          {hasImagesInMarkdown(q.referenceAnswer) && (
                            <Badge variant="info">含配图</Badge>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                          {searchSnippet(q)}
                        </p>
                        {q.keyPoints && q.keyPoints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {q.keyPoints.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] text-muted"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {q.status && q.status !== 'published' && (
                          <Badge variant="warning">未发布</Badge>
                        )}
                        <Badge variant="default">{q.category}</Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!globalQuery && <ContinuePracticeBanner variant="hub" />}
        {!globalQuery && (
          <Link
            to="/paths"
            className="mb-6 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-elevated/60 px-5 py-4 transition hover:border-brand/30 hover:bg-bg-subtle"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                <Map className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-xs font-medium text-brand">系统刷题路线</p>
                <p className="font-semibold text-text">按阶段循序渐进，进度与题库自动同步</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  适合想按学习路径规划的同学，从入门到进阶分阶段刷题
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
              查看路线
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bankCards.map(({ bank: bankDef, count }, i) => (
            <QuestionBankCard
              key={bankDef.slug}
              icon={bankDef.icon}
              title={bankDef.title}
              subtitle={bankDef.subtitle}
              description={bankDef.description}
              count={count}
              preview={bankDef.preview}
              disabled={count === 0 && !bankDef.preview}
              delay={i * 0.05}
              onClick={() => handleEnter(bankDef, count)}
            />
          ))}
          {extraBanks.map(({ category, count, slug }, i) => (
            <QuestionBankCard
              key={slug}
              icon={Sparkles}
              title={category}
              subtitle="自定义方向"
              description={`${category} 相关面试题，共 ${count} 道。`}
              count={count}
              preview
              disabled={false}
              delay={(bankCards.length + i) * 0.05}
              onClick={() => navigate(`/questions/${slug}`)}
            />
          ))}
        </div>

        {!globalQuery && (
          <div className="mt-10 rounded-xl border border-border bg-elevated p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
                  <BookOpen className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-text">刷题体验说明</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    左侧列表选题 → 中间 Tab 看答案/自测 → 底部操作栏标记掌握并自动下一题
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/paths')}
                className="flex cursor-pointer items-center gap-1 text-sm text-brand hover:underline"
              >
                查看刷题路线
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

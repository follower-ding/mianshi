import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, type Question } from '../api/client'
import { usePracticeProgress } from '../hooks/usePracticeProgress'
import {
  countUnpracticed,
  findFirstUnpracticedId,
  findNextUnpracticedId,
  useQuestionBankKeyboard,
} from '../hooks/useQuestionBankFlow'
import { getBankBySlug, resolveBankDef } from '../components/question-bank/bankCatalog'
import { practice as practiceUi } from '../components/question-bank/practiceLayout'
import { saveLastBank } from '../lib/practiceStorage'
import { useAuth } from '../contexts/AuthContext'
import { QuestionListPanel, QuestionListPanelMobileBack } from '../components/question-bank/QuestionListPanel'
import { QuestionDetailPanel, type Tab } from '../components/question-bank/QuestionDetailPanel'
import { getTocForTab } from '../components/question-bank/questionToc'
import { QuestionSidePanel } from '../components/question-bank/QuestionSidePanel'
import { QuestionBankToolbar } from '../components/question-bank/QuestionBankToolbar'
import { PracticeFlowBar } from '../components/question-bank/PracticeFlowBar'
import { Loading, EmptyState } from '../components/ui/Loading'
import { Button } from '../components/ui/Button'

const DIFFICULTIES = ['全部', '简单', '中等', '困难'] as const
const PROGRESS_FILTERS = ['全部', '未刷', '已刷', '已掌握', '收藏'] as const

const POSITION_BY_CATEGORY: Record<string, string> = {
  Java: 'Java 后端开发',
  数据库: 'Java 后端开发',
  中间件: 'Java 后端开发',
  计算机网络: 'Java 后端开发',
  前端: '前端开发',
  AI: 'AI 工程师',
}

export function QuestionBankPage() {
  const navigate = useNavigate()
  const { bankSlug } = useParams<{ bankSlug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const practice = usePracticeProgress()

  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)

  const bank = useMemo(() => {
    if (!bankSlug) return undefined
    return resolveBankDef(bankSlug, categoryNames) ?? getBankBySlug(bankSlug)
  }, [bankSlug, categoryNames])

  useEffect(() => {
    api
      .getQuestionStats()
      .then((s) => {
        setCategoryNames(Object.keys(s.byCategory ?? {}))
      })
      .catch(() => {})
      .finally(() => setStatsLoaded(true))
  }, [])

  useEffect(() => {
    if (bank) {
      saveLastBank(
        { slug: bank.slug, title: bank.title, category: bank.category },
        user?.id ?? null,
      )
    }
  }, [bank, user?.id])

  const [items, setItems] = useState<Question[]>([])
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') ?? '全部')
  const [progressFilter, setProgressFilter] = useState('全部')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'))
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [mobileShowDetail, setMobileShowDetail] = useState(() => {
    const hasId = Boolean(searchParams.get('id'))
    if (!hasId) return false
    return typeof window !== 'undefined' && window.innerWidth < 1024
  })
  const [activeTab, setActiveTab] = useState<Tab>('answer')
  const [activeSection, setActiveSection] = useState('section-keypoints')

  // Track user-initiated selection to prevent effect cycles
  const selectingRef = useRef(false)

  useEffect(() => {
    if (!bankSlug) {
      navigate('/questions', { replace: true })
      return
    }
    if (!statsLoaded) return
    if (!bank) {
      navigate('/questions', { replace: true })
    }
  }, [bank, bankSlug, navigate, statsLoaded])

  const load = useCallback(async () => {
    if (!bank) return
    setLoading(true)
    setError(null)
    try {
      const listRes = await api.listQuestions({
        category: bank.category,
        search: search || undefined,
        difficulty: difficulty === '全部' ? undefined : difficulty,
      })
      setItems(listRes.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请确认后端已启动')
    } finally {
      setLoading(false)
    }
  }, [bank, search, difficulty])

  useEffect(() => {
    load()
  }, [load])

  const filteredItems = useMemo(
    () =>
      progressFilter === '全部'
        ? items
        : items.filter((q) => practice.progressFilterMatch(q.id, progressFilter)),
    [items, progressFilter, practice],
  )

  const hotQuestions = useMemo(
    () => [...items].sort((a, b) => b.views - a.views).slice(0, 8),
    [items],
  )

  const selectedIndex = useMemo(
    () => (selectedId ? filteredItems.findIndex((q) => q.id === selectedId) : -1),
    [filteredItems, selectedId],
  )

  const bankPracticedCount = useMemo(
    () =>
      items.filter((q) => {
        const p = practice.getProgress(q.id)
        return p?.status === 'practiced' || p?.status === 'mastered'
      }).length,
    [items, practice],
  )

  const completionPct =
    items.length > 0 ? Math.round((bankPracticedCount / items.length) * 100) : 0

  const unpracticedLeft = countUnpracticed(filteredItems, practice.getProgress)

  const syncUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams()
      if (difficulty !== '全部') params.set('difficulty', difficulty)
      if (search) params.set('q', search)
      if (id) params.set('id', id)
      setSearchParams(params, { replace: true })
    },
    [difficulty, search, setSearchParams],
  )

  const selectQuestion = useCallback(
    async (id: string, tab: Tab = 'answer') => {
      if (!id) return
      if (selectingRef.current) return
      selectingRef.current = true
      try {
        setSelectedId(id)
        setDetailError(null)
        setDetailLoading(true)
        if (window.innerWidth < 1024) {
          setMobileShowDetail(true)
        }
        setActiveTab(tab)
        setActiveSection(tab === 'quiz' ? 'section-quiz' : 'section-keypoints')
        practice.markViewed(id)
        syncUrl(id)

        const q = await api.getQuestion(id)
        setSelectedQuestion(q)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '加载题目失败'
        setDetailError(msg)
        setSelectedQuestion(null)
      } finally {
        setDetailLoading(false)
        selectingRef.current = false
      }
    },
    [practice, syncUrl],
  )

  const urlQuestionId = searchParams.get('id')

  // 从搜索/外链进入时，根据 URL ?id= 自动加载题目
  useEffect(() => {
    if (loading || !urlQuestionId) return
    if (selectedQuestion?.id === urlQuestionId) return
    if (selectingRef.current) return
    selectQuestion(urlQuestionId)
  }, [loading, urlQuestionId, selectedQuestion?.id, selectQuestion])

  // 大屏首次进入：无 URL id 时自动选中第一题
  useEffect(() => {
    if (loading || urlQuestionId || filteredItems.length === 0) return
    if (selectedQuestion || selectedId) return
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      selectQuestion(filteredItems[0].id)
    }
  }, [loading, urlQuestionId, filteredItems, selectedQuestion, selectedId, selectQuestion])

  const goPrev = useCallback(() => {
    if (selectedIndex > 0) selectQuestion(filteredItems[selectedIndex - 1].id, activeTab)
  }, [selectedIndex, filteredItems, selectQuestion, activeTab])

  const goNext = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filteredItems.length - 1) {
      selectQuestion(filteredItems[selectedIndex + 1].id, activeTab)
    }
  }, [selectedIndex, filteredItems, selectQuestion, activeTab])

  const goNextUnpracticed = useCallback(() => {
    const nextId = findNextUnpracticedId(filteredItems, selectedId, practice.getProgress)
    if (nextId) selectQuestion(nextId, 'quiz')
  }, [filteredItems, selectedId, practice, selectQuestion])

  const startPracticeSession = useCallback(() => {
    const id = findFirstUnpracticedId(filteredItems, practice.getProgress)
    if (id) selectQuestion(id, 'quiz')
  }, [filteredItems, practice, selectQuestion])

  const handleMarkMastered = useCallback(async () => {
    if (!selectedQuestion) return
    await practice.markMastered(selectedQuestion.id)
    const nextId = findNextUnpracticedId(filteredItems, selectedQuestion.id, practice.getProgress)
    if (nextId && nextId !== selectedQuestion.id) {
      setTimeout(() => selectQuestion(nextId, 'quiz'), 400)
    }
  }, [selectedQuestion, practice, filteredItems, selectQuestion])

  useQuestionBankKeyboard(goPrev, goNext, handleMarkMastered)

  const startInterview = (q: Question) => {
    const position = POSITION_BY_CATEGORY[q.category] ?? 'Java 后端开发'
    navigate(
      `/interview?questionId=${encodeURIComponent(q.id)}&position=${encodeURIComponent(position)}&mode=quick`,
    )
  }

  const navigateSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const displayQuestion =
    selectedQuestion ??
    (selectedId ? filteredItems.find((q) => q.id === selectedId) ?? null : null)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    const toc = getTocForTab(tab, displayQuestion ?? undefined)
    setActiveSection(toc[0]?.id ?? '')
  }

  if (!bank) return null

  const toc = getTocForTab(activeTab, displayQuestion ?? undefined)
  const prog = displayQuestion ? practice.getProgress(displayQuestion.id) : undefined

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-page">
        <Loading text={`加载 ${bank.title} 题库...`} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-page">
        <QuestionBankToolbar
          bankTitle={bank.title}
          bankSubtitle={bank.subtitle}
          listCount={0}
          practicedCount={0}
          completionPct={0}
          onBack={() => navigate('/questions')}
          onStartPractice={() => {}}
          onQuickInterview={() => navigate('/quick')}
        />
        <div className="mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16">
          <EmptyState
            icon="📚"
            title={`${bank.title} 题库筹备中`}
            description="该方向题目正在整理入库，可先选择其他方向刷题"
          />
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigate('/questions')}>
              <ArrowLeft className="h-4 w-4" />
              返回选择题库
            </Button>
            <Button variant="secondary" onClick={() => navigate('/questions/java')}>
              去 Java 刷题
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-page">
        <QuestionBankToolbar
          bankTitle={bank.title}
          bankSubtitle={bank.subtitle}
          listCount={items.length}
          practicedCount={bankPracticedCount}
          completionPct={completionPct}
          onBack={() => navigate('/questions')}
          onStartPractice={startPracticeSession}
          onQuickInterview={() => navigate('/quick')}
        />
        <div className="mx-auto max-w-lg px-4 py-16">
          <EmptyState icon="🔍" title="暂无匹配题目" description="调整筛选条件试试" />
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setDifficulty('全部')
                setProgressFilter('全部')
                setSearch('')
              }}
            >
              重置筛选
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-page">
      <QuestionBankToolbar
        bankTitle={bank.title}
        bankSubtitle={bank.subtitle}
        listCount={items.length}
        practicedCount={bankPracticedCount}
        completionPct={completionPct}
        onBack={() => navigate('/questions')}
        onStartPractice={startPracticeSession}
        onQuickInterview={() => navigate('/quick')}
      />

      {error && (
        <div className="shrink-0 bg-danger-light px-4 py-2 text-sm text-danger">{error}</div>
      )}

      <div className={`mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 ${practiceUi.workspace}`}>
        <QuestionListPanel
          bankTitle={bank.title}
          bankSubtitle={bank.subtitle}
          items={filteredItems}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          progressFilter={progressFilter}
          onProgressFilterChange={setProgressFilter}
          difficulties={DIFFICULTIES}
          progressFilters={PROGRESS_FILTERS}
          total={items.length}
          completionPct={completionPct}
          practicedCount={bankPracticedCount}
          onBack={() => navigate('/questions')}
          onStartPractice={startPracticeSession}
          onQuickInterview={() => navigate('/quick')}
          onSelect={(id) => selectQuestion(id)}
          getProgress={practice.getProgress}
          getLastViewed={practice.getLastViewed}
          mobileShowDetail={mobileShowDetail}
        />

        <div
          className={`${practiceUi.card} min-h-0 min-w-0 flex-1 ${!mobileShowDetail ? 'hidden lg:flex' : 'flex'}`}
        >
          {mobileShowDetail && (
            <QuestionListPanelMobileBack onBack={() => setMobileShowDetail(false)} />
          )}

          {detailLoading && !displayQuestion ? (
            <div className="flex flex-1 items-center justify-center">
              <Loading text="加载题目..." />
            </div>
          ) : detailError && !displayQuestion ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-danger">{detailError}</p>
              <Button variant="secondary" onClick={() => urlQuestionId && selectQuestion(urlQuestionId)}>
                重试
              </Button>
            </div>
          ) : displayQuestion ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col" key={displayQuestion.id}>
                <QuestionDetailPanel
                  question={displayQuestion}
                  index={selectedIndex >= 0 ? selectedIndex : 0}
                  total={filteredItems.length}
                  bankSlug={bankSlug}
                  onPrev={goPrev}
                  onNext={goNext}
                  onToggleFavorite={() => practice.toggleFavorite(displayQuestion.id)}
                  onMarkMastered={handleMarkMastered}
                  onMarkPracticed={() => practice.markPracticed(displayQuestion.id)}
                  onStartInterview={() => startInterview(displayQuestion)}
                  isFavorite={Boolean(prog?.favorite)}
                  isMastered={prog?.status === 'mastered'}
                  tab={activeTab}
                  onTabChange={handleTabChange}
                  onSectionChange={setActiveSection}
                />
              </div>
              <PracticeFlowBar
                index={selectedIndex >= 0 ? selectedIndex : 0}
                total={filteredItems.length}
                isMastered={prog?.status === 'mastered'}
                unpracticedLeft={unpracticedLeft}
                onPrev={goPrev}
                onNext={goNext}
                onMarkMastered={handleMarkMastered}
                onNextUnpracticed={goNextUnpracticed}
                onStartInterview={() => startInterview(displayQuestion)}
                onStartQuiz={() => handleTabChange('quiz')}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted">
              <span>请从左侧选择一道题目开始刷题</span>
              {filteredItems.length > 0 && (
                <Button size="sm" onClick={() => selectQuestion(filteredItems[0].id)}>
                  开始第一题
                </Button>
              )}
            </div>
          )}
        </div>

        {displayQuestion && (
          <QuestionSidePanel
            toc={toc}
            activeSection={activeSection}
            onNavigate={navigateSection}
            hotQuestions={hotQuestions}
            selectedId={selectedId}
            onSelectHot={(id) => selectQuestion(id)}
          />
        )}
      </div>
    </div>
  )
}

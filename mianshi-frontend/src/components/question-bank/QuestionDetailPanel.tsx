import { useState, type ReactNode } from 'react'
import {
  Star,
  ThumbsUp,
  Eye,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Send,
  Loader2,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'
import type { Question } from '../../api/client'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { ResumeSourceBadge } from '../resume/ResumeSourceBadge'
import { DifficultyTag, CategoryTag, TypeTag } from './QuestionTags'
import { MarkdownContent } from '../markdown/MarkdownContent'
import { practice } from './practiceLayout'
import { QuestionPublicPreview } from './QuestionPublicPreview'
import { questionToPublicPreview } from '../../lib/questionPreviewUtils'
import { questionSubtitle, shouldShowQuestionSection } from './questionDisplayUtils'

type Tab = 'answer' | 'quiz' | 'followup' | 'interview'

export type { Tab }

const TABS: { key: Tab; label: string }[] = [
  { key: 'answer', label: '推荐答案' },
  { key: 'quiz', label: '试一下' },
  { key: 'followup', label: '面试问答' },
  { key: 'interview', label: '开始面试' },
]

type Props = {
  question: Question
  index: number
  total: number
  bankSlug?: string
  onPrev: () => void
  onNext: () => void
  onToggleFavorite: () => void
  onMarkMastered: () => void
  onMarkPracticed: () => void
  onStartInterview: () => void
  isFavorite: boolean
  isMastered: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
  onSectionChange: (id: string) => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className={`${practice.sectionBanner} scroll-mt-28 first:mt-0`}>
      {children}
    </h3>
  )
}

function KeyPointList({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-brand/20 bg-brand-light/20 p-4">
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-text-secondary">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MetaAction({
  onClick,
  active,
  children,
}: {
  onClick?: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[13px] transition-colors duration-150 ${
        active
          ? 'bg-brand-light text-brand'
          : 'text-muted hover:bg-bg-subtle hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export function QuestionDetailPanel({
  question,
  index,
  total,
  bankSlug,
  onPrev,
  onNext,
  onToggleFavorite,
  onMarkMastered,
  onMarkPracticed,
  onStartInterview,
  isFavorite,
  isMastered,
  tab,
  onTabChange,
  onSectionChange,
}: Props) {
  const [quizRevealed, setQuizRevealed] = useState<'none' | 'hints' | 'full'>('none')
  const [linkCopied, setLinkCopied] = useState(false)

  // AI Quiz scoring state
  const [quizAnswer, setQuizAnswer] = useState('')
  const [quizScoring, setQuizScoring] = useState(false)
  const [quizResult, setQuizResult] = useState<{
    score: number
    accuracy: number
    depth: number
    structure: number
    practice: number
    feedback: string
    strengths: string[]
    weaknesses: string[]
    comparison: string
    source?: 'llm' | 'demo'
  } | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)

  const submitQuizAnswer = async () => {
    if (!quizAnswer.trim() || quizScoring) return
    setQuizScoring(true)
    setQuizError(null)
    setQuizResult(null)
    onMarkPracticed()
    try {
      const res = await api.scoreQuizAnswer(question.id, quizAnswer.trim())
      setQuizResult(res)
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : 'AI 评分失败，请稍后重试')
    } finally {
      setQuizScoring(false)
    }
  }

  const switchTab = (next: Tab) => {
    onTabChange(next)
    setQuizRevealed('none')
    setQuizAnswer('')
    setQuizResult(null)
    setQuizError(null)
    const defaultSection =
      next === 'answer'
        ? 'section-keypoints'
        : next === 'quiz'
          ? 'section-quiz'
          : next === 'followup'
            ? 'section-followup'
            : 'section-interview'
    onSectionChange(defaultSection)
  }

  const revealHints = () => {
    setQuizRevealed('hints')
    onMarkPracticed()
    onSectionChange('section-hints')
  }

  const revealFull = () => {
    setQuizRevealed('full')
    onMarkPracticed()
    onSectionChange('section-ref')
  }

  const shareLink = async () => {
    const base = bankSlug
      ? `${window.location.origin}/questions/${bankSlug}`
      : `${window.location.origin}/questions`
    const url = `${base}?id=${question.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const likeCount = 0 // Reserved for future community voting
  const atStart = index <= 0
  const atEnd = index >= total - 1
  const subtitle = questionSubtitle(question.content, question.title)
  const showQuestionBody = shouldShowQuestionSection(question.content, question.title)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Sticky hero + tabs */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-elevated/90 backdrop-blur-md">
        <div className="px-6 pb-0 pt-6 lg:px-8 lg:pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="min-w-0 flex-1">
              <span className="mb-2 block font-mono text-xs tabular-nums tracking-wider text-muted">
                第 {index + 1} 题
              </span>
              <span className="block text-2xl font-bold leading-tight tracking-tight text-text lg:text-[1.75rem]">
                {question.title}
              </span>
              {subtitle && (
                <span className="mt-3 block text-[15px] font-normal leading-relaxed text-text-secondary">
                  {subtitle}
                </span>
              )}
            </h1>

            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/70 bg-panel/60 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={onPrev}
                disabled={atStart}
                aria-label="上一题"
                className="rounded-md p-1.5 text-text-secondary transition hover:bg-elevated hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[3rem] px-1 text-center font-mono text-xs tabular-nums text-muted">
                {index + 1}/{total}
              </span>
              <button
                type="button"
                onClick={onNext}
                disabled={atEnd}
                aria-label="下一题"
                className="rounded-md p-1.5 text-text-secondary transition hover:bg-elevated hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DifficultyTag difficulty={question.difficulty} />
            <CategoryTag>{question.category}</CategoryTag>
            {question.type && <TypeTag>{question.type}</TypeTag>}
            {question.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border/60"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border/50 pt-4">
            <MetaAction onClick={onToggleFavorite} active={isFavorite}>
              <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-brand text-brand' : ''}`} />
              收藏
            </MetaAction>
            <MetaAction onClick={shareLink}>
              <Share2 className="h-3.5 w-3.5" />
              {linkCopied ? '已复制' : '分享'}
            </MetaAction>
            <span className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted">
              <ThumbsUp className="h-3.5 w-3.5" />
              {likeCount}
            </span>
            <span className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted">
              <Eye className="h-3.5 w-3.5" />
              {question.views.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-1 border-b border-border/40 px-6 lg:px-8">
          {TABS.map(({ key, label }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`relative px-4 pb-3 pt-1 text-sm transition-all duration-200 ${
                  active ? 'font-semibold text-brand' : 'font-medium text-muted hover:text-text-secondary'
                }`}
              >
                {label}
                <span
                  className={`absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-brand transition-opacity duration-150 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable content — 全宽阅读，减少两侧空白 */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-[820px] space-y-6">
          {tab === 'answer' && (
            <QuestionPublicPreview
              question={questionToPublicPreview(question)}
              variant="user"
              showHeader={false}
              withSectionIds
            />
          )}

          {tab === 'quiz' && (
            <>
              <section id="section-quiz" className="scroll-mt-28">
                <SectionTitle>题目</SectionTitle>
                <div className="rounded-xl border border-border bg-panel p-5 shadow-sm">
                  {showQuestionBody ? (
                    <MarkdownContent source={question.content} headingIdPrefix="quiz-q" />
                  ) : (
                    <p className="text-[15px] leading-relaxed text-text-secondary">{question.title}</p>
                  )}
                </div>
              </section>

              {/* Answer input */}
              <section id="section-quiz-input" className="scroll-mt-28">
                <SectionTitle>你的回答</SectionTitle>
                <textarea
                  value={quizAnswer}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                  placeholder="在此输入你的回答，AI 将为你的表现评分并提供改进建议..."
                  rows={6}
                  className="w-full resize-y rounded-xl border border-border/70 bg-panel/60 px-4 py-3 text-[15px] text-text outline-none placeholder:text-muted transition-all duration-200 focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      submitQuizAnswer()
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={submitQuizAnswer}
                    disabled={!quizAnswer.trim() || quizScoring}
                  >
                    {quizScoring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI 评分中...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        提交评分
                      </>
                    )}
                  </Button>
                  <span className="text-[12px] text-muted">Ctrl+Enter 提交</span>
                </div>

                {quizError && (
                  <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
                    {quizError}
                  </p>
                )}
              </section>

              {/* AI Scoring Results */}
              {quizResult && (
                <>
                  <section id="section-score" className="scroll-mt-28 animate-fade-in">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <SectionTitle>AI 评分</SectionTitle>
                      <ResumeSourceBadge source={quizResult.source} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: '综合', value: quizResult.score, color: 'text-brand' },
                        { label: '准确度', value: quizResult.accuracy, color: 'text-info' },
                        { label: '深度', value: quizResult.depth, color: 'text-success' },
                        { label: '结构化', value: quizResult.structure, color: 'text-warning' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl border border-border/60 bg-panel/60 p-4 text-center">
                          <p className={`text-2xl font-bold ${color}`}>{value}</p>
                          <p className="mt-1 text-xs text-muted">{label}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section id="section-feedback" className="scroll-mt-28 animate-fade-in">
                    <SectionTitle>
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        综合反馈
                      </span>
                    </SectionTitle>
                    <div className="rounded-xl border border-brand/20 bg-brand-light/30 p-5">
                      <p className="text-[15px] leading-relaxed text-text-secondary">
                        {quizResult.feedback}
                      </p>
                    </div>
                  </section>

                  <section id="section-strengths" className="scroll-mt-28 animate-fade-in">
                    <SectionTitle>优点</SectionTitle>
                    <ul className="space-y-2">
                      {quizResult.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-[15px] text-text-secondary">
                          <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-success" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section id="section-weaknesses" className="scroll-mt-28 animate-fade-in">
                    <SectionTitle>待改进</SectionTitle>
                    <ul className="space-y-2">
                      {quizResult.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-2 text-[15px] text-text-secondary">
                          <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-warning" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section id="section-comparison" className="scroll-mt-28 animate-fade-in">
                    <SectionTitle>对比参考</SectionTitle>
                    <p className="text-[15px] leading-relaxed text-text-secondary">
                      {quizResult.comparison}
                    </p>
                  </section>

                  {question.referenceAnswer && (
                    <section id="section-ref" className="scroll-mt-28 animate-fade-in">
                      <SectionTitle>参考答案</SectionTitle>
                      <MarkdownContent source={question.referenceAnswer} headingIdPrefix="ref" />
                    </section>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onMarkMastered()
                      setQuizAnswer('')
                      setQuizResult(null)
                    }}
                    disabled={isMastered}
                    className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:border-success/40 hover:bg-success-light hover:text-success disabled:cursor-default disabled:border-success/30 disabled:bg-success-light disabled:text-success"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isMastered ? '已掌握' : '标记为已掌握（重新开始）'}
                  </button>
                </>
              )}

              {/* Quick reveal (legacy fallback) */}
              {!quizResult && quizRevealed === 'none' && quizAnswer.trim() === '' && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" onClick={revealHints}>
                    跳过作答，显示得分要点
                  </Button>
                </div>
              )}

              {!quizResult && quizRevealed !== 'none' && (question.keyPoints?.length ?? 0) > 0 && (
                <section id="section-hints" className="scroll-mt-28 animate-fade-in">
                  <SectionTitle>回答重点</SectionTitle>
                  <KeyPointList items={question.keyPoints ?? []} />
                </section>
              )}

              {!quizResult && quizRevealed === 'full' && question.referenceAnswer && (
                <section id="section-ref" className="scroll-mt-28 animate-fade-in">
                  <SectionTitle>参考答案</SectionTitle>
                  <MarkdownContent source={question.referenceAnswer} headingIdPrefix="ref" />
                </section>
              )}

              {!quizResult && quizRevealed === 'hints' && (
                <button
                  type="button"
                  onClick={revealFull}
                  className="mt-4 text-sm font-medium text-brand transition hover:underline"
                >
                  继续显示参考答案 →
                </button>
              )}
            </>
          )}

          {tab === 'followup' && (
            <section id="section-followup" className="scroll-mt-28">
              <SectionTitle>面试问答</SectionTitle>
              {question.followUpTemplates && question.followUpTemplates.length > 0 ? (
                <div className="space-y-3">
                  {question.followUpTemplates.map((t, i) => (
                    <div
                      key={t}
                      className="rounded-xl border border-border bg-panel p-4 transition hover:border-brand/30 hover:shadow-sm"
                    >
                      <p className="mb-2 text-xs font-semibold tracking-wide text-brand">
                        追问 {i + 1}
                      </p>
                      <p className="text-[15px] leading-[1.8] text-text-secondary">{t}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] text-muted">暂无追问内容</p>
              )}
            </section>
          )}

          {tab === 'interview' && (
            <section id="section-interview" className="scroll-mt-28">
              <SectionTitle>开始面试</SectionTitle>
              <p className="text-[15px] leading-[1.8] text-text-secondary">
                以本题「{question.title}」开启约 5 分钟的 AI 模拟面试，系统会根据你的回答评分并追问。
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-muted">
                <li className="flex gap-2">
                  <span className="text-brand">·</span>
                  结合得分要点 Rubric 智能评分
                </li>
                <li className="flex gap-2">
                  <span className="text-brand">·</span>
                  支持语音作答与面试报告
                </li>
                <li className="flex gap-2">
                  <span className="text-brand">·</span>
                  结束后可查看改进建议
                </li>
              </ul>
              <Button onClick={onStartInterview} className={`${practice.ctaPrimary} mt-6`}>
                开始模拟面试
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

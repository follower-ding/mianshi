import { Search, Star, ChevronLeft, CheckCircle2, Play, Zap, ChevronDown } from 'lucide-react'
import type { Question } from '../../api/client'
import { formatLastViewed } from '../../hooks/usePracticeProgress'
import { DifficultyTag } from './QuestionTags'
import { practice } from './practiceLayout'
import { Button } from '../ui/Button'

type Props = {
  bankTitle: string
  bankSubtitle: string
  items: Question[]
  selectedId: string | null
  search: string
  onSearchChange: (v: string) => void
  difficulty: string
  onDifficultyChange: (v: string) => void
  progressFilter: string
  onProgressFilterChange: (v: string) => void
  difficulties: readonly string[]
  progressFilters: readonly string[]
  total: number
  completionPct: number
  practicedCount: number
  onBack: () => void
  onStartPractice: () => void
  onQuickInterview: () => void
  onSelect: (id: string) => void
  getProgress: (id: string) => { status?: string; favorite?: boolean } | undefined
  getLastViewed: (id: string) => string | undefined
  mobileShowDetail: boolean
}

export function QuestionListPanel({
  bankTitle,
  bankSubtitle,
  items,
  selectedId,
  search,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  progressFilter,
  onProgressFilterChange,
  difficulties,
  progressFilters,
  total,
  completionPct,
  practicedCount,
  onBack,
  onStartPractice,
  onQuickInterview,
  onSelect,
  getProgress,
  getLastViewed,
  mobileShowDetail,
}: Props) {
  return (
    <aside
      className={`${practice.card} w-full shrink-0 lg:w-[300px] xl:w-[320px] ${
        mobileShowDetail ? 'hidden lg:flex' : 'flex'
      }`}
    >
      {/* 题库头部 */}
      <div className="shrink-0 border-b border-border/60 px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition-colors duration-200 hover:bg-bg-subtle hover:text-brand"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返回题库
        </button>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-text">{bankTitle}</h2>
            <p className="mt-0.5 text-xs text-muted">{bankSubtitle}</p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand">
            {total} 题
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-panel/80 p-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>刷题进度</span>
            <span className="font-bold text-brand">{completionPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            已刷 {practicedCount}/{total}
          </p>
        </div>

        <div className="mt-3 hidden gap-2 lg:flex">
          <Button size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={onStartPractice}>
            <Play className="h-3.5 w-3.5" />
            未刷开始
          </Button>
          <Button size="sm" variant="secondary" className="h-8 rounded-lg px-2.5" onClick={onQuickInterview}>
            <Zap className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-panel/50 px-3 py-2.5 transition-all duration-200 focus-within:border-brand/40 focus-within:bg-elevated focus-within:ring-2 focus-within:ring-brand/10">
          <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            placeholder="搜索本题库..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">状态</p>
          <div className="flex flex-wrap gap-1.5">
            {progressFilters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onProgressFilterChange(f)}
                className={progressFilter === f ? practice.pillActive : practice.pillIdle}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">难度</p>
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => onDifficultyChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border/70 bg-panel/50 py-2 pl-3 pr-9 text-sm text-text outline-none transition-all duration-200 hover:border-brand/30 focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d === '全部' ? '全部难度' : d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {difficulties.filter((d) => d !== '全部').map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDifficultyChange(d === difficulty ? '全部' : d)}
                className={`${practice.diffChip} ${
                  difficulty === d ? practice.diffChipActive : practice.diffChipIdle
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 py-3">
          <p className="text-xs font-semibold text-muted">题目列表 · {items.length}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scroll-smooth">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">暂无匹配题目</p>
          ) : (
            <ul className="space-y-1">
              {items.map((q, idx) => {
                const prog = getProgress(q.id)
                const active = q.id === selectedId
                const last = getLastViewed(q.id)
                const mastered = prog?.status === 'mastered'

                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(q.id)}
                      className={`group relative w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 ${
                        active
                          ? 'bg-brand-light/50 shadow-sm ring-1 ring-brand/20'
                          : 'hover:bg-bg-subtle/80'
                      }`}
                    >
                      {active && (
                        <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-brand" />
                      )}

                      <div className="flex gap-3">
                        <span
                          className={`mt-0.5 w-5 shrink-0 text-right font-mono text-xs tabular-nums ${
                            active ? 'font-bold text-brand' : 'text-muted'
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug ${
                              active
                                ? 'font-semibold text-brand'
                                : 'font-medium text-text-secondary group-hover:text-text'
                            }`}
                          >
                            {q.title}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <DifficultyTag difficulty={q.difficulty} />
                            {mastered && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-success-light px-1.5 py-0.5 text-[10px] font-medium text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                已掌握
                              </span>
                            )}
                            {prog?.favorite && (
                              <Star className="h-3 w-3 fill-warning text-warning" />
                            )}
                            {last && !active && (
                              <span className="text-[10px] text-muted">{formatLastViewed(last)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}

export function QuestionListPanelMobileBack({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 border-b border-border/60 bg-elevated px-4 py-2.5 text-sm text-text-secondary transition hover:text-brand lg:hidden"
    >
      <ChevronLeft className="h-4 w-4" />
      返回题目列表
    </button>
  )
}

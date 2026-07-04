import { Flame, ChevronRight } from 'lucide-react'
import type { Question } from '../../api/client'
import { practice } from './practiceLayout'

type Props = {
  toc: { id: string; label: string }[]
  activeSection: string
  onNavigate: (id: string) => void
  hotQuestions: Question[]
  selectedId: string | null
  onSelectHot: (id: string) => void
}

export function QuestionSidePanel({
  toc,
  activeSection,
  onNavigate,
  hotQuestions,
  selectedId,
  onSelectHot,
}: Props) {
  return (
    <aside className={`${practice.card} hidden w-[260px] shrink-0 xl:flex`}>
      {toc.length > 0 && (
        <div className="shrink-0 border-b border-border/60 p-5">
          <p className="mb-3 text-sm font-bold text-text">目录</p>
          <nav className="space-y-0.5">
            {toc.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-brand-light/70 font-semibold text-brand shadow-sm'
                    : 'text-text-secondary hover:bg-bg-subtle hover:text-text'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold text-text">
            <Flame className="h-4 w-4 text-warning" strokeWidth={1.75} />
            热门面试题
          </p>
          <span className="text-xs text-muted">更多</span>
        </div>
        <ol className="space-y-0.5">
          {hotQuestions.map((q, i) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onSelectHot(q.id)}
                className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                  q.id === selectedId ? 'bg-brand-light/50' : 'hover:bg-bg-subtle'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 shrink-0 text-xs font-bold ${
                    i < 3 ? 'text-warning' : 'text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`text-sm leading-snug ${
                      q.id === selectedId
                        ? 'font-semibold text-brand'
                        : 'text-text-secondary group-hover:text-brand'
                    }`}
                  >
                    {q.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-0.5 text-[11px] text-muted">
                    <Flame className="h-3 w-3" />
                    {q.views.toLocaleString()}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}

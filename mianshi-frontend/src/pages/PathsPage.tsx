import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Route } from 'lucide-react'
import { api, type LearningPath } from '../api/client'
import { Loading } from '../components/ui/Loading'
import { PathCard } from '../components/paths/PathCard'
import { PathStagePanel } from '../components/paths/PathStagePanel'
import { pathUi } from '../components/paths/pathLayout'

export function PathsPage() {
  const navigate = useNavigate()
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api
      .getLearningPaths()
      .then((res) => setPaths(res.items))
      .catch(() => setPaths([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading text="加载路线..." />

  const expandedPath = paths.find((p) => p.id === expanded)

  const totalQuestions = paths.reduce((sum, p) => sum + p.totalQuestions, 0)
  const totalCompleted = paths.reduce((sum, p) => sum + p.completedQuestions, 0)
  const overallPct = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0

  return (
    <div className={`${pathUi.workspace} animate-fade-in min-h-[calc(100vh-4rem)] bg-page`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">刷题路线</h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            按阶段系统刷题，进度与题库练习自动同步
          </p>
        </div>

        {paths.length > 0 && totalQuestions > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-elevated/80 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/12 ring-1 ring-brand/20">
              <Route className="h-4 w-4 text-brand" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">总进度</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-text">
                {overallPct}%
                <span className="ml-1.5 text-xs font-normal text-text-secondary">
                  {totalCompleted}/{totalQuestions} 题
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={pathUi.grid}>
        {paths.map((path, i) => (
          <PathCard
            key={path.id}
            path={path}
            index={i}
            delay={i * 0.05}
            isExpanded={expanded === path.id}
            onToggleExpand={() => setExpanded(expanded === path.id ? null : path.id)}
            onEnter={() => navigate(`/questions/${path.slug}`)}
          />
        ))}

        {expandedPath && (
          <PathStagePanel path={expandedPath} onClose={() => setExpanded(null)} />
        )}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadLastBank, loadPracticeLocal } from '../../lib/practiceStorage'
import { api } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  variant?: 'hub' | 'home'
}

export function ContinuePracticeBanner(_props: Props = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const lastBank = loadLastBank(userId)
  const [categoryTotal, setCategoryTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!lastBank) return
    api
      .getQuestionStats()
      .then((s) => setCategoryTotal(s.byCategory[lastBank.category] ?? 0))
      .catch(() => setCategoryTotal(null))
  }, [lastBank])

  if (!lastBank) return null

  const progress = loadPracticeLocal(userId)
  const touched = Object.keys(progress).length

  return (
    <div className="mb-6 rounded-xl border border-brand/25 bg-brand-light/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
            <BookOpen className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-xs font-medium text-brand">继续刷题</p>
            <h3 className="font-semibold text-text">{lastBank.title}</h3>
            <p className="mt-0.5 text-sm text-text-secondary">
              {categoryTotal != null ? `共 ${categoryTotal} 题` : '加载中...'}
              {touched > 0 ? ` · 已记录 ${touched} 题进度` : ''}
            </p>
          </div>
        </div>
        <Link
          to={`/questions/${lastBank.slug}`}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-hover"
        >
          继续
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

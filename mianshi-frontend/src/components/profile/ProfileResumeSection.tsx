import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Plus, Sparkles } from 'lucide-react'
import { api, type UserResume } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { resumeCompletionBadge } from '../resume/resumeLayout'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'

function formatUpdated(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function ProfileResumeSkeleton() {
  return (
    <Card className="p-6" aria-hidden>
      <Skeleton className="h-5 w-32" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </Card>
  )
}

export function ProfileResumeSection() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<UserResume[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    api
      .getResumes()
      .then((r) => setResumes(r.resumes ?? []))
      .catch(() => setResumes([]))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-semibold text-text">我的简历</h2>
            <p className="mt-1 text-sm text-text-secondary">登录后云端保存简历，并与智能投递联动</p>
            <Link to="/login?redirect=%2Fresume%2Fmine" className="mt-3 inline-block">
              <Button size="sm">登录管理简历</Button>
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) return <ProfileResumeSkeleton />

  const latest = resumes[0]
  const hasSummary = Boolean(latest?.summary?.trim())

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-semibold text-text">我的简历</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {resumes.length > 0
                ? `共 ${resumes.length} 份 · 最近更新 ${formatUpdated(latest?.updatedAt)}`
                : '还没有保存的简历，从生成或导入开始'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/resume/mine">
            <Button variant="secondary" size="sm">
              简历工作台
            </Button>
          </Link>
          <Link to="/resume/generate">
            <Button variant="secondary" size="sm">
              <Sparkles className="h-3.5 w-3.5" /> 快速生成
            </Button>
          </Link>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={FileText}
            title="还没有简历"
            description="AI 快速生成或导入现有 PDF，结构化后可排版导出"
          >
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/resume/generate">
                <Button size="sm">
                  <Sparkles className="h-3.5 w-3.5" /> 快速生成
                </Button>
              </Link>
              <Link to="/resume/optimize">
                <Button variant="secondary" size="sm">
                  导入优化
                </Button>
              </Link>
            </div>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border/60 rounded-xl border border-border/60 bg-panel/20">
          {resumes.slice(0, 5).map((r) => {
            const badge = resumeCompletionBadge(r.content ?? {})
            return (
              <li key={r.id}>
                <Link
                  to={`/resume/edit?id=${r.id}`}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{r.title || '未命名简历'}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatUpdated(r.updatedAt)} · {badge}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-brand">继续编辑</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {hasSummary && (
        <p className="mt-4 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-text-secondary">
          主简历已有 AI 亮点摘要，可在
          <Link to="/resume/mine" className="mx-1 text-brand hover:underline">
            我的简历
          </Link>
          同步到智能投递偏好。
        </p>
      )}

      {resumes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
          <Link to="/resume/mine">
            <Button variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" /> 新建 / 管理全部
            </Button>
          </Link>
          {latest && (
            <Link to={`/resume/edit?id=${latest.id}`}>
              <Button size="sm">
                继续编辑最新
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import { api, type UserResume } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { hasSavedResume } from './resumeLayout'

type Props = {
  /** 嵌入首页容器内，不再重复 max-width */
  embedded?: boolean
}

export function ResumeContinueBanner({ embedded }: Props) {
  const { user } = useAuth()
  const [resume, setResume] = useState<UserResume | null>(null)

  useEffect(() => {
    if (!user) return
    api
      .getResume()
      .then((r) => setResume(r.resume))
      .catch(() => setResume(null))
  }, [user])

  if (!user || !resume || !hasSavedResume(resume, resume.content)) return null

  const wrapClass = embedded ? 'mb-4 lg:mb-6' : 'mx-auto mb-6 max-w-[1280px] px-4 lg:px-8'

  return (
    <div className={wrapClass}>
      <Link
        to="/resume/mine"
        className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 transition-colors hover:bg-brand/10"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">继续编辑已保存简历</p>
            <p className="truncate text-xs text-muted">{resume.title || '我的简历'}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
          查看 <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Star,
  Trophy,
  FileText,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { api, type UserProfile } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { usePracticeProgress } from '../hooks/usePracticeProgress'
import { categoryToSlug } from '../components/question-bank/bankCatalog'
import { ContinuePracticeBanner } from '../components/question-bank/ContinuePracticeBanner'
import { ProfileResumeSection } from '../components/profile/ProfileResumeSection'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProfilePageSkeleton } from '../components/ui/Skeleton'

export function ProfilePage() {
  const { user, authEnabled } = useAuth()
  const { stats: localStats } = usePracticeProgress()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    api
      .getProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <ProfilePageSkeleton />

  if (authEnabled && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-text">个人中心</h1>
        <p className="mt-2 text-sm text-text-secondary">登录后同步刷题进度与面试报告</p>
        <Link to="/login?redirect=%2Fprofile" className="mt-6 inline-block">
          <Button>去登录</Button>
        </Link>
      </div>
    )
  }

  const stats = profile?.syncEnabled
    ? profile.stats
    : {
        practiced: localStats.practiced,
        mastered: localStats.mastered,
        favorites: localStats.favorites,
        reports: profile?.stats.reports ?? 0,
        interviews: profile?.stats.interviews ?? (profile?.stats.reports ?? 0),
      }

  const categoryProgress = profile?.categoryProgress ?? {}

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 lg:px-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">个人中心</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {user ? `${user.name} · ${user.email}` : '游客模式（进度保存在本地）'}
          </p>
        </div>
        <Link to="/questions">
          <Button>
            <BookOpen className="h-4 w-4" />
            去刷题
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <ContinuePracticeBanner variant="home" />
      </div>

      <div className="mt-6">
        <ProfileResumeSection />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '已刷题', value: stats.practiced + stats.mastered, icon: BookOpen },
          { label: '已掌握', value: stats.mastered, icon: Trophy },
          { label: '收藏', value: stats.favorites, icon: Star },
          { label: '面试报告', value: stats.reports, icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <Icon className="h-5 w-5 text-brand-dark" />
            <p className="mt-2 text-2xl font-bold text-text">{value}</p>
            <p className="text-xs text-text-secondary">{label}</p>
          </Card>
        ))}
      </div>

      {Object.keys(categoryProgress).length > 0 && (
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-dark" />
            <h2 className="font-semibold text-text">各方向进度</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(categoryProgress)
              .filter(([, v]) => v.total > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cat, p]) => {
                const done = p.practiced + p.mastered
                const pct = p.total > 0 ? Math.round((done / p.total) * 100) : 0
                const slug = categoryToSlug(cat)
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-medium text-text">
                        {done}/{p.total} 题 ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {slug && (
                      <Link
                        to={`/questions/${slug}`}
                        className="mt-1 inline-block text-xs text-brand-dark hover:underline"
                      >
                        继续刷题 →
                      </Link>
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {profile?.favorites && profile.favorites.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="font-semibold text-text">收藏题目</h2>
          <ul className="mt-3 space-y-2">
            {profile.favorites.map((q) => (
              <li key={q.id}>
                <Link
                  to={`/questions/${categoryToSlug(q.category) ?? 'java'}?id=${q.id}`}
                  className="text-sm text-text-secondary hover:text-brand-dark"
                >
                  {q.title}
                  <Badge>{q.difficulty}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {profile?.recentReports && profile.recentReports.length > 0 && (
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text">最近面试</h2>
            <Link to="/reports" className="text-sm text-brand-dark hover:underline">
              全部报告
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border-light">
            {profile.recentReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-text">{r.position}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')} · {r.totalScore} 分
                  </p>
                </div>
                <Link to={`/reports/${r.id}`}>
                  <Button variant="secondary" size="sm">
                    查看
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!profile?.syncEnabled && user && (
        <p className="mt-6 text-center text-xs text-text-secondary">
          当前为 JSON 模式，云端进度同步不可用；刷题进度保存在浏览器本地。
        </p>
      )}
    </div>
  )
}

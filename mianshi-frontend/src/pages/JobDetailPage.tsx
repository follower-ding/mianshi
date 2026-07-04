import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Send, ExternalLink, CheckCircle2, XCircle, Wand2 } from 'lucide-react'
import { api, type JobAnalysis, type JobPosting } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading } from '../components/ui/Loading'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.getJob(id),
      user ? api.getJobAnalysis(id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([j, a]) => {
        setJob(j)
        setAnalysis(a?.analysis ?? null)
      })
      .finally(() => setLoading(false))
  }, [id, user])

  const handleApply = async () => {
    if (!job || !user) return
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await api.applyJob(job.id, {})
      setApplyResult({
        ok: res.bossApply?.ok ?? true,
        message: res.bossApply?.message ?? '已记录投递',
      })
    } catch (e) {
      setApplyResult({ ok: false, message: e instanceof Error ? e.message : '投递失败' })
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <Loading text="加载岗位..." />
  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">岗位不存在</p>
        <Link to="/jobs" className="mt-4 inline-block"><Button variant="secondary">返回</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> 返回职位列表
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-2xl font-bold text-text">{job.title}</h1>
          {job.source === 'boss' && <Badge variant="info">Boss</Badge>}
          {analysis && (
            <Badge variant={analysis.tier === 'S' || analysis.tier === 'A' ? 'success' : 'default'}>
              {`${analysis.tier} 级 · ${analysis.matchScore} 分`}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-text-secondary">
          {job.company} · {job.city} · <span className="text-brand">{job.salary}</span>
        </p>
        <p className="mt-1 text-sm text-muted">{job.experience} · {job.education}</p>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold text-text">岗位描述</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{job.jd}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </Card>

      {analysis && (
        <Card className="mt-6 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-text">
            <Sparkles className="h-5 w-5 text-brand" />
            AI 岗位分析
            {analysis.demo && <span className="text-xs font-normal text-muted">（演示）</span>}
          </h2>
          <p className="mt-3 text-sm text-text-secondary">{analysis.summary}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-success">优势</h3>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                {analysis.pros.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-warning">注意</h3>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                {analysis.cons.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-text">投递建议</h3>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              {analysis.advice.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-text">面试可能考点</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {analysis.interviewFocus.map((t) => (
                <Badge key={t} variant="info">{t}</Badge>
              ))}
            </div>
          </div>
          {analysis.salaryInsight && (
            <p className="mt-4 text-sm text-text-secondary">💰 {analysis.salaryInsight}</p>
          )}
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/resume/optimize?jobId=${job.id}`}>
          <Button variant="secondary">
            <Wand2 className="mr-1 h-4 w-4" />
            用当前简历优化
          </Button>
        </Link>
        {user ? (
          <Button disabled={applying} onClick={handleApply}>
            <Send className="mr-1 h-4 w-4" />
            {applying ? '投递中...' : '平台内一键投递（需已绑定 Boss）'}
          </Button>
        ) : (
          <Link to="/login"><Button>登录后投递</Button></Link>
        )}
        {job.externalUrl && (
          <Button variant="secondary" onClick={() => window.open(job.externalUrl, '_blank')}>
            <ExternalLink className="mr-1 h-4 w-4" />
            Boss 原页
          </Button>
        )}
      </div>

      {applyResult && (
        <Card className={`mt-4 p-4 ${applyResult.ok ? 'border-success/30' : 'border-danger/30'}`}>
          <div className="flex items-center gap-2 text-sm">
            {applyResult.ok ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4 text-danger" />
            )}
            <span>{applyResult.message}</span>
          </div>
        </Card>
      )}
    </div>
  )
}

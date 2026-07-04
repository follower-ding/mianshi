import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, BarChart3, ListChecks, Brain, Target, TrendingUp, BookOpen, ArrowRight, Share2 } from 'lucide-react'
import { api, type InterviewReportDetail } from '../api/client'
import { ShareReportExperienceModal } from '../components/experiences/ShareReportExperienceModal'
import { categoryToSlug } from '../components/question-bank/bankCatalog'
import { buildReportPracticePlan, extractSearchKeyword, practiceBankUrl, topicToBankSlug } from '../lib/reportPracticeLinks'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading } from '../components/ui/Loading'

type Tab = 'overview' | 'transcript' | 'rounds'

function scoreColor(score: number) {
  if (score >= 16) return 'text-success'
  if (score >= 12) return 'text-info'
  if (score >= 8) return 'text-warning'
  return 'text-danger'
}

type Dim = { accuracy: number; depth: number; structure: number; practice: number }

function avgDimensions(rounds: InterviewReportDetail['rounds']): Dim | null {
  const dims = rounds.map((r) => r.dimensions).filter(Boolean) as Dim[]
  if (!dims.length) return null
  const sum = dims.reduce(
    (acc, d) => ({
      accuracy: acc.accuracy + d.accuracy,
      depth: acc.depth + d.depth,
      structure: acc.structure + d.structure,
      practice: acc.practice + d.practice,
    }),
    { accuracy: 0, depth: 0, structure: 0, practice: 0 },
  )
  const n = dims.length
  return {
    accuracy: sum.accuracy / n,
    depth: sum.depth / n,
    structure: sum.structure / n,
    practice: sum.practice / n,
  }
}

function SkillRadar({ dimensions }: { dimensions: Dim }) {
  const labels = [
    { key: 'accuracy' as const, label: '准确性' },
    { key: 'depth' as const, label: '深度' },
    { key: 'structure' as const, label: '结构' },
    { key: 'practice' as const, label: '实战' },
  ]
  const cx = 120
  const cy = 120
  const maxR = 80
  const angleStep = (Math.PI * 2) / labels.length

  const points = labels.map((item, i) => {
    const angle = -Math.PI / 2 + i * angleStep
    const r = (dimensions[item.key] / 5) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: item.label, value: dimensions[item.key] }
  })

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox="0 0 240 240" className="h-48 w-48 shrink-0">
        {[1, 2, 3, 4, 5].map((level) => (
          <polygon
            key={level}
            points={labels
              .map((_, i) => {
                const angle = -Math.PI / 2 + i * angleStep
                const r = (level / 5) * maxR
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
          />
        ))}
        {labels.map((item, i) => {
          const angle = -Math.PI / 2 + i * angleStep
          const x = cx + maxR * Math.cos(angle)
          const y = cy + maxR * Math.sin(angle)
          return (
            <line key={item.key} x1={cx} y1={cy} x2={x} y2={y} className="stroke-border" strokeWidth="0.5" />
          )
        })}
        <polygon points={polygon} className="fill-brand/25 stroke-brand" strokeWidth="2" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" className="fill-brand-dark" />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-2 text-sm w-full sm:w-auto">
        {labels.map((item) => (
          <div key={item.key} className="flex justify-between gap-4 rounded-lg bg-bg-subtle px-3 py-2">
            <span className="text-text-secondary">{item.label}</span>
            <span className="font-medium text-text">{dimensions[item.key].toFixed(1)}/5</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<InterviewReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .getReport(id)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loading text="加载报告..." />
  if (error || !report) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center animate-fade-in">
        <p className="text-danger">{error ?? '报告不存在'}</p>
        <Link to="/reports" className="mt-4 inline-block text-sm text-brand-dark hover:underline">返回报告列表</Link>
      </div>
    )
  }

  const dimensionAvg = avgDimensions(report.rounds)
  const practicePlan = buildReportPracticePlan(report)
  const bankSlug = report.sourceCategory ? categoryToSlug(report.sourceCategory) : practicePlan.defaultBankSlug
  const returnBankUrl = `/questions/${bankSlug}`
  const returnQuestionUrl =
    report.sourceQuestionId && bankSlug
      ? `/questions/${bankSlug}?id=${report.sourceQuestionId}`
      : returnBankUrl

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: '总览', icon: BarChart3 },
    { id: 'rounds', label: '逐题分析', icon: ListChecks },
    { id: 'transcript', label: '对话复盘', icon: MessageSquare },
  ]

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 lg:px-8 animate-fade-in">
      <Link to="/reports" className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors">
        <ArrowLeft className="h-4 w-4" />
        返回报告列表
      </Link>

      <Card className="p-6 bg-gradient-to-br from-brand-light to-white border-brand/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">{report.position}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {report.experience} · {report.answerCount} 轮问答 · {new Date(report.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-dark">{report.totalScore}</div>
              <div className="text-xs text-text-secondary">总分</div>
            </div>
            <Badge variant={report.overallRating === '优秀' ? 'success' : report.overallRating === '良好' ? 'info' : 'warning'}>
              {report.overallRating}
            </Badge>
          </div>
        </div>
        <p className="mt-4 leading-relaxed text-text-secondary">{report.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-brand/15 pt-4">
          {report.sharedExperienceId ? (
            <Link to={`/experiences/${report.sharedExperienceId}`}>
              <Button variant="secondary" size="sm">
                <Share2 className="h-4 w-4" />
                已分享面经 · 查看详情
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              分享到面经社区
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-6 border-brand/25 bg-brand/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-brand">
              <BookOpen className="h-5 w-5" strokeWidth={1.75} />
              <h2 className="font-semibold text-text">根据报告推荐刷题</h2>
            </div>
            {practicePlan.primary.description && (
              <p className="mt-1.5 text-sm text-text-secondary">{practicePlan.primary.description}</p>
            )}
          </div>
          <Link to={practicePlan.primary.href} className="shrink-0">
            <Button className="w-full sm:w-auto">
              {practicePlan.primary.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {practicePlan.suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-brand/15 pt-4">
            {practicePlan.suggestions.map((s) => (
              <Link key={s.href} to={s.href}>
                <Button variant="secondary" size="sm">
                  {s.label}
                  {s.description ? ` · ${s.description}` : ''}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex gap-1 rounded-xl border border-border-light bg-bg-subtle p-1">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === tabId
                ? 'bg-white text-text shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {dimensionAvg && (
              <Card className="p-5 sm:col-span-2">
                <h3 className="font-semibold text-text">能力雷达图</h3>
                <p className="mt-1 text-xs text-text-secondary">基于各轮 Rubric 四维评分均值</p>
                <div className="mt-4">
                  <SkillRadar dimensions={dimensionAvg} />
                </div>
              </Card>
            )}
            <Card className="p-5">
              <div className="flex items-center gap-2 text-success">
                <Brain className="h-5 w-5" />
                <h3 className="font-semibold">优势</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {report.strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-text-secondary">
                    <span className="text-success shrink-0 mt-0.5">●</span>
                    {s}
                  </li>
                ))}
                {report.strengths.length === 0 && <li className="text-sm text-muted">暂无记录</li>}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-warning">
                <Target className="h-5 w-5" />
                <h3 className="font-semibold">待改进</h3>
              </div>
              <ul className="mt-3 space-y-3">
                {practicePlan.improvementLinks.map((item) => (
                  <li key={item.text} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <span className="flex gap-2 text-sm text-text-secondary">
                      <span className="text-warning shrink-0 mt-0.5">●</span>
                      <span>{item.text}</span>
                    </span>
                    <Link
                      to={item.href}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline sm:mt-0.5"
                    >
                      {item.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
                {practicePlan.improvementLinks.length === 0 && <li className="text-sm text-muted">暂无记录</li>}
              </ul>
            </Card>
            <Card className="p-5 sm:col-span-2">
              <div className="flex items-center gap-2 text-info">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-semibold">下一步学习建议</h3>
              </div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text-secondary">
                {report.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </Card>
            {report.scoreBreakdown.length > 0 && (
              <Card className="p-5 sm:col-span-2">
                <h3 className="font-semibold text-text">得分详情</h3>
                <div className="mt-4 space-y-3">
                  {report.scoreBreakdown.map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary">{item.topic}</span>
                        <span className={`font-medium ${scoreColor(item.score)}`}>{item.score} 分</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.score >= 16 ? 'bg-success' : item.score >= 12 ? 'bg-info' : item.score >= 8 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${Math.min((item.score / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">{item.comment}</p>
                      {item.score < 14 && (
                        <Link
                          to={practiceBankUrl(
                            topicToBankSlug(item.topic, practicePlan.defaultBankSlug),
                            extractSearchKeyword(item.topic),
                          )}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          刷「{extractSearchKeyword(item.topic)}」相关题
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'rounds' && (
          <div className="space-y-4">
            {(report.rounds.length ? report.rounds : report.scoreBreakdown.map((b) => ({
              topic: b.topic,
              question: b.topic,
              answer: '',
              score: b.score,
              feedback: b.comment,
            }))).map((round, i) => {
              const roundLink = practicePlan.roundLinks.find(
                (l) => l.topic === round.topic || l.topic === round.question,
              )
              return (
              <Card key={i} className="p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-text">第 {i + 1} 题 · {round.topic}</h3>
                  <span className={`text-lg font-bold ${scoreColor(round.score)}`}>{round.score} 分</span>
                </div>
                {round.question && round.question !== round.topic && (
                  <p className="mt-2 text-sm text-text-secondary">
                    <span className="font-medium text-text">问题：</span>{round.question}
                  </p>
                )}
                {round.answer && (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    <span className="font-medium text-text">你的回答：</span>{round.answer}
                  </p>
                )}
                <div className="mt-2 rounded-lg bg-brand/10 px-3 py-2 text-sm text-text-secondary">
                  {round.feedback}
                </div>
                {roundLink && (
                  <Link
                    to={roundLink.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    <BookOpen className="h-4 w-4" />
                    刷「{extractSearchKeyword(roundLink.topic)}」相关题
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </Card>
              )
            })}
          </div>
        )}

        {tab === 'transcript' && (
          <Card className="p-4">
            <div className="flex max-h-[600px] flex-col gap-4 overflow-y-auto">
              {report.transcript.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'candidate' ? 'flex-row-reverse' : ''} animate-fade-in`} style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                    msg.role === 'interviewer' ? 'bg-brand text-text' : 'bg-gray-200 text-text-secondary'
                  }`}>
                    {msg.role === 'interviewer' ? 'AI' : '我'}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'interviewer' ? 'bg-bg-subtle' : 'bg-gray-100 text-text-secondary'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={practicePlan.primary.href}>
          <Button>
            <BookOpen className="h-4 w-4" />
            {practicePlan.primary.label}
          </Button>
        </Link>
        <Link to={practicePlan.interviewAgainUrl}>
          <Button variant="secondary">再练一次同岗位</Button>
        </Link>
        {report.sourceQuestionId && (
          <Link to={returnQuestionUrl}>
            <Button variant="secondary">返回本题</Button>
          </Link>
        )}
        <Link to={returnBankUrl}>
          <Button variant="secondary">浏览题库</Button>
        </Link>
        <Link to="/reports">
          <Button variant="secondary">面试记录</Button>
        </Link>
      </div>

      {id && (
        <ShareReportExperienceModal
          reportId={id}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onShared={(experienceId) => {
            setReport((prev) =>
              prev
                ? {
                    ...prev,
                    sharedExperienceId: experienceId,
                    sharedExperienceStatus: 'pending',
                  }
                : prev,
            )
            navigate(`/experiences/${experienceId}`)
          }}
        />
      )}
    </div>
  )
}
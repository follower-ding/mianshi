import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronDown, Sparkles, ArrowRight, Bot, BookOpen, BarChart3, Mic, FileText, Wand2 } from 'lucide-react'
import { InterviewWindow } from '../components/interview/InterviewWindow'
import { ContinuePracticeBanner } from '../components/question-bank/ContinuePracticeBanner'
import { ResumeContinueBanner } from '../components/resume/ResumeContinueBanner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { BRAND } from '../lib/brand'
import {
  DEMO_MESSAGES,
  POSITIONS,
  EXPERIENCE_LEVELS,
  QUICK_TAGS,
} from '../lib/data'

const FEATURES = [
  { icon: Mic, title: '语音模拟', desc: '流式对话，接近真实面试节奏' },
  { icon: BarChart3, title: '维度评分', desc: '表达、逻辑、深度分项反馈' },
  { icon: BookOpen, title: '岗位题库', desc: '按技术栈分类，支持刷题进度' },
  { icon: Bot, title: 'AI 面试官', desc: '根据 JD 与年限生成追问' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [position, setPosition] = useState('')
  const [experience, setExperience] = useState('')
  const [questionTotal, setQuestionTotal] = useState<number | null>(null)
  const [recentReport, setRecentReport] = useState<{ position: string; totalScore: number; id: string } | null>(null)

  useEffect(() => {
    api.getQuestionStats().then((s) => setQuestionTotal(s.total)).catch(() => setQuestionTotal(null))
  }, [])

  useEffect(() => {
    if (!user) return
    api
      .listReports()
      .then((res) => {
        const first = res.items[0]
        if (first) setRecentReport({ id: first.id, position: first.position, totalScore: first.totalScore })
      })
      .catch(() => {})
  }, [user])

  const handleStart = () => {
    const params = new URLSearchParams()
    if (position) params.set('position', position)
    if (experience) params.set('experience', experience)
    navigate(`/interview?${params.toString()}`)
  }

  const selectWrapClass = 'relative w-full sm:min-w-[200px] sm:flex-1 sm:max-w-[240px]'

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        <ResumeContinueBanner embedded />
      </div>

      <section className="relative mx-auto max-w-[1280px] px-4 pt-6 text-center lg:px-8 lg:pt-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="absolute -right-32 top-32 h-64 w-64 rounded-full bg-brand/5 blur-3xl" />
        </div>

        <div className="relative animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-4 py-1.5 text-sm text-text-secondary">
            <Sparkles className="h-4 w-4 text-brand" />
            {BRAND.tagline}
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-text sm:text-5xl">
            代码与表达，
            <span className="text-brand"> 同样清晰</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary lg:text-lg">
            模拟面试、刷题备战、AI 简历与智能投递 — 一条链路搞定求职准备。
            题库 {questionTotal != null ? `${questionTotal.toLocaleString()}+` : '2,000+'} 真题。
          </p>
        </div>

        <Card className="relative mx-auto mt-8 max-w-3xl p-5 text-left sm:p-6 animate-slide-up" style={{ animationDelay: '0.08s' }}>
          <p className="text-sm font-medium text-text">快速开始模拟面试</p>
          <p className="mt-1 text-xs text-muted">选择目标岗位与年限，立即进入 AI 面试</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <div className={selectWrapClass}>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="!h-11 w-full appearance-none pr-10"
              >
                <option value="">请选择目标岗位</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <div className={selectWrapClass}>
              <Select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="!h-11 w-full appearance-none pr-10"
              >
                <option value="">请选择工作年限</option>
                {EXPERIENCE_LEVELS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <Button size="lg" onClick={handleStart} className="w-full shrink-0 sm:w-auto sm:self-center">
              开始面试
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/questions')} className="w-full shrink-0 sm:w-auto sm:self-center">
              刷题题库
            </Button>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <ContinuePracticeBanner variant="home" />
          </div>
        </Card>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <span className="text-sm text-muted">热门岗位：</span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setPosition(tag)
                navigate(`/interview?position=${encodeURIComponent(tag)}`)
              }}
              className="cursor-pointer rounded-full border border-border bg-panel px-3.5 py-1.5 text-sm text-text-secondary transition-all hover:border-brand/40 hover:bg-brand-light hover:text-text"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[1280px] px-4 lg:px-8">
        <Card className="border-brand/20 bg-brand/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold">简历工作台</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                AI 生成、导入优化、专业模板排版，一键导出 PDF
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/resume/mine">
                <Button variant="secondary" size="sm">我的简历</Button>
              </Link>
              <Link to="/resume/generate">
                <Button variant="secondary" size="sm">
                  <Sparkles className="h-3.5 w-3.5" /> 快速生成
                </Button>
              </Link>
              <Link to="/resume/optimize">
                <Button variant="secondary" size="sm">
                  <Wand2 className="h-3.5 w-3.5" /> 导入优化
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto mt-16 max-w-[1280px] px-4 lg:px-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        {recentReport ? (
          <div className="rounded-2xl border border-brand/25 bg-brand-light/30 p-6 text-center">
            <p className="text-sm text-text-secondary">上次模拟面试</p>
            <p className="mt-1 font-semibold text-text">
              {recentReport.position} · {recentReport.totalScore} 分
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => navigate(`/reports/${recentReport.id}`)}>
              查看报告
            </Button>
          </div>
        ) : (
          <InterviewWindow
            title={`沉浸式模拟面试 - ${position || 'Java 后端开发'}`}
            messages={DEMO_MESSAGES}
          />
        )}
      </section>

      <section className="mx-auto mt-24 max-w-[1400px] px-4 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-text">核心能力</h2>
          <p className="mt-2 text-text-secondary">从刷题到模拟，一条清晰的备战路径</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Card key={f.title} hover className="group p-6 animate-slide-up" style={{ animationDelay: `${0.1 * i}s` }}>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-brand/20 bg-brand-light transition-transform group-hover:-translate-y-0.5">
                <f.icon className="h-6 w-6 text-brand" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 font-semibold text-text">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-4 lg:px-8">
        <div className="rounded-2xl border border-border bg-elevated p-8 lg:p-12">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { value: questionTotal != null ? questionTotal.toLocaleString() : '—', label: '真题题库' },
              { value: '4 维', label: '评分模型' },
              { value: '免费', label: '开箱即刷' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono text-3xl font-bold text-brand">{s.value}</div>
                <div className="mt-1 text-sm text-text-secondary">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

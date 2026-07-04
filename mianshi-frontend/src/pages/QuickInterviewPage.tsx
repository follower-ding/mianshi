import { Zap, Clock, Target, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { POSITIONS } from '../lib/data'
import { Card } from '../components/ui/Card'

const MODES = [
  {
    key: 'quick' as const,
    icon: Zap,
    title: '5 分钟快问快答',
    desc: '高频基础题快速过一遍，适合碎片时间',
    duration: '5 min',
    questions: 2,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    key: 'standard' as const,
    icon: Clock,
    title: '15 分钟技术面',
    desc: '涵盖基础 + 项目 + 场景设计',
    duration: '15 min',
    questions: 4,
    gradient: 'from-blue-400 to-purple-500',
  },
  {
    key: 'deep' as const,
    icon: Target,
    title: '30 分钟综合面',
    desc: '完整模拟一面流程，含深度追问',
    duration: '30 min',
    questions: 6,
    gradient: 'from-green-400 to-emerald-500',
  },
]

export function QuickInterviewPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 lg:px-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text">快速面试</h1>
        <p className="mt-1 text-sm text-text-secondary">选择模式，立即开始 AI 模拟面试</p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {MODES.map((mode, i) => (
          <Card
            key={mode.title}
            hover
            onClick={() => navigate(`/interview?mode=${mode.key}`)}
            className="group p-6 text-left animate-slide-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${mode.gradient} shadow-lg transition-transform group-hover:scale-110`}>
              <mode.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-4 font-semibold text-text">{mode.title}</h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{mode.desc}</p>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-text-secondary font-medium">{mode.duration}</span>
              <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-text-secondary font-medium">{mode.questions} 题</span>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-brand-dark font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              开始面试 <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-14">
        <h2 className="mb-4 font-semibold text-text">选择岗位</h2>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => navigate(`/interview?position=${encodeURIComponent(p)}`)}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm text-text-secondary transition-all hover:border-brand hover:bg-brand/10 hover:text-text active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

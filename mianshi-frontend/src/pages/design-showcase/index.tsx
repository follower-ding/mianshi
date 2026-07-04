import { Link } from 'react-router-dom'
import {
  Sparkles,
  Droplets,
  CircleDot,
  Zap,
  Cpu,
  ArrowRight,
  Palette,
} from 'lucide-react'

const styles = [
  {
    slug: 'admin',
    title: 'iume · 后台三风格对比',
    desc: 'Studio Neutral / Slate Console / Data Dense Pro',
    icon: Palette,
    gradient: 'from-teal-50 via-slate-50 to-blue-50',
    featured: true,
  },
  {
    slug: 'mianshi',
    title: 'iume · 三风格对比',
    desc: '专业 / 文艺 / 暗色科技 · 核心页面并排预览',
    icon: Palette,
    gradient: 'from-slate-100 via-teal-50 to-amber-50',
    featured: true,
  },
  {
    slug: 'minimal',
    title: 'Minimal + Micro-interactions',
    desc: '极简美学 · 每一次交互都有回应',
    icon: Sparkles,
    gradient: 'from-stone-50 to-stone-100',
  },
  {
    slug: 'glassmorphism',
    title: 'Glassmorphism',
    desc: '毛玻璃质感 · 通透轻盈的现代感',
    icon: Droplets,
    gradient: 'from-purple-600 via-fuchsia-500 to-blue-500',
  },
  {
    slug: 'neumorphism',
    title: 'Neumorphism',
    desc: '新拟态 · 光影交汇的立体触感',
    icon: CircleDot,
    gradient: 'from-[#e0e5ec] to-[#d4d9e5]',
  },
  {
    slug: 'brutalism',
    title: 'Brutalism + Morph',
    desc: '粗野主义 · 大胆叛逆的视觉冲击',
    icon: Zap,
    gradient: 'from-[#FFE600] via-[#FFD700] to-[#FFB300]',
  },
  {
    slug: 'ai-native',
    title: 'AI-Native UI',
    desc: 'AI 原生界面 · 对话驱动的未来感',
    icon: Cpu,
    gradient: 'from-[#0f0f0f] to-[#1a1a2e]',
  },
]

export default function DesignShowcaseHub() {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-8 border-b border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Design Showcase</h1>
            <p className="text-sm text-[#888] mt-1">前端设计风格 · 交互式预览</p>
          </div>
          <Link to="/" className="text-sm text-[#888] hover:text-[#333] transition-colors">
            ← 返回首页
          </Link>
        </div>
      </header>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {styles.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.slug}
                to={`/design/${s.slug}`}
                className={`group relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  'featured' in s && s.featured ? 'border-teal-200 ring-1 ring-teal-100 md:col-span-2 lg:col-span-3' : 'border-[#f0f0f0]'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#f5f5f5] group-hover:bg-[#1a1a1a] transition-colors flex items-center justify-center mb-5">
                    <Icon size={22} className="text-[#1a1a1a] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-[#888] leading-relaxed">{s.desc}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-medium text-[#1a1a1a] group-hover:gap-2 transition-all">
                    预览 <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-[#bbb]">
        Each style uses only Tailwind CSS v4 and lucide-react icons — no external design libraries
      </footer>
    </div>
  )
}

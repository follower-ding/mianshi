import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, MessageSquare, Home } from 'lucide-react'
import { MIANSHI_THEMES, THEME_ORDER, type MianshiThemeId } from './themes'
import { HomePreview } from './sections/HomePreview'
import { QuestionHubPreview } from './sections/QuestionHubPreview'
import { InterviewPreview } from './sections/InterviewPreview'

const CORE_PAGES = [
  { id: 'home', label: '首页 Hero', icon: Home },
  { id: 'questions', label: '题库 Hub', icon: LayoutGrid },
  { id: 'interview', label: '模拟面试', icon: MessageSquare },
] as const

function loadFonts(url: string) {
  if (document.querySelector(`link[data-mianshi-font="${url}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.setAttribute('data-mianshi-font', url)
  document.head.appendChild(link)
}

function TokenSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-6 w-6 shrink-0 rounded-md border border-black/10" style={{ background: hex }} />
      <div>
        <div className="text-[10px] text-[#888]">{label}</div>
        <div className="font-mono text-xs text-[#333]">{hex}</div>
      </div>
    </div>
  )
}

export default function MianshiStyleComparePage() {
  const [active, setActive] = useState<MianshiThemeId>('professional')
  const [view, setView] = useState<'single' | 'grid'>('grid')

  useEffect(() => {
    THEME_ORDER.forEach((id) => loadFonts(MIANSHI_THEMES[id].googleFonts))
  }, [])

  const theme = MIANSHI_THEMES[active]

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <header className="sticky top-0 z-50 border-b border-[#e4e4e7] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <Link
              to="/design"
              className="mb-1 inline-flex items-center gap-1 text-xs text-[#71717a] transition-colors hover:text-[#18181b]"
            >
              <ArrowLeft className="h-3 w-3" /> Design Showcase
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-[#18181b] md:text-2xl">
              iume · 三风格核心页面对比
            </h1>
            <p className="mt-0.5 text-sm text-[#71717a]">
              专业 / 文艺 / 暗色科技 — 首页 · 题库 · 面试
            </p>
          </div>
          <div className="flex rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'grid' ? 'bg-white text-[#18181b] shadow-sm' : 'text-[#71717a]'}`}
            >
              三列并排
            </button>
            <button
              type="button"
              onClick={() => setView('single')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'single' ? 'bg-white text-[#18181b] shadow-sm' : 'text-[#71717a]'}`}
            >
              单风格详情
            </button>
          </div>
        </div>
      </header>

      {view === 'single' && (
        <>
          <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8">
            <div className="flex flex-wrap gap-2">
              {THEME_ORDER.map((id) => {
                const t = MIANSHI_THEMES[id]
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      borderColor: active === id ? t.colors.accent : '#e4e4e7',
                      background: active === id ? t.colors.accentSoft : '#fff',
                      color: active === id ? t.colors.text : '#71717a',
                    }}
                  >
                    {t.label}
                    <span className="ml-2 hidden text-xs opacity-60 sm:inline">{t.tagline}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-6 sm:grid-cols-3 lg:grid-cols-6">
              <TokenSwatch label="Background" hex={theme.colors.bg} />
              <TokenSwatch label="Surface" hex={theme.colors.surface} />
              <TokenSwatch label="Primary" hex={theme.colors.primary} />
              <TokenSwatch label="Accent" hex={theme.colors.accent} />
              <TokenSwatch label="Text" hex={theme.colors.text} />
              <TokenSwatch label="Border" hex={theme.colors.border} />
            </div>
            <p className="mt-2 text-xs text-[#a1a1aa]">
              规范文件：design-system/variants/{theme.id === 'dark-tech' ? 'dark-tech' : theme.id}.md
            </p>
          </div>

          <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-10 md:px-8">
            {CORE_PAGES.map(({ id, label, icon: Icon }) => (
              <section key={id}>
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#71717a]" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[#71717a]">{label}</h2>
                </div>
                {id === 'home' && <HomePreview theme={theme} />}
                {id === 'questions' && <QuestionHubPreview theme={theme} />}
                {id === 'interview' && <InterviewPreview theme={theme} />}
              </section>
            ))}
          </div>
        </>
      )}

      {view === 'grid' && (
        <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-10 md:px-8">
          {CORE_PAGES.map(({ id, label, icon: Icon }) => (
            <section key={id}>
              <div className="mb-6 flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#52525b]" />
                <h2 className="text-lg font-bold text-[#18181b]">{label}</h2>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                {THEME_ORDER.map((themeId) => {
                  const t = MIANSHI_THEMES[themeId]
                  return (
                    <div key={themeId}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: t.colors.primary }}>
                          {t.label}
                        </span>
                        <span className="text-[11px] text-[#a1a1aa]">{t.tagline}</span>
                      </div>
                      {id === 'home' && <HomePreview theme={t} />}
                      {id === 'questions' && <QuestionHubPreview theme={t} />}
                      {id === 'interview' && <InterviewPreview theme={t} />}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-[#e4e4e7] bg-white p-6 md:p-8">
            <h2 className="text-lg font-bold text-[#18181b]">风格选型建议</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e4e4e7] text-[#71717a]">
                    <th className="pb-3 pr-4 font-medium">维度</th>
                    <th className="pb-3 pr-4 font-medium">专业</th>
                    <th className="pb-3 pr-4 font-medium">文艺</th>
                    <th className="pb-3 font-medium">暗色科技</th>
                  </tr>
                </thead>
                <tbody className="text-[#3f3f46]">
                  {[
                    ['气质', '效率工具、B端可信', '编辑感、成长叙事', '夜间专注、技术密度'],
                    ['主色', '海军蓝 + Teal', '暖褐 + 金棕', '深灰 + Cyan 点睛'],
                    ['字体', 'DM Sans', 'Lora + Raleway', 'Inter + JetBrains Mono'],
                    ['布局', 'Bento 网格', '单列 editorial', 'Glass 面板 + grid'],
                    ['适合', '默认生产环境', '内容/报告/故事线', '刷题/面试沉浸态'],
                  ].map(([dim, ...vals]) => (
                    <tr key={dim} className="border-b border-[#f4f4f5]">
                      <td className="py-3 pr-4 font-medium text-[#18181b]">{dim}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="py-3 pr-4 leading-relaxed">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[#71717a]">
              推荐组合：<strong className="text-[#18181b]">外壳用「专业」</strong>，报告页/经验故事用「文艺」变体，
              面试/刷题沉浸页用「暗色科技」变体。统一 tokens 结构，仅切换 variant 变量。
            </p>
          </section>
        </div>
      )}

      <footer className="border-t border-[#e4e4e7] py-8 text-center text-xs text-[#a1a1aa]">
        design-system/variants/ · project-design-system skill · 无 indigo 默认 AI 模板
      </footer>
    </div>
  )
}

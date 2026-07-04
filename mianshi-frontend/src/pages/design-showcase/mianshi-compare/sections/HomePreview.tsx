import { ArrowRight, BarChart3, BookOpen, Mic } from 'lucide-react'
import type { MianshiTheme } from '../themes'
import { Eyebrow, PrimaryBtn, ThemeShell } from './shared'

export function HomePreview({ theme }: { theme: MianshiTheme }) {
  const c = theme.colors
  const isLiterary = theme.id === 'literary'
  const isDark = theme.id === 'dark-tech'
  const isPro = theme.id === 'professional'

  return (
    <ThemeShell theme={theme}>
      <div
        className="relative px-6 py-10 md:px-10 md:py-14"
        style={{ background: c.heroGlow, backgroundSize: isDark ? '100% 100%, 24px 24px, 24px 24px' : undefined }}
      >
        <div className={isLiterary ? 'max-w-xl' : 'mx-auto max-w-3xl text-center'}>
          <Eyebrow theme={theme}>iume · 模拟面试</Eyebrow>
          <h2
            className={`mt-3 font-bold leading-[1.12] tracking-tight ${isLiterary ? 'text-left text-3xl md:text-4xl' : 'text-3xl md:text-4xl'}`}
            style={{ fontFamily: theme.fontDisplay, color: c.text }}
          >
            {isLiterary ? (
              <>把每一次练习<br />写进你的职业故事</>
            ) : isDark ? (
              <>夜间备战模式<br /><span style={{ color: c.accent }}>代码与表达同样清晰</span></>
            ) : (
              <>结构化模拟面试<br />从刷题到反馈，一站完成</>
            )}
          </h2>
          <p
            className={`mt-4 text-sm leading-relaxed md:text-base ${isLiterary ? 'text-left' : ''}`}
            style={{ color: c.muted, maxWidth: isLiterary ? '36rem' : undefined }}
          >
            {isLiterary
              ? '精选高频真题、AI 逐题点评、可回顾的面试报告。不追求花哨，只帮你把准备过程变得有迹可循。'
              : isDark
                ? '流式语音交互、实时评分维度、题库按岗位分类。为深夜刷题和正式面试之间，搭一条清晰路径。'
                : '按目标岗位生成面试题，回答后获得维度化评分与改进建议。题库 2,000+ 真题，支持语音模拟。'}
          </p>
          <div className={`mt-6 flex flex-wrap gap-3 ${isLiterary ? '' : 'justify-center'}`}>
            <PrimaryBtn theme={theme}>
              开始模拟面试 <ArrowRight className="ml-1 inline h-4 w-4" />
            </PrimaryBtn>
            <PrimaryBtn theme={theme} secondary>
              浏览题库
            </PrimaryBtn>
          </div>
        </div>

        {isPro && (
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Mic, label: '语音模拟', span: 'col-span-2 md:col-span-1' },
              { icon: BarChart3, label: '维度评分', span: '' },
              { icon: BookOpen, label: '岗位题库', span: 'col-span-2 md:col-span-1' },
            ].map(({ icon: Icon, label, span }) => (
              <div
                key={label}
                className={`cursor-pointer p-4 transition-all duration-200 hover:-translate-y-0.5 ${span}`}
                style={{
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: theme.radius,
                }}
              >
                <Icon className="h-5 w-5" style={{ color: c.accent }} strokeWidth={1.5} />
                <div className="mt-2 text-sm font-semibold" style={{ color: c.text }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {isLiterary && (
          <blockquote
            className="mt-10 border-l-2 pl-5 text-left text-sm italic leading-relaxed"
            style={{ borderColor: c.accent, color: c.muted, fontFamily: theme.fontDisplay }}
          >
            「准备面试不是背答案，而是学会用自己的经历回答好每一个为什么。」
          </blockquote>
        )}

        {isDark && (
          <div
            className="mx-auto mt-8 max-w-md rounded-xl p-4 font-mono text-xs"
            style={{
              background: c.surfaceElevated,
              border: `1px solid ${c.border}`,
              color: c.muted,
              fontFamily: theme.fontMono,
            }}
          >
            <span style={{ color: c.accent }}>$</span> session start --role java-backend --level mid
            <br />
            <span style={{ color: c.accent }}>{'->'}</span> 3 questions loaded · voice enabled
          </div>
        )}
      </div>
    </ThemeShell>
  )
}

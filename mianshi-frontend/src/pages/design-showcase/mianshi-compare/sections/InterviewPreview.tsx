import { Mic, Send, User } from 'lucide-react'
import type { MianshiTheme } from '../themes'
import { Eyebrow, ThemeShell } from './shared'

const MESSAGES = [
  { role: 'interviewer' as const, text: '请介绍一下你在上一个项目中负责的核心模块，以及遇到的最大技术挑战。' },
  { role: 'candidate' as const, text: '我负责订单服务的重构，主要挑战是高并发下的库存一致性，最终采用 Redis 预扣 + 异步对账方案。' },
  { role: 'interviewer' as const, text: '如果 Redis 不可用，你的降级策略是什么？' },
]

export function InterviewPreview({ theme }: { theme: MianshiTheme }) {
  const c = theme.colors
  const isDark = theme.id === 'dark-tech'
  const isLiterary = theme.id === 'literary'

  return (
    <ThemeShell theme={theme}>
      <div className="px-4 py-5 md:px-6">
        <div
          className="mb-4 flex items-center justify-between gap-2 border-b pb-3"
          style={{ borderColor: c.border }}
        >
          <div>
            <Eyebrow theme={theme}>模拟面试</Eyebrow>
            <div
              className="mt-0.5 text-sm font-semibold"
              style={{ fontFamily: theme.fontDisplay, color: c.text }}
            >
              Java 后端开发 · 3 年经验
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: c.accentSoft, color: c.accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: c.accent }} />
            进行中
          </div>
        </div>

        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {MESSAGES.map((msg, i) => {
            const isUser = msg.role === 'candidate'
            return (
              <div
                key={i}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isUser ? c.accentSoft : c.surfaceElevated,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {isUser ? (
                    <User className="h-3.5 w-3.5" style={{ color: c.accent }} />
                  ) : (
                    <Mic className="h-3.5 w-3.5" style={{ color: c.muted }} />
                  )}
                </div>
                <div
                  className="max-w-[85%] px-3 py-2 text-sm leading-relaxed"
                  style={{
                    background: isUser ? c.accentSoft : c.surfaceElevated,
                    color: c.text,
                    borderRadius: theme.radius,
                    border: isLiterary ? `1px solid ${c.border}` : undefined,
                    fontFamily: isDark && isUser ? theme.fontMono : theme.fontBody,
                    fontSize: isDark ? '13px' : undefined,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: c.border, background: c.surfaceElevated }}
        >
          <input
            readOnly
            placeholder="输入回答，或按住语音键说话…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: c.muted, fontFamily: theme.fontBody }}
          />
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ background: c.accent, color: isDark ? '#0A0A0F' : '#fff' }}
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {isDark && (
          <div className="mt-3 flex gap-4 text-[10px] font-mono uppercase tracking-wider" style={{ color: c.muted }}>
            <span>表达 7.2</span>
            <span>逻辑 8.0</span>
            <span>深度 6.8</span>
          </div>
        )}
      </div>
    </ThemeShell>
  )
}

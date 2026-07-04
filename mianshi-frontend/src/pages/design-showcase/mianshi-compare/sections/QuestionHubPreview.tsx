import { ChevronRight, Code2, Database, Layers, Server } from 'lucide-react'
import type { MianshiTheme } from '../themes'
import { Eyebrow, ThemeShell } from './shared'

const BANKS = [
  { icon: Server, name: 'Java 后端', count: 486, tag: '高频' },
  { icon: Code2, name: '前端工程', count: 312, tag: '更新' },
  { icon: Database, name: '数据库', count: 198, tag: '' },
  { icon: Layers, name: '系统设计', count: 156, tag: '进阶' },
]

export function QuestionHubPreview({ theme }: { theme: MianshiTheme }) {
  const c = theme.colors
  const isLiterary = theme.id === 'literary'
  const isDark = theme.id === 'dark-tech'

  return (
    <ThemeShell theme={theme}>
      <div className="px-6 py-8 md:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Eyebrow theme={theme}>题库中心</Eyebrow>
            <h3
              className="mt-1 text-xl font-bold"
              style={{ fontFamily: theme.fontDisplay, color: c.text }}
            >
              {isLiterary ? '按方向选用你的习题册' : '按岗位进入专项练习'}
            </h3>
            <p className="mt-1 text-sm" style={{ color: c.muted }}>
              共 1,152 道平台题目 · 支持继续上次进度
            </p>
          </div>
          {!isLiterary && (
            <span
              className="hidden shrink-0 rounded-full px-3 py-1 text-xs font-medium sm:inline"
              style={{ background: c.accentSoft, color: c.accent }}
            >
              上次：Java 后端 #24
            </span>
          )}
        </div>

        <div className={isLiterary ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
          {BANKS.map((bank, i) => {
            const Icon = bank.icon
            return (
              <div
                key={bank.name}
                className="group flex cursor-pointer items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: isLiterary && i % 2 === 0 ? c.surfaceElevated : c.surface,
                  border: `1px solid ${c.border}`,
                  borderRadius: theme.radius,
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center"
                  style={{
                    background: c.accentSoft,
                    borderRadius: isDark ? '12px' : theme.radius,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: c.accent }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: c.text }}>
                      {bank.name}
                    </span>
                    {bank.tag && (
                      <span
                        className="text-[10px] font-medium uppercase tracking-wide"
                        style={{ color: c.muted }}
                      >
                        {bank.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: c.muted }}>
                    {bank.count} 题
                  </span>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5"
                  style={{ color: c.muted }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </ThemeShell>
  )
}

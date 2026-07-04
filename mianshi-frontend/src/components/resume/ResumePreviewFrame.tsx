import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  label?: string
  /** md: 居中限宽；lg: 撑满预览栏 */
  size?: 'md' | 'lg'
}

/** A4 预览 — 深色画布 + 白纸张 */
export function ResumePreviewFrame({ children, label = '实时预览', size = 'md' }: Props) {
  const paperWrap =
    size === 'lg'
      ? 'mx-auto w-full max-w-[720px] flex-1 pb-2'
      : 'mx-auto w-full max-w-[640px] flex-1 pb-4'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between px-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className="text-[10px] text-text-secondary">A4 · 210 × 297 mm</span>
      </div>
      <div className={paperWrap}>
        <div className="resume-paper w-full overflow-hidden rounded-[2px] bg-resume-paper shadow-[0_12px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)]">
          {children}
        </div>
      </div>
    </div>
  )
}

export function ResumePreviewToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-elevated/80 px-3 py-2 backdrop-blur-sm">
      <span className="mr-1 text-[11px] text-muted">模板</span>
      {children}
    </div>
  )
}

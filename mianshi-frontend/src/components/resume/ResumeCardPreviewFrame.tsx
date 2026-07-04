import type { ReactNode } from 'react'
import './resume-card-preview.css'

const PAPER_WIDTH = 480

type Props = {
  children: ReactNode
  accent?: string
  className?: string
  /** 缩略图模式：无内边距、无阴影，铺满容器 */
  variant?: 'paper' | 'fill'
}

/**
 * 简历卡片预览区 — 按容器宽度等比缩放 A4 纸，消除两侧空白。
 * 父级需有明确宽度（如 resumeCardUi.preview @container）。
 */
export function ResumeCardPreviewFrame({
  children,
  accent,
  className = '',
  variant = 'paper',
}: Props) {
  return (
    <div className={`resume-card-preview-root ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(34,211,238,0.07),transparent_72%)]" />
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={
            variant === 'fill'
              ? 'resume-card-preview-fill'
              : 'resume-card-preview-paper'
          }
          style={{
            ['--resume-paper-width' as string]: `${PAPER_WIDTH}px`,
            ['--resume-accent' as string]: accent,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** 模板缩略图专用：铺满预览区，无留白 */
export function ResumeTemplatePreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="resume-card-preview-root">
      <div className="absolute inset-0 overflow-hidden">{children}</div>
    </div>
  )
}

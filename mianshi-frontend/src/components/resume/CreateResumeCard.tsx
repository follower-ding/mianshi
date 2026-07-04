import { Link } from 'react-router-dom'
import { Plus, Sparkles, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { resumeCardUi } from './resumeLayout'

type Variant = 'generate' | 'optimize'

const CONFIG: Record<
  Variant,
  { to: string; icon: LucideIcon; title: string; desc: string; cta: string }
> = {
  generate: {
    to: '/resume/generate',
    icon: Sparkles,
    title: 'AI 快速生成',
    desc: '根据目标职位一键生成新简历',
    cta: '开始生成',
  },
  optimize: {
    to: '/resume/optimize',
    icon: Upload,
    title: '导入并优化',
    desc: '上传或粘贴已有简历全文优化',
    cta: '导入简历',
  },
}

/** 新建简历占位卡片 — 与已保存卡片同尺寸 240×396 */
export function CreateResumeCard({ variant }: { variant: Variant }) {
  const { to, icon: Icon, title, desc, cta } = CONFIG[variant]

  return (
    <Link to={to} className={`group flex cursor-pointer flex-col ${resumeCardUi.rootDashed}`}>
      <div className={`${resumeCardUi.preview} flex flex-col items-center justify-center gap-2.5 px-4 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-elevated/50 text-muted transition-colors group-hover:border-brand/30 group-hover:text-brand">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 text-muted group-hover:text-brand">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-medium text-text-secondary group-hover:text-text">{title}</p>
        <p className="text-[11px] leading-relaxed text-muted">{desc}</p>
      </div>
      <div className={`${resumeCardUi.footer} justify-center text-center`}>
        <span className="text-xs font-medium text-brand">{cta} →</span>
      </div>
    </Link>
  )
}

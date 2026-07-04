/** 简历工作台 — dark-tech，居中约束布局 */

import { inputClassName } from '../ui/inputStyles'

export const RESUME_SHELL_MAX = 'max-w-[1280px]'

export const resumeUi = {
  workspace: 'flex h-dvh flex-col overflow-hidden bg-page',
  shellMax: `mx-auto w-full ${RESUME_SHELL_MAX}`,
  toolbar:
    'z-30 shrink-0 border-b border-border/80 bg-elevated/90 backdrop-blur-xl',
  toolbarInner:
    'mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6',
  tabRail:
    'mx-auto w-full max-w-[1280px] border-t border-border/40 px-4 pb-0 pt-1 lg:px-6',
  moduleRail: 'flex items-center gap-0.5 -mb-px overflow-x-auto',
  studioToolbar: 'relative shrink-0 border-b border-border/80 bg-elevated/95 px-3 py-2',
  studioDivider: 'mx-1 hidden h-5 w-px bg-border sm:block',
  moduleMain: 'min-h-0 flex-1 overflow-hidden',
  wizardScroll:
    'flex h-full flex-col items-center overflow-y-auto px-4 py-6 lg:px-6 lg:py-8',
  wizardInner: 'w-full max-w-xl',
  flowWrap: 'flex h-full min-h-0 flex-col items-center overflow-hidden',
  flowInner:
    'flex h-full min-h-0 w-full max-w-[1200px] flex-col gap-4 px-4 py-5 lg:flex-row lg:gap-5 lg:px-6 lg:py-6',
  flowPanel:
    'flex min-h-0 w-full shrink-0 flex-col overflow-y-auto lg:w-[380px] xl:w-[400px]',
  flowPreview:
    'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-[#0a0a10]',
  /** 编辑页三栏 — 预览区加宽 */
  editWrap: 'relative flex h-full min-h-0 w-full flex-col overflow-hidden pb-0 lg:pb-0',
  editBody:
    'mx-auto grid h-full min-h-0 w-full max-w-[1680px] flex-1 grid-cols-1 gap-3 overflow-hidden px-3 py-3 pb-[4.5rem] lg:grid-cols-[200px_minmax(280px,1fr)_minmax(540px,44%)] lg:px-5 lg:py-4 lg:pb-4',
  sideNav:
    'flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-panel/30 lg:min-h-0',
  sideNavScroll: 'min-h-0 flex-1 overflow-y-auto',
  sideNavSection: 'border-b border-border/50 p-3.5',
  editorPane:
    'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-panel/20',
  editorHead: 'shrink-0 border-b border-border/50 px-4 py-2.5 lg:px-5',
  editorScroll: 'min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-4',
  previewPane:
    'relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-resume-canvas/30 lg:min-w-[480px] lg:flex-[1.15]',
  mobileTabBar:
    'fixed inset-x-0 bottom-0 z-50 flex gap-1 border-t border-border/80 bg-elevated/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden',
  previewDesk:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(34,211,238,0.07),transparent_70%)]',
  previewCanvas: 'flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3 lg:px-3 lg:py-4',
  sectionCard:
    'overflow-hidden rounded-xl border border-border/70 bg-panel/40 transition-colors hover:border-border',
  sectionHeader:
    'flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-subtle/50',
  input: inputClassName,
  label: 'mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted',
  fieldLabel: 'mb-1.5 block text-xs font-medium text-text-secondary',
  fieldHint: 'mt-1 text-[11px] leading-snug text-muted',
  card: 'rounded-2xl border border-border/70 bg-panel/40 p-5 lg:p-6',
  stepBadge:
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand',
  stepRow: 'mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3',
  stepPill:
    'flex items-center gap-2 rounded-full border border-border/60 bg-panel/30 px-3 py-1.5 text-xs text-text-secondary sm:text-sm',
} as const

/** 我的简历 — 固定尺寸卡片（不随网格列宽拉伸） */
export const resumeCardUi = {
  /** 240×396 ≈ 模板市场缩略比例 */
  root: 'w-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-panel/45 shadow-sm transition-all duration-200 hover:border-brand/35 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.15)]',
  rootDashed:
    'w-full min-w-0 overflow-hidden rounded-xl border border-dashed border-border/70 bg-panel/20 transition-all hover:border-brand/40 hover:bg-panel/35',
  preview: 'relative h-[300px] overflow-hidden bg-[#101018] @container',
  footer: 'flex min-h-[96px] flex-col border-t border-border/60 px-3.5 py-3',
  grid: 'mt-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 sm:gap-5',
} as const

export function resumeCompletionPercent(content: {
  basic?: { name?: string; title?: string; email?: string }
  selfIntro?: string
  experience?: unknown[]
  projects?: unknown[]
  education?: unknown[]
  skills?: unknown[]
}): number {
  let n = 0
  const b = content.basic
  if (b?.name?.trim()) n += 12
  if (b?.title?.trim()) n += 10
  if (b?.email?.trim()) n += 8
  if (content.selfIntro?.trim()) n += 15
  if ((content.experience?.length ?? 0) > 0) n += 25
  if ((content.projects?.length ?? 0) > 0) n += 15
  if ((content.education?.length ?? 0) > 0) n += 10
  if ((content.skills?.length ?? 0) > 0) n += 5
  return Math.min(100, n)
}

export type ResumeContentForCompletion = Parameters<typeof resumeCompletionPercent>[0]

/** 按优先级返回待完善字段（用于提示文案） */
export function resumeCompletionHints(content: ResumeContentForCompletion): string[] {
  const hints: string[] = []
  const b = content.basic
  if (!b?.name?.trim()) hints.push('姓名')
  if (!b?.title?.trim()) hints.push('职位')
  if ((content.experience?.length ?? 0) === 0) hints.push('工作经历')
  if (!content.selfIntro?.trim()) hints.push('自我介绍')
  if ((content.projects?.length ?? 0) === 0) hints.push('项目经历')
  if ((content.education?.length ?? 0) === 0) hints.push('教育背景')
  if (!b?.email?.trim()) hints.push('联系方式')
  if ((content.skills?.length ?? 0) === 0) hints.push('技能')
  return hints
}

/** Shell 进度条旁短文案 */
export function resumeCompletionLabel(content: ResumeContentForCompletion): string {
  const pct = resumeCompletionPercent(content)
  if (pct >= 100) return '已完成'
  if (pct === 0) return '刚开始'
  const hints = resumeCompletionHints(content)
  if (hints.length > 0) {
    const top = hints.slice(0, 2).join('、')
    return `待完善：${top}`
  }
  return `${pct}%`
}

/** 卡片角标完整度 */
export function resumeCompletionBadge(content: ResumeContentForCompletion): string {
  const pct = resumeCompletionPercent(content)
  if (pct >= 100) return '100% 完整'
  if (pct === 0) return '刚开始'
  return `${pct}% 完整度`
}

export function hasResumeContent(content: {
  basic?: { name?: string; title?: string }
  selfIntro?: string
  experience?: unknown[]
  projects?: unknown[]
  education?: unknown[]
  skills?: unknown[]
}): boolean {
  if (content.basic?.name?.trim() || content.basic?.title?.trim()) return true
  if (content.selfIntro?.trim()) return true
  if ((content.experience?.length ?? 0) > 0) return true
  if ((content.projects?.length ?? 0) > 0) return true
  if ((content.education?.length ?? 0) > 0) return true
  if ((content.skills?.length ?? 0) > 0) return true
  return false
}

/** 是否有已保存的简历记录（含仅 rawText 的情况） */
export function hasSavedResume(
  resume: { rawText?: string; optimizedText?: string; updatedAt?: string } | null | undefined,
  content?: Parameters<typeof hasResumeContent>[0],
): boolean {
  if (!resume) return false
  if (hasResumeContent(content ?? {})) return true
  if (resume.rawText?.trim() && resume.rawText.trim().length >= 30) return true
  if (resume.optimizedText?.trim() && resume.optimizedText.trim().length >= 30) return true
  return Boolean(resume.updatedAt)
}

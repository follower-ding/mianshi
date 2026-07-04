/** 刷题页布局 token — 语义化，随 global theme 切换 */

export const practice = {
  /** 三栏工作区外层 gap + padding */
  workspace: 'gap-3 p-3 lg:gap-4 lg:p-4',
  /** 左/中/右独立卡片 */
  card: 'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-elevated shadow-sm',
  /** 筛选 pill — 选中 */
  pillActive: 'rounded-full bg-brand px-3 py-1 text-xs font-medium text-on-brand shadow-sm',
  /** 筛选 pill — 未选中 */
  pillIdle:
    'rounded-full border border-border/80 bg-panel/80 px-3 py-1 text-xs font-medium text-text-secondary transition-all duration-200 hover:border-brand/30 hover:bg-brand-light/40 hover:text-brand',
  /** 难度 chip — 轻量胶囊 */
  diffChip:
    'rounded-md px-2 py-0.5 text-[11px] font-medium transition-all duration-200',
  diffChipActive: 'bg-brand-light text-brand ring-1 ring-brand/25',
  diffChipIdle: 'text-muted hover:bg-bg-subtle hover:text-text-secondary',
  /** 底部悬浮操作条 */
  flowBar:
    'rounded-xl border border-border/70 bg-elevated/85 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-elevated/75',
  /** Section 标题 banner */
  sectionBanner:
    'mb-4 inline-flex w-full items-center rounded-lg bg-brand-light/60 px-4 py-2.5 text-sm font-bold tracking-tight text-text',
  /** 主 CTA 微渐变 */
  ctaPrimary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand px-4 py-2 text-sm font-medium text-on-brand shadow-md shadow-brand/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
  flowBtn:
    'inline-flex items-center justify-center gap-1 rounded-lg border border-border/80 bg-elevated/90 px-3 py-2 text-sm text-text-secondary transition-all duration-200 hover:border-brand/40 hover:bg-bg-subtle hover:text-brand disabled:opacity-40',
} as const

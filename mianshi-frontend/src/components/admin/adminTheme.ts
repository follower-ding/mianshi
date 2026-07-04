/** 后台管理 token — 精致现代风格 */

export const QUESTION_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  review: '审核中',
  published: '已发布',
  archived: '已归档',
}

export const QUESTION_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  review: 'warning',
  published: 'success',
  archived: 'info',
}

/** 发布流程说明 — 录入页与文档共用 */
export const QUESTION_PUBLISH_FLOW = [
  {
    status: 'draft' as const,
    title: '草稿',
    summary: '仅后台可见，可先保存题干，参考答案可稍后补。',
    userVisible: false,
  },
  {
    status: 'review' as const,
    title: '提交审核',
    summary: '进入「审核队列」，需管理员通过后才对用户可见；适合多人协作把关。',
    userVisible: false,
  },
  {
    status: 'published' as const,
    title: '直接发布',
    summary: '管理员可跳过审核队列，保存后立即在刷题/搜索中对用户可见。',
    userVisible: true,
  },
  {
    status: 'archived' as const,
    title: '已归档',
    summary: '从正常列表隐藏，可在题库管理批量归档或恢复为草稿。',
    userVisible: false,
  },
] as const

export const ADMIN_CATEGORIES = ['Java', '数据库', '中间件', '计算机网络', '前端', 'AI'] as const

export const adminLayout = {
  sidebarWidth: 'w-[240px]',
  pagePadding: 'p-4 md:p-6 lg:p-8',
  headerGap: 'mb-4',
  sectionGap: 'mb-4',
  gridGap: 'gap-4',
  stackGap: 'space-y-4',
} as const

export const adminCx = {
  page: 'bg-[var(--color-admin-page)] text-[var(--color-admin-text)] min-h-full',
  surface:
    'rounded-[var(--admin-radius-xl,0.75rem)] border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] shadow-[var(--shadow-admin-card)]',
  surfaceElevated:
    'rounded-[var(--admin-radius-xl,0.75rem)] border border-[var(--color-admin-border-light)] bg-[var(--color-admin-surface)] shadow-[var(--shadow-admin-card-hover)]',
  surfaceAlt: 'bg-[var(--color-admin-surface-alt)]',
  input:
    'w-full rounded-[var(--admin-radius-lg,0.5rem)] border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-alt)] px-3 py-2 text-sm text-[var(--color-admin-text)] outline-none transition-all duration-200 placeholder:text-[var(--color-admin-muted)] hover:border-[var(--color-admin-brand)]/30 focus:border-[var(--color-admin-brand)] focus:ring-2 focus:ring-[var(--color-admin-brand-light)]',
  textarea:
    'w-full rounded-[var(--admin-radius-lg,0.5rem)] border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-alt)] px-3 py-2 text-sm leading-relaxed text-[var(--color-admin-text)] outline-none transition-all duration-200 placeholder:text-[var(--color-admin-muted)] hover:border-[var(--color-admin-brand)]/30 focus:border-[var(--color-admin-brand)] focus:ring-2 focus:ring-[var(--color-admin-brand-light)] resize-none',
  select:
    'w-full rounded-[var(--admin-radius-lg,0.5rem)] border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-alt)] px-3 py-2 text-sm text-[var(--color-admin-text)] outline-none transition-all duration-200 hover:border-[var(--color-admin-brand)]/30 focus:border-[var(--color-admin-brand)] focus:ring-2 focus:ring-[var(--color-admin-brand-light)]',
  btnPrimary:
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--admin-radius-lg,0.5rem)] bg-[var(--color-admin-brand)] px-4 py-2 text-sm font-medium text-[var(--color-admin-on-brand,#ffffff)] shadow-sm transition-all duration-200 hover:bg-[var(--color-admin-brand-hover)] active:scale-[0.98] disabled:opacity-50',
  btnSecondary:
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--admin-radius-lg,0.5rem)] border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-alt)] px-4 py-2 text-sm font-medium text-[var(--color-admin-text-secondary)] transition-all duration-200 hover:bg-[var(--color-admin-brand-light)] hover:text-[var(--color-admin-text)] active:scale-[0.98]',
  btnGhost:
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--admin-radius-lg,0.5rem)] px-3 py-2 text-sm font-medium text-[var(--color-admin-muted)] transition-all duration-200 hover:bg-[var(--color-admin-surface-alt)] hover:text-[var(--color-admin-text-secondary)] active:scale-[0.98]',
  th: 'px-5 py-3.5 text-xs font-semibold tracking-wide text-[var(--color-admin-muted)]',
  thElevated:
    'bg-[var(--color-admin-thead)] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-muted)]',
  td: 'px-5 py-3.5 text-sm text-[var(--color-admin-text-secondary)]',
  tdDense: 'px-4 py-2.5 text-sm text-[var(--color-admin-text-secondary)]',
  trHover: 'border-b border-[var(--color-admin-border-light)] transition-colors duration-150',
  trHoverElevated:
    'border-b border-[var(--color-admin-border-light)] transition-colors duration-150 hover:bg-[var(--color-admin-row-hover)]',
  filterActive: 'rounded-md bg-admin-surface px-3 py-1 text-xs font-medium text-admin-text shadow-sm ring-1 ring-admin-border',
  filterIdle:
    'rounded-md px-3 py-1 text-xs font-medium text-admin-muted transition hover:text-admin-text-secondary',
  iconBtn:
    'rounded-lg p-2 text-[var(--color-admin-muted)] transition-all duration-200 hover:bg-[var(--color-admin-brand-light)] hover:text-[var(--color-admin-brand)] active:scale-90',
  iconBtnEdit:
    'rounded-lg p-2 text-[var(--color-admin-muted)] transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-90',
  iconBtnDanger:
    'rounded-lg p-2 text-[var(--color-admin-muted)] transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-90',
  bulkBar:
    'flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-admin-brand)]/20 bg-[var(--color-admin-brand-light)] px-5 py-3',
} as const

export type AdminStatAccent = 'brand' | 'warning' | 'success' | 'info'

export const adminStatAccentClass: Record<AdminStatAccent, string> = {
  brand: 'bg-admin-brand-light text-admin-brand',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
  info: 'bg-admin-brand-light text-admin-brand',
}

export const adminPillBase =
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium'

/** 难度 — 暗色 outline 语义色 */
export function adminDifficultyClass(difficulty: string) {
  switch (difficulty) {
    case '简单':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-400'
    case '中等':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    case '困难':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-400'
    default:
      return 'border-admin-border bg-admin-surface-alt text-admin-muted'
  }
}

/** 方向标签 */
export function adminCategoryClass() {
  return 'border-admin-border bg-admin-surface-alt text-admin-text-secondary'
}

/** 状态药丸 */
export function adminStatusClass(status: string) {
  switch (status) {
    case 'published':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    case 'review':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    case 'draft':
      return 'border-admin-border bg-admin-surface-alt text-admin-muted'
    case 'archived':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-400'
    default:
      return 'border-admin-border bg-admin-surface-alt text-admin-muted'
  }
}

/** 质量药丸 */
export function adminQualityClass(ok: boolean) {
  return ok
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-orange-500/30 bg-orange-500/10 text-orange-400'
}

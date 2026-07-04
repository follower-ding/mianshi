/** Shadcn Admin 单色图表 — 全后台共用，禁止彩虹色 */

export const ADMIN_ZINC_PALETTE = [
  '#fafafa',
  '#d4d4d8',
  '#a1a1aa',
  '#71717a',
  '#52525b',
  '#3f3f46',
  '#27272a',
] as const

export function adminZincColor(index: number): string {
  return ADMIN_ZINC_PALETTE[index % ADMIN_ZINC_PALETTE.length]
}

export const ADMIN_STATUS_CHART: Record<string, string> = {
  draft: '#52525b',
  review: '#a1a1aa',
  published: '#fafafa',
  archived: '#71717a',
  pending: '#a1a1aa',
  rejected: '#71717a',
  published_job: '#fafafa',
  closed: '#52525b',
}

export const ADMIN_DIFFICULTY_CHART: Record<string, string> = {
  简单: '#d4d4d8',
  中等: '#a1a1aa',
  困难: '#71717a',
}

export const ADMIN_RESULT_CHART: Record<string, string> = {
  pass: '#fafafa',
  fail: '#71717a',
  pending: '#a1a1aa',
  通过: '#fafafa',
  未通过: '#71717a',
  待定: '#a1a1aa',
}

/** 暗色告警条 — 替代 amber-50 / red-50 */
export const adminAlertCx = {
  warning: 'rounded-lg border border-amber-900/40 bg-amber-950/30 text-amber-200',
  error: 'rounded-lg border border-red-900/40 bg-red-950/30 text-red-300',
  success: 'rounded-lg border border-emerald-900/40 bg-emerald-950/30 text-emerald-300',
  info: 'rounded-lg border border-admin-border bg-admin-surface-alt text-admin-text-secondary',
} as const

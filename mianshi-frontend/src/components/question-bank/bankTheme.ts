/** 题库页布局常量；颜色统一走 Tailwind 语义 token（bg-brand、text-text 等） */
export const bankLayout = {
  sidebarWidth: 280,
  asideWidth: 260,
} as const

export function difficultyTagClass(difficulty: string) {
  switch (difficulty) {
    case '简单':
      return 'border-success/30 bg-success-light text-success'
    case '中等':
      return 'border-warning/30 bg-warning-light text-warning'
    case '困难':
      return 'border-danger/30 bg-danger-light text-danger'
    default:
      return 'border-border bg-bg-subtle text-text-secondary'
  }
}

export function categoryTagClass() {
  return 'border-brand/30 bg-brand-light text-brand'
}

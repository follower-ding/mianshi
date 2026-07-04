import {
  adminCategoryClass,
  adminDifficultyClass,
  adminPillBase,
  adminQualityClass,
  adminStatusClass,
  QUESTION_STATUS_LABEL,
} from './adminTheme'

export function AdminCategoryTag({ children }: { children: string }) {
  return (
    <span className={`${adminPillBase} ${adminCategoryClass()}`}>{children}</span>
  )
}

export function AdminDifficultyTag({ difficulty }: { difficulty: string }) {
  return (
    <span className={`${adminPillBase} ${adminDifficultyClass(difficulty)}`}>
      {difficulty}
    </span>
  )
}

export function AdminStatusPill({ status }: { status: string }) {
  const key = status ?? 'draft'
  return (
    <span className={`${adminPillBase} ${adminStatusClass(key)}`}>
      {QUESTION_STATUS_LABEL[key] ?? key}
    </span>
  )
}

export function AdminQualityPill({
  complete,
  missing,
}: {
  complete: boolean
  missing?: string[]
}) {
  const hint = missing?.length ? `缺少：${missing.join('、')}` : undefined
  return (
    <span
      title={hint}
      className={`${adminPillBase} ${adminQualityClass(complete)} ${!complete && hint ? 'cursor-help' : ''}`}
    >
      {complete ? '完整' : missing?.length ? `缺${missing.length}项` : '缺字段'}
    </span>
  )
}

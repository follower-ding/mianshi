import { useEffect, useMemo, useState } from 'react'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { api } from '../../api/client'
import {
  QUESTION_BANKS,
  getExtraCategoryBanks,
  slugFromCategory,
} from '../question-bank/bankCatalog'
import { ADMIN_CATEGORIES } from './adminTheme'

export type CategoryBankOption = {
  category: string
  slug: string
  count: number
  title: string
  subtitle?: string
  icon: LucideIcon
  /** 是否在 QUESTION_BANKS 注册 */
  curated: boolean
}

/** 合并官方题库 + 数据库已有方向，供录入页方向选择器使用 */
export function useQuestionCategories() {
  const [byCategory, setByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .getAdminQuestionOverview()
      .then((o) => {
        if (cancelled) return
        setByCategory(o.byCategory ?? {})
      })
      .catch(() => {
        if (!cancelled) setByCategory({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const banks = useMemo((): CategoryBankOption[] => {
    const curated = QUESTION_BANKS.map((b) => ({
      category: b.category,
      slug: b.slug,
      count: byCategory[b.category] ?? 0,
      title: b.title,
      subtitle: b.subtitle,
      icon: b.icon,
      curated: true,
    }))

    const known = new Set(QUESTION_BANKS.map((b) => b.category))
    const extras = getExtraCategoryBanks(byCategory).map(({ category, count, slug }) => ({
      category,
      slug,
      count,
      title: category,
      subtitle: '自定义题库',
      icon: Sparkles,
      curated: false,
    }))

    const zeroPresets = ADMIN_CATEGORIES.filter((c) => !known.has(c) && !(byCategory[c] ?? 0))
      .map((category) => ({
        category,
        slug: slugFromCategory(category),
        count: 0,
        title: category,
        subtitle: '预设方向',
        icon: Sparkles,
        curated: false,
      }))

    const merged = [...curated, ...extras, ...zeroPresets]
    const seen = new Set<string>()
    return merged.filter((b) => {
      if (seen.has(b.category)) return false
      seen.add(b.category)
      return true
    })
  }, [byCategory])

  const categories = useMemo(
    () =>
      [...new Set([...ADMIN_CATEGORIES, ...banks.map((b) => b.category)])].sort((a, b) =>
        a.localeCompare(b, 'zh-CN'),
      ),
    [banks],
  )

  return { categories, banks, byCategory, loading }
}

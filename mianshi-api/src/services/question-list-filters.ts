import type { Question } from '../types/entities.js'
import { matchesQuestionSearch } from './question-search.js'

export type QuestionListFilters = {
  category?: string
  search?: string
  status?: string
}

export type QuestionPageFilters = QuestionListFilters & {
  page?: number
  pageSize?: number
}

export type QuestionListPage = {
  items: Question[]
  total: number
  page: number
  pageSize: number
  countsByStatus: Record<string, number>
}

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

export function normalizePageSize(n?: number): number {
  if (!n || !Number.isFinite(n)) return DEFAULT_PAGE_SIZE
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)))
}

export function normalizePage(n: number | undefined, totalPages: number): number {
  const p = Math.max(1, Math.floor(n ?? 1))
  return Math.min(p, totalPages)
}

/** 方向 + 搜索（不含状态） */
export function filterQuestionsBase(items: Question[], filters?: QuestionListFilters): Question[] {
  let result = [...items]
  if (filters?.category && filters.category !== '全部') {
    result = result.filter((q) => q.category === filters.category)
  }
  if (filters?.search?.trim()) {
    result = result.filter((q) => matchesQuestionSearch(q, filters.search!.trim()))
  }
  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function countQuestionsByStatus(items: Question[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const q of items) {
    const s = q.status ?? 'draft'
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

export function paginateQuestions(
  items: Question[],
  filters?: QuestionPageFilters,
): Omit<QuestionListPage, 'countsByStatus'> {
  const pageSize = normalizePageSize(filters?.pageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = normalizePage(filters?.page, totalPages)
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  }
}

export function listQuestionsPageFromItems(
  all: Question[],
  filters?: QuestionPageFilters,
): QuestionListPage {
  const base = filterQuestionsBase(all, filters)
  const countsByStatus = countQuestionsByStatus(base)
  let filtered = base
  if (filters?.status && filters.status !== '全部') {
    filtered = base.filter((q) => (q.status ?? 'draft') === filters.status)
  }
  return { ...paginateQuestions(filtered, filters), countsByStatus }
}

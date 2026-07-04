import type { QuestionProgress } from '../api/client'

/** @deprecated 旧版全局 key，仅用于一次性迁移 */
export const LEGACY_PRACTICE_STORAGE_KEY = 'mianshi_practice'
export const PRACTICE_STORAGE_KEY = 'mianshi_practice_v2'
export const LAST_VIEWED_KEY = 'mianshi_last_viewed_v2'
export const LAST_BANK_KEY = 'mianshi_last_bank_v2'

export type LastBank = {
  slug: string
  title: string
  category: string
  visitedAt: string
}

function scopedKey(base: string, userId?: string | null) {
  return userId ? `${base}:user:${userId}` : `${base}:guest`
}

export function getPracticeStorageKey(userId?: string | null) {
  return scopedKey(PRACTICE_STORAGE_KEY, userId)
}

export function getLastViewedStorageKey(userId?: string | null) {
  return scopedKey(LAST_VIEWED_KEY, userId)
}

export function getLastBankStorageKey(userId?: string | null) {
  return scopedKey(LAST_BANK_KEY, userId)
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** 迁移旧版全局 progress 到 guest key（一次性） */
function migrateLegacyPractice() {
  try {
    const legacy = localStorage.getItem(LEGACY_PRACTICE_STORAGE_KEY)
    if (!legacy) return
    const guestKey = getPracticeStorageKey(null)
    if (!localStorage.getItem(guestKey)) {
      localStorage.setItem(guestKey, legacy)
    }
    localStorage.removeItem(LEGACY_PRACTICE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadPracticeLocal(userId?: string | null): Record<string, QuestionProgress> {
  migrateLegacyPractice()
  return readJson(getPracticeStorageKey(userId), {})
}

export function savePracticeLocal(
  map: Record<string, QuestionProgress>,
  userId?: string | null,
) {
  localStorage.setItem(getPracticeStorageKey(userId), JSON.stringify(map))
}

export function loadLastViewedLocal(userId?: string | null): Record<string, string> {
  return readJson(getLastViewedStorageKey(userId), {})
}

export function saveLastViewedLocal(map: Record<string, string>, userId?: string | null) {
  localStorage.setItem(getLastViewedStorageKey(userId), JSON.stringify(map))
}

export function loadLastBank(userId?: string | null): LastBank | null {
  return readJson<LastBank | null>(getLastBankStorageKey(userId), null)
}

export function saveLastBank(bank: Omit<LastBank, 'visitedAt'>, userId?: string | null) {
  localStorage.setItem(
    getLastBankStorageKey(userId),
    JSON.stringify({ ...bank, visitedAt: new Date().toISOString() }),
  )
}

/** 新注册用户：丢弃浏览器里未登录时的刷题记录，避免「新号有进度」 */
export function clearGuestPracticeStorage() {
  localStorage.removeItem(getPracticeStorageKey(null))
  localStorage.removeItem(getLastViewedStorageKey(null))
  localStorage.removeItem(getLastBankStorageKey(null))
}

/** 登录：仅当该账号尚无云端/本地进度时，才合并 guest 记录 */
export function mergeGuestPracticeIntoUser(userId: string) {
  const userKey = getPracticeStorageKey(userId)
  const guestKey = getPracticeStorageKey(null)
  const guest = localStorage.getItem(guestKey)
  if (guest && !localStorage.getItem(userKey)) {
    localStorage.setItem(userKey, guest)
  }
  localStorage.removeItem(guestKey)
  localStorage.removeItem(getLastViewedStorageKey(null))
  localStorage.removeItem(getLastBankStorageKey(null))
}

export function countUnpracticedInBank(
  questionIds: string[],
  progress: Record<string, QuestionProgress>,
) {
  return questionIds.filter((id) => !progress[id]).length
}

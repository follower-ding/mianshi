import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type QuestionProgress } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import {
  loadLastViewedLocal,
  loadPracticeLocal,
  saveLastViewedLocal,
  savePracticeLocal,
} from '../lib/practiceStorage'

export function formatLastViewed(iso?: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚浏览'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

export function usePracticeProgress() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [map, setMap] = useState<Record<string, QuestionProgress>>(() =>
    loadPracticeLocal(userId),
  )
  const [lastViewed, setLastViewed] = useState<Record<string, string>>(() =>
    loadLastViewedLocal(userId),
  )
  const [stats, setStats] = useState({ practiced: 0, mastered: 0, favorites: 0 })
  const [syncing, setSyncing] = useState(false)

  const recomputeStats = useCallback((next: Record<string, QuestionProgress>) => {
    let practiced = 0
    let mastered = 0
    let favorites = 0
    for (const p of Object.values(next)) {
      if (p.status === 'mastered') mastered++
      else practiced++
      if (p.favorite) favorites++
    }
    setStats({ practiced, mastered, favorites })
  }, [])

  useEffect(() => {
    const local = loadPracticeLocal(userId)
    setMap(local)
    setLastViewed(loadLastViewedLocal(userId))
    recomputeStats(local)
  }, [userId, recomputeStats])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setSyncing(true)
    const localItems = Object.values(loadPracticeLocal(user.id))
    api
      .syncPracticeProgress(localItems)
      .then((res) => {
        if (cancelled) return
        const next: Record<string, QuestionProgress> = {}
        for (const item of res.items) next[item.questionId] = item
        setMap(next)
        savePracticeLocal(next, user.id)
        setStats(res.stats)
      })
      .catch(() => {
        api.getPracticeProgress().then((res) => {
          if (cancelled) return
          const next: Record<string, QuestionProgress> = {}
          for (const item of res.items) next[item.questionId] = item
          setMap((prev) => {
            const merged = { ...prev, ...next }
            savePracticeLocal(merged, user.id)
            return merged
          })
        })
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const update = useCallback(
    async (questionId: string, patch: Partial<Pick<QuestionProgress, 'status' | 'favorite'>>) => {
      const now = new Date().toISOString()
      setMap((prev) => {
        const current = prev[questionId]
        const next: QuestionProgress = {
          questionId,
          status: patch.status ?? current?.status ?? 'practiced',
          favorite: patch.favorite ?? current?.favorite ?? false,
          updatedAt: now,
        }
        const merged = { ...prev, [questionId]: next }
        savePracticeLocal(merged, userId)
        recomputeStats(merged)
        return merged
      })

      if (user) {
        try {
          const res = await api.updatePracticeProgress(questionId, patch)
          setMap((prev) => {
            const merged = { ...prev, [questionId]: res.item }
            savePracticeLocal(merged, user.id)
            return merged
          })
          setStats(res.stats)
        } catch {
          /* local already updated */
        }
      }
    },
    [user, userId, recomputeStats],
  )

  const markPracticed = useCallback(
    (questionId: string) => update(questionId, { status: 'practiced' }),
    [update],
  )

  const markMastered = useCallback(
    (questionId: string) => update(questionId, { status: 'mastered' }),
    [update],
  )

  const toggleFavorite = useCallback(
    (questionId: string) => {
      setMap((prev) => {
        const current = prev[questionId]
        const next = {
          ...current,
          questionId,
          status: current?.status ?? 'practiced',
          favorite: !current?.favorite,
          updatedAt: new Date().toISOString(),
        } as QuestionProgress
        const merged = { ...prev, [questionId]: next }
        savePracticeLocal(merged, userId)
        recomputeStats(merged)
        return merged
      })
      if (user) {
        api.updatePracticeProgress(questionId, { favorite: !map[questionId]?.favorite }).catch(() => {})
      }
    },
    [user, userId, map, recomputeStats],
  )

  const getProgress = useCallback((questionId: string) => map[questionId], [map])

  const progressFilterMatch = useCallback(
    (questionId: string, filter: string) => {
      const p = map[questionId]
      switch (filter) {
        case '未刷':
          return !p
        case '已刷':
          return p?.status === 'practiced'
        case '已掌握':
          return p?.status === 'mastered'
        case '收藏':
          return Boolean(p?.favorite)
        default:
          return true
      }
    },
    [map],
  )

  const markViewed = useCallback(
    (questionId: string) => {
      const now = new Date().toISOString()
      setLastViewed((prev) => {
        const next = { ...prev, [questionId]: now }
        saveLastViewedLocal(next, userId)
        return next
      })
    },
    [userId],
  )

  const getLastViewed = useCallback((questionId: string) => lastViewed[questionId], [lastViewed])

  return useMemo(
    () => ({
      map,
      stats,
      syncing,
      markPracticed,
      markMastered,
      toggleFavorite,
      getProgress,
      progressFilterMatch,
      markViewed,
      getLastViewed,
    }),
    [
      map,
      stats,
      syncing,
      markPracticed,
      markMastered,
      toggleFavorite,
      getProgress,
      progressFilterMatch,
      markViewed,
      getLastViewed,
    ],
  )
}

import { useEffect } from 'react'
import type { Question, QuestionProgress } from '../api/client'

export function countUnpracticed(
  items: Question[],
  getProgress: (id: string) => QuestionProgress | undefined,
) {
  return items.filter((q) => !getProgress(q.id)).length
}

export function findNextUnpracticedId(
  items: Question[],
  currentId: string | null,
  getProgress: (id: string) => QuestionProgress | undefined,
): string | null {
  if (!items.length) return null
  const start = currentId ? items.findIndex((q) => q.id === currentId) + 1 : 0
  for (let i = start; i < items.length; i++) {
    if (!getProgress(items[i].id)) return items[i].id
  }
  for (let i = 0; i < start; i++) {
    if (!getProgress(items[i].id)) return items[i].id
  }
  return null
}

export function findFirstUnpracticedId(
  items: Question[],
  getProgress: (id: string) => QuestionProgress | undefined,
): string | null {
  return items.find((q) => !getProgress(q.id))?.id ?? items[0]?.id ?? null
}

export function useQuestionBankKeyboard(
  onPrev: () => void,
  onNext: () => void,
  onMarkMastered: () => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight' || e.key === 'k') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'm') {
        e.preventDefault()
        onMarkMastered()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onMarkMastered])
}

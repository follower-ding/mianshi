import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuestionFormData } from './questionFormUtils'

const STORAGE_PREFIX = 'mianshi-question-draft:'
const AUTOSAVE_MS = 30_000

type StoredDraft = {
  form: QuestionFormData
  savedAt: number
}

function formsEqual(a: QuestionFormData, b: QuestionFormData) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useQuestionDraftAutosave({
  draftKey,
  form,
  baselineForm,
  onRestore,
  enabled = true,
}: {
  draftKey: string
  form: QuestionFormData
  baselineForm: QuestionFormData
  onRestore: (form: QuestionFormData) => void
  enabled?: boolean
}) {
  const storageKey = `${STORAGE_PREFIX}${draftKey}`
  const [pendingRestore, setPendingRestore] = useState<QuestionFormData | null>(null)
  const [pendingSavedAt, setPendingSavedAt] = useState<number | null>(null)
  const [lastAutosavedAt, setLastAutosavedAt] = useState<number | null>(null)
  const restoredChecked = useRef(false)

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setPendingRestore(null)
    setLastAutosavedAt(null)
  }, [storageKey])

  useEffect(() => {
    restoredChecked.current = false
    setPendingRestore(null)
    setPendingSavedAt(null)
  }, [draftKey])

  useEffect(() => {
    if (restoredChecked.current || !enabled) return
    restoredChecked.current = true
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as StoredDraft
      if (
        parsed.form &&
        !formsEqual(parsed.form, baselineForm) &&
        !formsEqual(parsed.form, form)
      ) {
        setPendingRestore(parsed.form)
        setPendingSavedAt(parsed.savedAt ?? null)
        setLastAutosavedAt(parsed.savedAt ?? null)
      } else if (formsEqual(parsed.form, baselineForm)) {
        localStorage.removeItem(storageKey)
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey, baselineForm, form, enabled])

  useEffect(() => {
    if (!enabled) return
    const hasContent = Boolean(form.title.trim() || form.content.trim())
    if (!hasContent || formsEqual(form, baselineForm)) {
      return
    }
    const timer = window.setTimeout(() => {
      const payload: StoredDraft = { form, savedAt: Date.now() }
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setLastAutosavedAt(payload.savedAt)
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [form, baselineForm, storageKey, enabled])

  const restoreDraft = useCallback(() => {
    if (!pendingRestore) return
    onRestore(pendingRestore)
    setPendingRestore(null)
  }, [pendingRestore, onRestore])

  const dismissRestore = useCallback(() => {
    clearDraft()
  }, [clearDraft])

  return {
    pendingRestore,
    pendingSavedAt,
    lastAutosavedAt,
    restoreDraft,
    dismissRestore,
    clearDraft,
  }
}

export function migrateQuestionDraft(fromKey: string, toKey: string) {
  const from = `${STORAGE_PREFIX}${fromKey}`
  const to = `${STORAGE_PREFIX}${toKey}`
  const raw = localStorage.getItem(from)
  if (raw) {
    localStorage.setItem(to, raw)
    localStorage.removeItem(from)
  }
}

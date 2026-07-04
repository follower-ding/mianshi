import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ResumeContent, type ResumeLayoutConfig, type UserResume } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import { layoutToConfig, type ResumeLayoutState } from './resumeLayoutConfig'

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

type Options = {
  resumeId: string | null
  content: ResumeContent
  templateId: ResumeTemplateId
  title: string
  layout: ResumeLayoutState
  enabled: boolean
  debounceMs?: number
  onSaved?: (resume: UserResume) => void
  onError?: (message: string) => void
}

function snapshot(
  content: ResumeContent,
  templateId: ResumeTemplateId,
  title: string,
  layout: ResumeLayoutState,
) {
  return JSON.stringify({ content, templateId, title, layoutConfig: layoutToConfig(layout) })
}

export function useResumeAutoSave({
  resumeId,
  content,
  templateId,
  title,
  layout,
  enabled,
  debounceMs = 1200,
  onSaved,
  onError,
}: Options) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const lastSavedRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const rerunRef = useRef(false)

  const contentRef = useRef(content)
  const templateRef = useRef(templateId)
  const titleRef = useRef(title)
  const layoutRef = useRef(layout)
  const resumeIdRef = useRef(resumeId)
  contentRef.current = content
  templateRef.current = templateId
  titleRef.current = title
  layoutRef.current = layout
  resumeIdRef.current = resumeId

  const markSynced = useCallback(
    (resume: UserResume | null, mergedContent: ResumeContent, mergedLayout?: ResumeLayoutState) => {
      const lay = mergedLayout ?? layoutRef.current
      lastSavedRef.current = snapshot(
        mergedContent,
        (resume?.templateId as ResumeTemplateId) ?? templateRef.current,
        resume?.title ?? titleRef.current,
        lay,
      )
      setStatus('idle')
    },
    [],
  )

  const doSave = useCallback(async (): Promise<boolean> => {
    if (lastSavedRef.current === null || !resumeIdRef.current) return true

    const body = {
      content: contentRef.current,
      templateId: templateRef.current,
      title: titleRef.current,
      layoutConfig: layoutToConfig(layoutRef.current) as ResumeLayoutConfig,
    }
    const snap = snapshot(body.content, body.templateId, body.title, layoutRef.current)
    if (snap === lastSavedRef.current) {
      setStatus('idle')
      return true
    }

    if (savingRef.current) {
      rerunRef.current = true
      return false
    }

    savingRef.current = true
    setStatus('saving')
    try {
      const { resume } = await api.updateResume(resumeIdRef.current, body)
      lastSavedRef.current = snap
      setStatus('saved')
      onSaved?.(resume)
      return true
    } catch (e) {
      setStatus('error')
      onError?.(e instanceof Error ? e.message : '自动保存失败')
      return false
    } finally {
      savingRef.current = false
      if (rerunRef.current) {
        rerunRef.current = false
        void doSave()
      }
    }
  }, [onSaved, onError])

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    while (savingRef.current) {
      await new Promise((r) => setTimeout(r, 50))
    }
    return doSave()
  }, [doSave])

  useEffect(() => {
    if (!enabled || lastSavedRef.current === null || !resumeId) return

    const snap = snapshot(content, templateId, title, layout)
    if (snap === lastSavedRef.current) return

    setStatus('pending')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void doSave()
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [content, templateId, title, layout, enabled, debounceMs, doSave, resumeId])

  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 3000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    if (!enabled) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'pending' || status === 'saving') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [enabled, status])

  return { status, markSynced, flush }
}

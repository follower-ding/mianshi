import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ResumeTemplateId } from '../../lib/data'
import {
  api,
  ApiError,
  SCANNED_PDF_CODE,
  type JobPosting,
  type ResumeContent,
  type ResumeOptimizeResult,
  type UserResume,
} from '../../api/client'
import {
  EMPTY_RESUME_CONTENT,
  isValidTemplateId,
  mergeResumeContent,
  mergeSectionContent,
  pickSectionContent,
  sanitizeResumeContent,
  contentToPlainText,
} from '../../components/resume/resumeUtils'
import { exportResume } from '../../components/resume/resumeExport'
import { useConfirm } from '../../contexts/ConfirmContext'
import { SECTION_LABELS, type ResumeSectionKey } from '../../components/resume/resumeSections'
import { hasSavedResume } from '../../components/resume/resumeLayout'
import {
  sectionCompareTexts,
  type OptimizeComparePayload,
} from '../../components/resume/SectionOptimizeCompareModal'
import type { ParseComparePayload } from '../../components/resume/ImportParseCompareModal'
import { useResumeAutoSave } from '../../components/resume/useResumeAutoSave'
import {
  defaultLayoutState,
  layoutFromConfig,
  type ResumeLayoutState,
} from '../../components/resume/resumeLayoutConfig'
import type { ResumePreviewSettings } from '../../components/resume/resumePreviewSettings'
import { applyTemplatePreset } from '../../components/resume/resumePreviewSettings'
import { moveSectionInOrder } from '../../components/resume/resumeSections'

type GeneratePreviewPayload = {
  title: string
  content: ResumeContent
  source: 'llm' | 'demo'
  resume: UserResume
  rawText: string
}

type ResumeContextValue = {
  loading: boolean
  resumes: UserResume[]
  resume: UserResume | null
  activeResumeId: string | null
  switchResume: (id: string) => void
  createBlankResume: () => Promise<UserResume | null>
  deleteResumeById: (id: string) => Promise<boolean>
  duplicateResumeById: (id: string) => Promise<UserResume | null>
  updateResumeTitle: (id: string, title: string) => Promise<boolean>
  content: ResumeContent
  setContent: (c: ResumeContent) => void
  templateId: ResumeTemplateId
  setTemplateId: (id: ResumeTemplateId) => void
  selectTemplate: (id: ResumeTemplateId) => void
  titleDraft: string
  setTitleDraft: (t: string) => void
  resumeTitle: string
  pasteText: string
  setPasteText: (t: string) => void
  processing: boolean
  extracting: boolean
  optimizing: boolean
  generating: boolean
  exporting: boolean
  error: string | null
  extractErrorCode: string | null
  success: string | null
  clearFeedback: () => void
  setError: (msg: string | null) => void
  result: ResumeOptimizeResult | null
  jobs: JobPosting[]
  selectedJobId: string
  setSelectedJobId: (id: string) => void
  autoSaveStatus: ReturnType<typeof useResumeAutoSave>['status']
  handleSave: () => Promise<void>
  handleParseText: () => Promise<void>
  handleExtractFile: (file: File) => Promise<boolean>
  handleUpload: (file: File, opts?: { stayOnPage?: boolean }) => Promise<void>
  fetchParseCompare: () => Promise<ParseComparePayload | null>
  applyParseCompare: (payload: ParseComparePayload) => Promise<void>
  fetchFullOptimizeCompare: () => Promise<OptimizeComparePayload | null>
  fetchSectionOptimizeCompare: (section: ResumeSectionKey) => Promise<OptimizeComparePayload | null>
  applyOptimizeCompare: (payload: OptimizeComparePayload, opts?: { navigateToEdit?: boolean }) => Promise<void>
  optimizingSection: ResumeSectionKey | null
  handleGenerate: (input: { targetJob: string; personalInfo: string }) => Promise<boolean>
  generatePreview: GeneratePreviewPayload | null
  applyGeneratePreview: () => Promise<void>
  dismissGeneratePreview: () => void
  handleSyncSummary: () => Promise<void>
  syncingSummary: boolean
  handleExport: (format?: 'pdf' | 'jpg' | 'png') => Promise<void>
  hasContent: boolean
  sectionOrder: ResumeSectionKey[]
  sectionVisibility: Record<ResumeSectionKey, boolean>
  previewSettings: ResumePreviewSettings
  setSectionOrder: (order: ResumeSectionKey[]) => void
  setSectionVisibility: (v: Record<ResumeSectionKey, boolean>) => void
  setPreviewSettings: (s: ResumePreviewSettings | ((prev: ResumePreviewSettings) => ResumePreviewSettings)) => void
  toggleSection: (key: ResumeSectionKey) => void
  moveSection: (key: ResumeSectionKey, direction: 'up' | 'down') => void
}

const ResumeContext = createContext<ResumeContextValue | null>(null)

export function useResume() {
  const ctx = useContext(ResumeContext)
  if (!ctx) throw new Error('useResume must be used within ResumeProvider')
  return ctx
}

export function ResumeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [resumes, setResumes] = useState<UserResume[]>([])
  const [resume, setResume] = useState<UserResume | null>(null)
  const [content, setContent] = useState<ResumeContent>(EMPTY_RESUME_CONTENT)
  const [templateId, setTemplateId] = useState<ResumeTemplateId>('tech-simple')
  const [titleDraft, setTitleDraft] = useState('我的简历')
  const [pasteText, setPasteText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizingSection, setOptimizingSection] = useState<ResumeSectionKey | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatePreview, setGeneratePreview] = useState<GeneratePreviewPayload | null>(null)
  const [syncingSummary, setSyncingSummary] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractErrorCode, setExtractErrorCode] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [result, setResult] = useState<ResumeOptimizeResult | null>(null)
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [layout, setLayout] = useState<ResumeLayoutState>(defaultLayoutState())

  const resumeTitle = resume?.title ?? titleDraft
  const activeResumeId = resume?.id ?? null
  const urlResumeId = searchParams.get('id')

  const { status: autoSaveStatus, markSynced, flush } = useResumeAutoSave({
    resumeId: activeResumeId,
    content,
    templateId,
    title: resumeTitle,
    layout,
    enabled: !loading && Boolean(activeResumeId),
    onSaved: (r) => {
      setResume(r)
      setResumes((prev) => [r, ...prev.filter((x) => x.id !== r.id)])
    },
    onError: (msg) => setError(msg),
  })

  const applyResume = useCallback((r: UserResume | null) => {
    setResume(r)
    if (r?.title) setTitleDraft(r.title)
    if (r?.layoutConfig && Object.keys(r.layoutConfig).length > 0) {
      setLayout(layoutFromConfig(r.layoutConfig))
    } else if (r) {
      setLayout(defaultLayoutState())
    } else {
      setLayout(defaultLayoutState())
    }
    if (r?.content && Object.keys(r.content).length > 0) {
      setContent(sanitizeResumeContent(mergeResumeContent(EMPTY_RESUME_CONTENT, r.content)))
    } else if (!r) {
      setContent(EMPTY_RESUME_CONTENT)
    }
    if (r?.templateId && isValidTemplateId(r.templateId)) {
      setTemplateId(r.templateId)
    }
    if (r?.rawText) setPasteText(r.rawText)
  }, [])

  const selectResume = useCallback(
    (list: UserResume[], preferredId?: string | null) => {
      const id = preferredId && list.some((r) => r.id === preferredId) ? preferredId : list[0]?.id
      const picked = list.find((r) => r.id === id) ?? null
      applyResume(picked)
      return picked
    },
    [applyResume],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { resumes: list } = await api.getResumes()
      setResumes(list)
      const picked = selectResume(list, urlResumeId)
      const merged = sanitizeResumeContent(
        picked?.content && Object.keys(picked.content).length > 0
          ? mergeResumeContent(EMPTY_RESUME_CONTENT, picked.content)
          : EMPTY_RESUME_CONTENT,
      )
      markSynced(picked, merged, layoutFromConfig(picked?.layoutConfig))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [markSynced, selectResume, urlResumeId])

  const switchResume = useCallback(
    (id: string) => {
      const picked = resumes.find((r) => r.id === id)
      if (!picked) return
      applyResume(picked)
      markSynced(
        picked,
        sanitizeResumeContent(mergeResumeContent(EMPTY_RESUME_CONTENT, picked.content)),
        layoutFromConfig(picked.layoutConfig),
      )
      setSearchParams({ id })
    },
    [applyResume, markSynced, resumes, setSearchParams],
  )

  const createBlankResume = useCallback(async () => {
    try {
      const { resume: r } = await api.createResume({ title: '未命名简历' })
      setResumes((prev) => [r, ...prev])
      applyResume(r)
      markSynced(r, EMPTY_RESUME_CONTENT, defaultLayoutState())
      setSearchParams({ id: r.id })
      navigate(`/resume/edit?id=${r.id}`)
      return r
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
      return null
    }
  }, [applyResume, markSynced, navigate, setSearchParams])

  const deleteResumeById = useCallback(
    async (id: string) => {
      try {
        await api.deleteResume(id)
        const next = resumes.filter((r) => r.id !== id)
        setResumes(next)
        if (resume?.id === id) {
          const picked = selectResume(next)
          if (picked) setSearchParams({ id: picked.id })
          else {
            applyResume(null)
            setSearchParams({})
          }
        }
        setSuccess('已删除简历')
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : '删除失败')
        return false
      }
    },
    [applyResume, resume?.id, resumes, selectResume, setSearchParams],
  )

  const duplicateResumeById = useCallback(
    async (id: string) => {
      const src = resumes.find((r) => r.id === id)
      if (!src) return null
      try {
        const { resume: created } = await api.createResume({
          title: `${src.title} 副本`,
          templateId: src.templateId,
        })
        const { resume: saved } = await api.updateResume(created.id, {
          title: `${src.title} 副本`,
          templateId: src.templateId,
          content: src.content,
          rawText: src.rawText,
          summary: src.summary,
          optimizedText: src.optimizedText,
          layoutConfig: src.layoutConfig,
        })
        setResumes((prev) => [saved, ...prev])
        setSuccess('已创建副本')
        return saved
      } catch (e) {
        setError(e instanceof Error ? e.message : '复制失败')
        return null
      }
    },
    [resumes],
  )

  const updateResumeTitle = useCallback(
    async (id: string, title: string) => {
      const t = title.trim()
      if (!t) return false
      try {
        const { resume: saved } = await api.updateResume(id, { title: t })
        setResumes((prev) => prev.map((r) => (r.id === id ? saved : r)))
        if (resume?.id === id) {
          setResume(saved)
          setTitleDraft(t)
        }
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : '重命名失败')
        return false
      }
    },
    [resume?.id],
  )

  useEffect(() => {
    load()
    api.listJobs().then((r) => setJobs(r.items.slice(0, 30))).catch(() => {})
  }, [load])

  const urlJobId = searchParams.get('jobId')
  useEffect(() => {
    if (!urlJobId) return
    setSelectedJobId(urlJobId)
    if (!jobs.some((j) => j.id === urlJobId)) {
      api.getJob(urlJobId).then((j) => setJobs((prev) => [j, ...prev.filter((x) => x.id !== j.id)])).catch(() => {})
    }
  }, [urlJobId])

  useEffect(() => {
    if (!success && !error) return
    const t = window.setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 5000)
    return () => window.clearTimeout(t)
  }, [success, error])

  const hasContent = useMemo(() => {
    const c = content
    return (
      hasSavedResume(resume, c) ||
      pasteText.trim().length >= 30
    )
  }, [content, resume, pasteText])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    const ok = await flush()
    if (ok) setSuccess('简历已保存')
  }

  const handleParseText = async () => {
    if (pasteText.trim().length < 30) {
      setError('请粘贴至少 30 字的简历内容')
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const r = await api.parseResumeText(pasteText.trim(), resume?.id)
      setResumes((prev) => [r.resume, ...prev.filter((x) => x.id !== r.resume.id)])
      setResume(r.resume)
      setContent(sanitizeResumeContent(mergeResumeContent(EMPTY_RESUME_CONTENT, r.content)))
      setPasteText(r.resume.rawText || pasteText)
      setSuccess('简历已解析，可进入排版编辑继续完善')
      navigate(`/resume/edit?id=${r.resume.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败')
    } finally {
      setProcessing(false)
    }
  }

  const handleExtractFile = async (file: File): Promise<boolean> => {
    setExtracting(true)
    setError(null)
    setExtractErrorCode(null)
    try {
      const r = await api.uploadResumeFile(file, resume?.id, { parse: false })
      const text = r.text ?? r.extractedText ?? ''
      setPasteText(text)
      setSuccess(
        `已提取「${r.fileName ?? file.name}」共 ${r.charCount ?? text.length} 字，请核对原文后智能识别`,
      )
      return true
    } catch (e) {
      if (e instanceof ApiError && e.code === SCANNED_PDF_CODE) {
        setExtractErrorCode(SCANNED_PDF_CODE)
      }
      setError(e instanceof Error ? e.message : '提取失败')
      return false
    } finally {
      setExtracting(false)
    }
  }

  const fetchParseCompare = async (): Promise<ParseComparePayload | null> => {
    const raw = pasteText.trim()
    if (raw.length < 30) {
      setError('请粘贴或提取至少 30 字的简历内容')
      return null
    }
    try {
      const health = await api.getResumeHealth()
      if (
        health.demoMode &&
        !(await confirm({
          title: '演示模式',
          message:
            '当前为演示模式，智能识别将使用规则模板而非大模型，结果可能与原文差异较大。是否继续？',
        }))
      ) {
        return null
      }
    } catch {
      /* ignore health check failure */
    }
    setProcessing(true)
    setError(null)
    try {
      const parsed = await api.parseResumePreview(raw)
      const merged = sanitizeResumeContent(
        mergeResumeContent(EMPTY_RESUME_CONTENT, parsed.content),
      )
      return {
        beforeText: raw,
        afterText: contentToPlainText(merged),
        merged,
        source: parsed.source,
        fieldCoverage: parsed.fieldCoverage,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败')
      return null
    } finally {
      setProcessing(false)
    }
  }

  const applyParseCompare = async (payload: ParseComparePayload) => {
    const raw = pasteText.trim()
    let saved: UserResume
    if (resume?.id) {
      const { resume: r } = await api.updateResume(resume.id, {
        content: payload.merged,
        rawText: raw,
      })
      saved = r
    } else {
      const { resume: created } = await api.createResume({ title: '导入的简历' })
      const { resume: r } = await api.updateResume(created.id, {
        content: payload.merged,
        rawText: raw,
      })
      saved = r
    }
    setResumes((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setResume(saved)
    setContent(payload.merged)
    markSynced(saved, payload.merged, layout)
    const modeHint =
      payload.source === 'demo'
        ? '（演示模式，请核对字段或配置 LLM_API_KEY）'
        : '（大模型识别）'
    setSuccess(`已应用识别结果${modeHint}，可继续排版编辑`)
    navigate(`/resume/edit?id=${saved.id}`)
  }

  const handleUpload = async (file: File, opts?: { stayOnPage?: boolean }) => {
    setProcessing(true)
    setError(null)
    try {
      const r = await api.uploadResumeFile(file, resume?.id)
      if (!r.resume || !r.content) {
        const text = r.text ?? r.extractedText ?? ''
        setPasteText(text)
        setSuccess(`已提取「${r.fileName ?? file.name}」，请核对后智能识别`)
        return
      }
      setResumes((prev) => [r.resume!, ...prev.filter((x) => x.id !== r.resume!.id)])
      setResume(r.resume!)
      setContent(sanitizeResumeContent(mergeResumeContent(EMPTY_RESUME_CONTENT, r.content!)))
      setPasteText(r.resume!.rawText || r.extractedText || '')
      setSuccess(`已解析「${r.fileName ?? file.name}」`)
      if (!opts?.stayOnPage) navigate(`/resume/edit?id=${r.resume!.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setProcessing(false)
    }
  }

  const confirmDemoIfNeeded = async (label: string) => {
    try {
      const health = await api.getResumeHealth()
      if (!health.demoMode) return true
      return confirm({
        title: '演示模式',
        message: `当前为演示模式，${label}将使用规则模板而非大模型。是否继续？`,
      })
    } catch {
      return true
    }
  }

  const fetchFullOptimizeCompare = async (): Promise<OptimizeComparePayload | null> => {
    const sourceText = pasteText.trim() || contentToPlainText(content)
    if (sourceText.length < 30) {
      setError('请粘贴或导入至少 30 字的完整简历')
      return null
    }
    if (!(await confirmDemoIfNeeded('全文优化'))) return null
    setOptimizing(true)
    setError(null)
    try {
      const before = sanitizeResumeContent({ ...content })
      const r = await api.optimizeResume({
        text: sourceText,
        jobId: selectedJobId || undefined,
        resumeId: resume?.id,
      })
      const merged = sanitizeResumeContent(mergeResumeContent(EMPTY_RESUME_CONTENT, r.result.content))
      setResult(r.result)
      return {
        kind: 'full',
        before,
        beforeText: sourceText,
        after: merged,
        afterText: r.result.optimizedText || contentToPlainText(merged),
        merged,
        summary: r.result.summary,
        suggestions: r.result.suggestions,
        source: r.result.source,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败')
      return null
    } finally {
      setOptimizing(false)
    }
  }

  const fetchSectionOptimizeCompare = async (
    section: ResumeSectionKey,
  ): Promise<OptimizeComparePayload | null> => {
    if (!(await confirmDemoIfNeeded(`${SECTION_LABELS[section]} 优化`))) return null
    setOptimizingSection(section)
    setError(null)
    try {
      const before = sanitizeResumeContent({ ...content })
      const partial = pickSectionContent(before, section)
      let text = contentToPlainText(partial).trim()
      if (text.length < 30) {
        text = [
          `请仅优化「${SECTION_LABELS[section]}」模块，其他模块保持不变。`,
          text,
          before.basic?.title ? `目标职位：${before.basic.title}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      }
      if (text.length < 8) {
        setError(`${SECTION_LABELS[section]} 内容太少，无法优化`)
        return null
      }
      const r = await api.optimizeResume({ content: partial, text, resumeId: resume?.id })
      const merged = mergeSectionContent(before, section, r.result.content)
      const { beforeText, afterText } = sectionCompareTexts(section, before, merged)
      return {
        kind: 'section',
        section,
        before,
        beforeText,
        after: merged,
        afterText,
        merged,
        summary: r.result.summary,
        suggestions: r.result.suggestions,
        source: r.result.source,
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '模块优化失败')
      return null
    } finally {
      setOptimizingSection(null)
    }
  }

  const applyOptimizeCompare = async (
    payload: OptimizeComparePayload,
    opts?: { navigateToEdit?: boolean },
  ) => {
    setContent(payload.merged)
    if (payload.kind === 'full') {
      setPasteText(payload.afterText)
    }
    markSynced(resume, payload.merged, layout)
    await flush()
    setSuccess(
      payload.kind === 'full'
        ? '已应用全文优化结果'
        : payload.section
          ? `${SECTION_LABELS[payload.section]} 已更新`
          : '模块已更新',
    )
    if (opts?.navigateToEdit && resume?.id) navigate(`/resume/edit?id=${resume.id}`)
  }

  const handleGenerate = async (input: {
    targetJob: string
    personalInfo: string
  }): Promise<boolean> => {
    setGenerating(true)
    setError(null)
    try {
      const health = await api.getResumeHealth()
      if (
        health.demoMode &&
        !(await confirm({
          title: '演示模式',
          message: '当前为演示模式，生成结果将使用规则模板而非大模型定制。是否继续？',
        }))
      ) {
        return false
      }
      const r = await api.generateResume(input)
      const job = input.targetJob.trim()
      const aligned = sanitizeResumeContent(
        mergeResumeContent(EMPTY_RESUME_CONTENT, {
          ...r.result.content,
          basic: { ...r.result.content.basic, title: job },
        }),
      )
      const title = r.result.title.includes(job) ? r.result.title : `${job}-AI`
      setGeneratePreview({
        title,
        content: aligned,
        source: r.result.source,
        resume: { ...r.resume, title, content: aligned },
        rawText: r.result.rawText,
      })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 生成失败')
      return false
    } finally {
      setGenerating(false)
    }
  }

  const applyGeneratePreview = async () => {
    if (!generatePreview) return
    const { title, content: aligned, resume: r, rawText } = generatePreview
    setResumes((prev) => [r, ...prev.filter((x) => x.id !== r.id)])
    setResume(r)
    setContent(aligned)
    setTitleDraft(title)
    setPasteText(rawText)
    markSynced(r, aligned, layout)
    const modeHint =
      generatePreview.source === 'demo'
        ? '（演示模式）'
        : '（大模型已按目标岗位生成）'
    setSuccess(`已应用「${title}」${modeHint}`)
    setGeneratePreview(null)
    navigate(`/resume/edit?id=${r.id}`)
  }

  const dismissGeneratePreview = () => setGeneratePreview(null)

  const handleSyncSummary = async () => {
    setSyncingSummary(true)
    setError(null)
    try {
      const res = await api.syncResumeSummary()
      setSuccess(res.resumeSummary ? '简历亮点已同步到投递偏好' : '同步成功')
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败，请先完成 AI 优化生成摘要')
    } finally {
      setSyncingSummary(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'jpg' | 'png' = 'pdf') => {
    setExporting(true)
    setError(null)
    await flush()
    try {
      await exportResume(format, content.basic?.name ? `${content.basic.name}-简历` : resumeTitle)
      const label = format === 'pdf' ? 'PDF' : format.toUpperCase()
      setSuccess(`${label} 已导出`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const setSectionOrder = useCallback((order: ResumeSectionKey[]) => {
    setLayout((l) => ({ ...l, sectionOrder: order }))
  }, [])

  const setSectionVisibility = useCallback((v: Record<ResumeSectionKey, boolean>) => {
    setLayout((l) => ({ ...l, sectionVisibility: v }))
  }, [])

  const setPreviewSettings = useCallback(
    (s: ResumePreviewSettings | ((prev: ResumePreviewSettings) => ResumePreviewSettings)) => {
      setLayout((l) => ({
        ...l,
        previewSettings: typeof s === 'function' ? s(l.previewSettings) : s,
      }))
    },
    [],
  )

  const toggleSection = useCallback((key: ResumeSectionKey) => {
    setLayout((l) => ({
      ...l,
      sectionVisibility: { ...l.sectionVisibility, [key]: !l.sectionVisibility[key] },
    }))
  }, [])

  const moveSection = useCallback((key: ResumeSectionKey, direction: 'up' | 'down') => {
    setLayout((l) => ({
      ...l,
      sectionOrder: moveSectionInOrder(l.sectionOrder, key, direction),
    }))
  }, [])

  const selectTemplate = useCallback((id: ResumeTemplateId) => {
    setTemplateId(id)
    setPreviewSettings((prev) => applyTemplatePreset(prev, id))
  }, [setPreviewSettings])

  const value: ResumeContextValue = {
    loading,
    resumes,
    resume,
    activeResumeId,
    switchResume,
    createBlankResume,
    deleteResumeById,
    duplicateResumeById,
    updateResumeTitle,
    content,
    setContent,
    templateId,
    setTemplateId,
    selectTemplate,
    titleDraft,
    setTitleDraft,
    resumeTitle,
    pasteText,
    setPasteText,
    processing,
    extracting,
    optimizing,
    generating,
    exporting,
    error,
    extractErrorCode,
    success,
    clearFeedback: () => {
      setError(null)
      setExtractErrorCode(null)
      setSuccess(null)
    },
    setError,
    result,
    jobs,
    selectedJobId,
    setSelectedJobId,
    autoSaveStatus,
    handleSave,
    handleParseText,
    handleExtractFile,
    handleUpload,
    fetchParseCompare,
    applyParseCompare,
    fetchFullOptimizeCompare,
    fetchSectionOptimizeCompare,
    applyOptimizeCompare,
    optimizingSection,
    handleGenerate,
    generatePreview,
    applyGeneratePreview,
    dismissGeneratePreview,
    handleSyncSummary,
    syncingSummary,
    handleExport,
    hasContent,
    sectionOrder: layout.sectionOrder,
    sectionVisibility: layout.sectionVisibility,
    previewSettings: layout.previewSettings,
    setSectionOrder,
    setSectionVisibility,
    setPreviewSettings,
    toggleSection,
    moveSection,
  }

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
}

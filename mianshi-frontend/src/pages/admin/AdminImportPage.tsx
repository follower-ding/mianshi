import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Wand2,
  FileUp,
  Pencil,
  Check,
  X,
  Loader2,
  Upload,
  ArrowRight,
  Clipboard,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { api, ImportUploadError, SCANNED_PDF_CODE } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { AdminPageToolbar } from '../../components/admin/AdminPageToolbar'
import { adminAlertCx } from '../../components/admin/adminChartColors'
import { AdminSmartGuide } from '../../components/admin/AdminSmartGuide'
import { AdminCard } from '../../components/admin/AdminCard'
import { AdminSelect } from '../../components/admin/AdminToolbar'
import { AdminButton } from '../../components/admin/AdminButton'
import { ScannedPdfGuide } from '../../components/resume/ScannedPdfGuide'
import { ADMIN_CATEGORIES, adminCx, adminLayout } from '../../components/admin/adminTheme'

type ParsedQ = {
  title: string
  content: string
  difficulty: string
  type: string
  tags: string[]
  keyPoints: string[]
  referenceAnswer: string
  scoringRubric: string
  followUpTemplates: string[]
  status: string
  category?: string
  selected: boolean
  warnings?: string[]
}

function computeQuestionWarnings(q: Pick<ParsedQ, 'keyPoints' | 'referenceAnswer' | 'scoringRubric' | 'followUpTemplates'>) {
  const warnings: string[] = []
  if (!(q.keyPoints?.length ?? 0)) warnings.push('缺少回答要点')
  if (!q.referenceAnswer?.trim()) warnings.push('缺少参考答案')
  if (!q.scoringRubric?.trim()) warnings.push('缺少评分标准')
  if (!(q.followUpTemplates?.length ?? 0)) warnings.push('缺少追问模板')
  return warnings
}

function questionNeedsEnrich(q: ParsedQ) {
  return computeQuestionWarnings(q).length > 0
}

const DIFFICULTIES = ['简单', '中等', '困难'] as const
const QUESTION_TYPES = ['基础', '项目', '系统设计', '算法', '开放'] as const
const IMPORT_MAX_MB = 10

type Mode = 'paste' | 'upload' | 'quick' | null

type LastImportResult = {
  summary: { created: number; skipped: number; failed: number }
  incompleteCount: number
}

function formatImportSummary(summary: {
  created: number
  skipped: number
  failed: number
}): string {
  const parts = [`成功 ${summary.created} 题`]
  if (summary.skipped > 0) parts.push(`跳过 ${summary.skipped} 题`)
  if (summary.failed > 0) parts.push(`失败 ${summary.failed} 题`)
  return parts.join(' · ')
}

export function AdminImportPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [mode, setMode] = useState<Mode>(null)
  const [category, setCategory] = useState('Java')
  const [difficulty, setDifficulty] = useState('中等')
  const [type, setType] = useState('基础')
  const [questions, setQuestions] = useState<ParsedQ[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [truncateHint, setTruncateHint] = useState<string | null>(null)
  const [extractedFallback, setExtractedFallback] = useState<string | null>(null)

  const [pasteText, setPasteText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [quickRows, setQuickRows] = useState<{ title: string; content: string; tags: string }[]>([
    { title: '', content: '', tags: '' },
  ])
  const [genTitle, setGenTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null)
  const [llmReachable, setLlmReachable] = useState<boolean | null>(null)
  const [parseSource, setParseSource] = useState<'llm' | 'demo' | null>(null)
  const [scanErrorCode, setScanErrorCode] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<LastImportResult | null>(null)

  useEffect(() => {
    api
      .getImportHealth(true)
      .then((h) => {
        setLlmConfigured(h.llmConfigured)
        setLlmReachable(h.reachable ?? null)
      })
      .catch(() => {
        setLlmConfigured(false)
        setLlmReachable(null)
      })
  }, [])

  const notifyParseSource = (source?: 'llm' | 'demo') => {
    setParseSource(source ?? null)
    if (source === 'demo') {
      const msg =
        llmConfigured === true
          ? '大模型已配置但本次调用未成功，已降级为规则解析。请重启 API 或查看控制台 [import] 日志。'
          : '未检测到 LLM_API_KEY，已使用规则解析。'
      showToast(msg, llmConfigured === true ? 'error' : 'success')
    } else if (source === 'llm') {
      showToast('AI 解析完成', 'success')
    }
  }

  const confirmDemoIfNeeded = async (source?: 'llm' | 'demo') => {
    if (source !== 'demo') return true
    return confirm({
      title: '演示模式确认',
      message:
        llmConfigured === true
          ? '大模型已配置但本次未成功调用，结果为规则解析/模板，可能缺少要点与答案。是否继续查看预览？'
          : '当前未配置 LLM，结果为规则解析/模板，可能缺少要点与答案。是否继续查看预览？',
      confirmLabel: '继续预览',
      cancelLabel: '取消',
    })
  }

  const applyTruncateMeta = (truncated?: boolean, originalLength?: number) => {
    if (truncated && originalLength) {
      setTruncateHint(
        `原文共 ${originalLength.toLocaleString()} 字，仅前 8,000 字参与 AI 解析。建议分段粘贴或拆分文件。`,
      )
    } else {
      setTruncateHint(null)
    }
  }

  const mapToParsed = useCallback(
    (items: Omit<ParsedQ, 'selected'>[]): ParsedQ[] =>
      items.map((q) => ({ ...q, selected: true, category: q.category ?? category })),
    [category],
  )

  const enterMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setTruncateHint(null)
    setExtractedFallback(null)
    setQuestions([])
    setParseSource(null)
  }

  const handlePaste = async () => {
    if (pasteText.length < 50) {
      setError('文本太短（至少 50 字符）')
      return
    }
    setProcessing(true)
    setError(null)
    setExtractedFallback(null)
    setScanErrorCode(null)
    try {
      const r = await api.parseTextToQuestions(pasteText, category)
      if (!(await confirmDemoIfNeeded(r.source))) return
      applyTruncateMeta(r.truncated, r.originalLength)
      notifyParseSource(r.source)
      setQuestions(mapToParsed(r.questions))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 解析失败 — 请检查 LLM_API_KEY 配置')
    } finally {
      setProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('请选择文件')
      return
    }
    if (uploadFile.size > IMPORT_MAX_MB * 1024 * 1024) {
      setError(`文件过大（最大 ${IMPORT_MAX_MB}MB）`)
      return
    }
    setProcessing(true)
    setError(null)
    setExtractedFallback(null)
    setScanErrorCode(null)
    try {
      const data = await api.uploadImportFile(uploadFile, category)
      if (!(await confirmDemoIfNeeded(data.source))) return
      applyTruncateMeta(data.truncated, data.originalLength)
      notifyParseSource(data.source)
      setQuestions(mapToParsed(data.questions))
      setError(null)
    } catch (e) {
      if (e instanceof ImportUploadError) {
        if (e.extractedText) setExtractedFallback(e.extractedText)
        if (e.code === SCANNED_PDF_CODE) setScanErrorCode(SCANNED_PDF_CODE)
      }
      setError(e instanceof Error ? e.message : '上传解析失败')
    } finally {
      setProcessing(false)
    }
  }

  const handleAiGen = async () => {
    if (!genTitle.trim()) {
      setError('请输入题目标题')
      return
    }
    setGenerating(true)
    setError(null)
    setTruncateHint(null)
    setExtractedFallback(null)
    try {
      const r = await api.generateQuestionContent(genTitle.trim(), category, difficulty)
      if (!(await confirmDemoIfNeeded(r.source))) return
      notifyParseSource(r.source)
      setQuestions([
        {
          title: genTitle.trim(),
          content: r.content,
          difficulty,
          type: '基础',
          tags: [],
          keyPoints: r.keyPoints,
          referenceAnswer: r.referenceAnswer,
          scoringRubric: r.scoringRubric,
          followUpTemplates: r.followUpTemplates,
          status: 'draft',
          category,
          selected: true,
        },
      ])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const addQuick = () => setQuickRows((p) => [...p, { title: '', content: '', tags: '' }])
  const updQuick = (i: number, d: Partial<(typeof quickRows)[0]>) =>
    setQuickRows((p) => p.map((r, j) => (j === i ? { ...r, ...d } : r)))
  const delQuick = (i: number) => setQuickRows((p) => p.filter((_, j) => j !== i))

  const handleQuickPreview = () => {
    const valid = quickRows.filter((q) => q.title.trim() && q.content.trim())
    if (!valid.length) {
      setError('至少填写一题')
      return
    }
    setError(null)
    setTruncateHint(null)
    setQuestions(
      valid.map((q) => ({
        title: q.title.trim(),
        content: q.content.trim(),
        category,
        difficulty,
        type,
        tags: q.tags
          .split(/[,，、]/)
          .map((t) => t.trim())
          .filter(Boolean),
        keyPoints: [],
        referenceAnswer: '',
        scoringRubric: '',
        followUpTemplates: [],
        status: 'draft',
        selected: true,
      })),
    )
  }

  const toggleQ = (i: number) =>
    setQuestions((p) => p.map((q, j) => (j === i ? { ...q, selected: !q.selected } : q)))

  const toggleAll = (selected: boolean) =>
    setQuestions((p) => p.map((q) => ({ ...q, selected })))

  const enrichSelected = async () => {
    const targets = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.selected && questionNeedsEnrich(q))
    if (!targets.length) {
      showToast('选中的题目已完整，无需补全', 'success')
      return
    }
    if (llmConfigured === false) {
      setError('未配置 LLM，无法 AI 补全缺项')
      return
    }
    setEnriching(true)
    setError(null)
    let enriched = 0
    try {
      for (const { q, i } of targets) {
        const r = await api.generateQuestionContent(
          q.title,
          q.category || category,
          q.difficulty || difficulty,
        )
        if (enriched === 0 && !(await confirmDemoIfNeeded(r.source))) return
        notifyParseSource(r.source)
        setQuestions((prev) =>
          prev.map((item, j) => {
            if (j !== i) return item
            const merged = {
              ...item,
              content: item.content?.trim() ? item.content : r.content,
              keyPoints: item.keyPoints?.length ? item.keyPoints : r.keyPoints,
              referenceAnswer: item.referenceAnswer?.trim()
                ? item.referenceAnswer
                : r.referenceAnswer,
              scoringRubric: item.scoringRubric?.trim() ? item.scoringRubric : r.scoringRubric,
              followUpTemplates: item.followUpTemplates?.length
                ? item.followUpTemplates
                : r.followUpTemplates,
            }
            return { ...merged, warnings: computeQuestionWarnings(merged) }
          }),
        )
        enriched++
      }
      showToast(`已 AI 补全 ${enriched} 题`, 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 补全失败')
    } finally {
      setEnriching(false)
    }
  }

  const importSelected = async () => {
    const sel = questions.filter((q) => q.selected)
    if (!sel.length) return
    setImporting(true)
    setError(null)
    try {
      const r = await api.batchImportQuestions(
        sel.map(({ selected: _, warnings: __, ...q }) => ({
          ...q,
          category: q.category || category,
          type: q.type || type,
          tags: q.tags || [],
          status: 'draft' as const,
        })),
        false,
      )
      const msg = formatImportSummary(r.summary)
      const hasIssue = r.summary.skipped > 0 || r.summary.failed > 0
      const created = r.results.filter((x) => x.status === 'created')
      const incompleteCount = created.filter((x) => (x.warnings?.length ?? 0) > 0).length

      if (r.summary.created > 0) {
        setLastImportResult({ summary: r.summary, incompleteCount })
      }

      showToast(
        hasIssue ? `${msg}。可在题库管理查看草稿。` : `${msg}，已保存为草稿。`,
        hasIssue ? 'error' : 'success',
        r.summary.created > 0
          ? {
              action: {
                label: '去题库管理',
                to: incompleteCount > 0 ? '/admin/manage?status=draft' : '/admin/manage',
              },
            }
          : undefined,
      )
      if (r.summary.created > 0) {
        setQuestions((prev) =>
          prev.filter((q) => {
            if (!q.selected) return true
            const hit = r.results.find((x) => x.title === q.title && x.status === 'created')
            return !hit
          }),
        )
        if (mode === 'paste') setPasteText('')
        if (mode === 'quick') setQuickRows([{ title: '', content: '', tags: '' }])
      }
      const skipped = r.results.filter((x) => x.status === 'skipped')
      if (skipped.length > 0) {
        setError(skipped.map((s) => `「${s.title}」：${s.error}`).join('\n'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '入库失败')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setMode(null)
    setError(null)
    setQuestions([])
    setPasteText('')
    setUploadFile(null)
    setQuickRows([{ title: '', content: '', tags: '' }])
    setGenTitle('')
    setTruncateHint(null)
    setExtractedFallback(null)
    setParseSource(null)
    setScanErrorCode(null)
    setLastImportResult(null)
  }

  const inputCls = `${adminCx.input} w-full`
  const textareaCls = `${adminCx.textarea} w-full`
  const selectedCount = questions.filter((q) => q.selected).length
  const enrichableCount = questions.filter((q) => q.selected && questionNeedsEnrich(q)).length

  const modeCards = [
    {
      id: 'paste' as const,
      icon: Clipboard,
      title: '粘贴文本',
      desc: '粘贴面经、技术文档、PDF 转换文本，AI 自动提取结构化题目',
      accent: 'text-[var(--color-admin-brand)]',
      bg: 'bg-[var(--color-admin-brand-light)]',
    },
    {
      id: 'upload' as const,
      icon: FileUp,
      title: '上传文件',
      desc: '上传 PDF / TXT / MD，自动提取文本并 AI 解析',
      accent: 'text-[var(--color-admin-accent)]',
      bg: 'bg-[var(--color-admin-accent-light)]',
    },
    {
      id: 'quick' as const,
      icon: Pencil,
      title: '快速录入',
      desc: '批量填写标题与内容，预览确认后入库（草稿）',
      accent: 'text-[var(--color-admin-brand)]',
      bg: 'bg-[var(--color-admin-brand-soft)]',
    },
  ]

  return (
    <div className={adminLayout.stackGap}>
      {lastImportResult && (
        <AdminSmartGuide
          variant={lastImportResult.incompleteCount > 0 ? 'warning' : 'success'}
          title={`本次导入 ${lastImportResult.summary.created} 题已存为草稿`}
          description={
            lastImportResult.incompleteCount > 0
              ? `其中 ${lastImportResult.incompleteCount} 题待补全参考答案或得分要点，建议先 AI 补全再提交审核。`
              : '题目质量完整，可在题库管理中提交审核或直接发布。'
          }
          actions={[
            {
              label: '查看草稿',
              to: '/admin/manage?status=draft',
            },
          ]}
          onDismiss={() => setLastImportResult(null)}
        />
      )}

      {llmConfigured === false && (
        <div className={`flex items-start gap-2 px-4 py-3 ${adminAlertCx.warning}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-sm">
            <p className="font-medium">未配置 LLM（演示模式）</p>
            <p className="mt-1 text-xs opacity-90">
              粘贴/上传将使用规则提取题目；AI 快捷生成使用模板内容。配置{' '}
              <code className="rounded bg-admin-surface-alt px-1">mianshi-api/.env</code> 中{' '}
              <code className="rounded bg-admin-surface-alt px-1">LLM_API_KEY</code> 并重启 API 后可启用完整 AI。
            </p>
          </div>
        </div>
      )}

      {llmConfigured === true && llmReachable === false && (
        <div className={`flex items-start gap-2 px-4 py-3 ${adminAlertCx.error}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">大模型已配置但当前不可达</p>
            <p className="mt-1 text-xs opacity-90">
              请检查 API 密钥、额度与网络；导入将降级为规则解析。查看 API 控制台{' '}
              <code className="rounded bg-admin-surface-alt px-1">[LLM Gateway]</code> 日志。
            </p>
          </div>
        </div>
      )}

      {llmConfigured === true && llmReachable === true && (
        <div className={`flex items-start gap-2 px-4 py-2.5 ${adminAlertCx.success}`}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">
            大模型<strong className="font-medium">已连接</strong>，AI 解析与生成可用。
          </p>
        </div>
      )}

      {parseSource === 'demo' && questions.length > 0 && (
        <div className={`flex items-start gap-2 px-4 py-2.5 ${adminAlertCx.warning}`}>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">
            {llmConfigured === true ? (
              <>
                大模型<strong className="font-medium">已配置</strong>，但本次未成功调用（密钥无效、额度或网络问题），已降级为规则解析。请检查
                API 控制台日志，或重启 <code className="rounded bg-admin-surface-alt px-1">mianshi-api</code>。
              </>
            ) : (
              <>
                当前<strong className="font-medium">未配置 LLM_API_KEY</strong>，结果为规则解析/模板生成。导入后请在题库管理中补全答案与要点。
              </>
            )}
          </p>
        </div>
      )}

      {!mode ? (
        <AdminPageToolbar />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <AdminPageToolbar />
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-sm text-admin-muted hover:text-admin-text"
          >
            ← 返回选择
          </button>
        </div>
      )}

      {!mode && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {modeCards.map(({ id, icon: Icon, title, desc, accent, bg }) => (
              <button
                key={id}
                type="button"
                onClick={() => enterMode(id)}
                className="cursor-pointer rounded-lg border border-admin-border bg-admin-surface p-6 text-left transition hover:bg-admin-surface-alt"
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg ${bg}`}
                  >
                    <Icon className={`h-7 w-7 ${accent}`} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-admin-text">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-admin-text-secondary">{desc}</p>
                  <span className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${accent}`}>
                    开始使用 <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <AdminCard title="AI 快捷生成（输入标题即生成完整题目）">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <input
                  className={inputCls}
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="输入题目标题，如「JVM 垃圾回收机制详解」"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !generating) void handleAiGen()
                  }}
                />
              </div>
              <div className="w-[110px]">
                <AdminSelect value={category} onChange={setCategory}>
                  {ADMIN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div className="w-[90px]">
                <AdminSelect value={difficulty} onChange={setDifficulty}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <AdminButton onClick={handleAiGen} disabled={generating || processing}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? '生成中...' : 'AI 生成'}
              </AdminButton>
            </div>
          </AdminCard>
        </>
      )}

      {mode === 'paste' && (
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-[140px]">
              <label className="mb-1 block text-[11px] font-medium text-admin-text-secondary">
                方向
              </label>
              <AdminSelect value={category} onChange={setCategory}>
                {ADMIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <AdminButton onClick={handlePaste} disabled={processing || pasteText.length < 50}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {processing ? 'AI 解析中...' : '开始解析'}
            </AdminButton>
            <span className="text-xs text-admin-muted">{pasteText.length} 字</span>
          </div>
          <textarea
            className={textareaCls}
            rows={14}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="在此粘贴要解析的文本..."
          />
        </AdminCard>
      )}

      {mode === 'upload' && (
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-[140px]">
              <label className="mb-1 block text-[11px] font-medium text-admin-text-secondary">
                方向
              </label>
              <AdminSelect value={category} onChange={setCategory}>
                {ADMIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </div>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-admin-border/60 bg-admin-surface/30 px-6 py-10 transition hover:border-[var(--color-admin-brand)]/40"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) setUploadFile(f)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setUploadFile(f)
              }}
            />
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--color-admin-brand-light)]">
              <FileUp className="h-8 w-8 text-[var(--color-admin-brand)]" />
            </div>
            <h3 className="text-lg font-bold text-admin-text">
              {uploadFile ? uploadFile.name : '点击选择文件或拖拽到此处'}
            </h3>
            <p className="mt-1.5 text-sm text-admin-text-secondary">
              {uploadFile
                ? `${(uploadFile.size / 1024).toFixed(1)} KB · 最大 ${IMPORT_MAX_MB}MB`
                : `支持 PDF · TXT · Markdown · 最大 ${IMPORT_MAX_MB}MB`}
            </p>
          </div>
          {uploadFile && (
            <div className="mt-4 flex justify-end">
              <AdminButton onClick={handleUpload} disabled={processing}>
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {processing ? 'AI 解析中...' : '开始解析'}
              </AdminButton>
            </div>
          )}
        </AdminCard>
      )}

      {mode === 'quick' && (
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-[120px]">
              <label className="mb-1 block text-[11px] font-medium text-admin-text-secondary">
                方向
              </label>
              <AdminSelect value={category} onChange={setCategory}>
                {ADMIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div className="w-[100px]">
              <label className="mb-1 block text-[11px] font-medium text-admin-text-secondary">
                难度
              </label>
              <AdminSelect value={difficulty} onChange={setDifficulty}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div className="w-[100px]">
              <label className="mb-1 block text-[11px] font-medium text-admin-text-secondary">
                题型
              </label>
              <AdminSelect value={type} onChange={setType}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <AdminButton size="sm" variant="secondary" onClick={addQuick}>
              ＋ 添加一行
            </AdminButton>
          </div>
          <div className="max-h-[500px] space-y-3 overflow-y-auto">
            {quickRows.map((q, i) => (
              <div
                key={`quick-${i}`}
                className="flex items-start gap-2 rounded-lg border border-admin-border/60 bg-admin-surface/50 p-3"
              >
                <span className="mt-2.5 w-6 shrink-0 text-center text-xs text-admin-muted">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    className={`${adminCx.input} w-full`}
                    value={q.title}
                    onChange={(e) => updQuick(i, { title: e.target.value })}
                    placeholder="标题（必填）"
                  />
                  <textarea
                    className={`${adminCx.textarea} w-full`}
                    rows={2}
                    value={q.content}
                    onChange={(e) => updQuick(i, { content: e.target.value })}
                    placeholder="内容（必填）"
                  />
                  <input
                    className={`${adminCx.input} w-full`}
                    value={q.tags}
                    onChange={(e) => updQuick(i, { tags: e.target.value })}
                    placeholder="标签：JVM, GC（逗号分隔）"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => delQuick(i)}
                  className="mt-1 text-admin-muted hover:text-danger"
                  aria-label="删除行"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-admin-muted">
              {quickRows.filter((r) => r.title.trim() && r.content.trim()).length} 道有效
            </span>
            <AdminButton onClick={handleQuickPreview} disabled={processing}>
              预览待导入题目
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {truncateHint && (
        <div className={`flex items-start gap-2 px-4 py-3 ${adminAlertCx.warning}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">{truncateHint}</p>
        </div>
      )}

      {extractedFallback && (
        <AdminCard title="已提取文本（可编辑后规则解析）">
          <textarea
            className={textareaCls}
            rows={8}
            value={extractedFallback}
            onChange={(e) => setExtractedFallback(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminButton
              size="sm"
              onClick={async () => {
                if ((extractedFallback?.length ?? 0) < 50) {
                  setError('文本至少 50 字')
                  return
                }
                setProcessing(true)
                setError(null)
                try {
                  const r = await api.parseTextToQuestions(extractedFallback, category)
                  applyTruncateMeta(r.truncated, r.originalLength)
                  notifyParseSource(r.source)
                  setQuestions(mapToParsed(r.questions))
                } catch (e) {
                  setError(e instanceof Error ? e.message : '规则解析失败')
                } finally {
                  setProcessing(false)
                }
              }}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              规则解析此文本
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                setPasteText(extractedFallback)
                enterMode('paste')
              }}
            >
              转到粘贴文本
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {error && (
        <div className={`px-4 py-3 ${adminAlertCx.error}`}>
          <p className="whitespace-pre-wrap text-sm font-medium">{error}</p>
          {(error.includes('AI') || error.includes('LLM')) && llmConfigured !== false && (
            <p className="mt-1 text-xs opacity-90">
              请检查 mianshi-api/.env 中 LLM_API_KEY 是否正确配置且额度充足；也可使用上方规则解析。
            </p>
          )}
        </div>
      )}

      {scanErrorCode === SCANNED_PDF_CODE && (
        <ScannedPdfGuide compact />
      )}

      {questions.length > 0 && (
        <AdminCard>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-admin-text">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-admin-brand" />
              预览 · {questions.length} 题（选中 {selectedCount}）
            </h3>
            <div className="flex flex-wrap gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => toggleAll(true)}>
                全选
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => toggleAll(false)}>
                全不选
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => setQuestions([])}>
                清除
              </AdminButton>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={enrichSelected}
                disabled={enriching || enrichableCount === 0 || llmConfigured === false}
              >
                {enriching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                AI 补全缺项 ({enrichableCount})
              </AdminButton>
              <AdminButton
                size="sm"
                onClick={importSelected}
                disabled={importing || selectedCount === 0}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                导入选中 ({selectedCount})
              </AdminButton>
            </div>
          </div>
          <p className="mb-3 text-xs text-admin-muted">
            导入后保存为草稿。完善质量字段后可在
            <Link to="/admin/manage" className="mx-1 text-admin-brand hover:underline">
              题库管理
            </Link>
            中提交审核或发布。
          </p>
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {questions.map((q, i) => (
              <div
                key={`${q.title}-${i}`}
                className={`rounded-lg border p-3 transition ${
                  q.selected
                    ? 'border-admin-brand/30 bg-admin-brand-light/5'
                    : 'border-admin-border/50 opacity-55'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleQ(i)}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      q.selected
                        ? 'border-admin-brand bg-admin-brand text-white'
                        : 'border-admin-border bg-white'
                    }`}
                    aria-label={q.selected ? '取消选中' : '选中'}
                  >
                    {q.selected && <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-admin-text">{q.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-admin-text-secondary">
                      {q.content}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded bg-admin-surface px-1.5 py-0.5 text-[10px] text-admin-muted">
                        {q.category ?? category}
                      </span>
                      <span className="rounded bg-admin-surface px-1.5 py-0.5 text-[10px] text-admin-muted">
                        {q.difficulty}
                      </span>
                      <span className="rounded bg-admin-surface px-1.5 py-0.5 text-[10px] text-admin-muted">
                        {q.type}
                      </span>
                      {(q.tags || []).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-admin-brand-light/30 px-1.5 py-0.5 text-[10px] text-admin-brand"
                        >
                          {t}
                        </span>
                      ))}
                      {(q.keyPoints?.length ?? 0) > 0 ? (
                        <span className="rounded border border-emerald-900/40 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          ✓ {(q.keyPoints ?? []).length} 要点
                        </span>
                      ) : (
                        <span className="rounded border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                          缺要点
                        </span>
                      )}
                      {q.referenceAnswer ? (
                        <span className="rounded border border-emerald-900/40 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          ✓ 答案
                        </span>
                      ) : (
                        <span className="rounded border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                          缺答案
                        </span>
                      )}
                      {(q.warnings?.length ?? 0) > 0 && (
                        <span
                          className="rounded border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300"
                          title={q.warnings?.join(' · ')}
                        >
                          ⚠ {q.warnings?.length} 项待补
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
    </div>
  )
}

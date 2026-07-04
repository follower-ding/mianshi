import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Clipboard,
  Eraser,
  FileSearch,
  Loader2,
  Upload,
  Wand2,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { RESUME_UPLOAD_MAX_BYTES, SCANNED_PDF_CODE } from '../../api/client'
import { pastePlainText, stripRichText } from './resumeStripHtml'
import { ResumeLlmBanner } from './ResumeLlmBanner'
import { ScannedPdfGuide } from './ScannedPdfGuide'
import { resumeUi } from './resumeLayout'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../ui/Button'
import {
  ImportParseCompareModal,
  type ParseComparePayload,
} from './ImportParseCompareModal'
import {
  SectionOptimizeCompareModal,
  type OptimizeComparePayload,
} from './SectionOptimizeCompareModal'

type WizardStep = 1 | 2 | 3

type ImportWizardProps = {
  pasteText: string
  setPasteText: (t: string) => void
  jobs: import('../../api/client').JobPosting[]
  selectedJobId: string
  setSelectedJobId: (id: string) => void
  extracting: boolean
  parsing: boolean
  optimizing: boolean
  onExtractFile: (file: File) => Promise<boolean>
  onFetchParseCompare: () => Promise<ParseComparePayload | null>
  onApplyParseCompare: (payload: ParseComparePayload) => Promise<void>
  onFullOptimize: () => Promise<OptimizeComparePayload | null>
  onApplyOptimizeCompare: (payload: OptimizeComparePayload) => Promise<void>
  success?: string | null
  extractErrorCode?: string | null
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: '上传或粘贴原文' },
  { id: 2, label: '确认提取文本' },
  { id: 3, label: '识别对照并应用' },
]

export function ImportWizard({
  pasteText,
  setPasteText,
  jobs,
  selectedJobId,
  setSelectedJobId,
  extracting,
  parsing,
  optimizing,
  onExtractFile,
  onFetchParseCompare,
  onApplyParseCompare,
  onFullOptimize,
  onApplyOptimizeCompare,
  success,
  extractErrorCode,
}: ImportWizardProps) {
  const { showToast } = useToast()
  const [step, setStep] = useState<WizardStep>(1)
  const [parseCompareOpen, setParseCompareOpen] = useState(false)
  const [parsePayload, setParsePayload] = useState<ParseComparePayload | null>(null)
  const [optimizeCompareOpen, setOptimizeCompareOpen] = useState(false)
  const [optimizePayload, setOptimizePayload] = useState<OptimizeComparePayload | null>(null)
  const [applying, setApplying] = useState(false)
  const [slowHint, setSlowHint] = useState(false)

  const textOk = pasteText.trim().length >= 30
  const busy = extracting || parsing || optimizing

  useEffect(() => {
    if (!busy) {
      setSlowHint(false)
      return
    }
    const t = window.setTimeout(() => setSlowHint(true), 8000)
    return () => window.clearTimeout(t)
  }, [busy])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > RESUME_UPLOAD_MAX_BYTES) {
      showToast(`文件超过 ${RESUME_UPLOAD_MAX_BYTES / 1024 / 1024}MB 上限，请压缩后重试`, 'error')
      return
    }
    const ok = await onExtractFile(f)
    if (ok) setStep(2)
  }

  const onStartParse = async () => {
    const payload = await onFetchParseCompare()
    if (payload) {
      setParsePayload(payload)
      setParseCompareOpen(true)
      setStep(3)
    }
  }

  const onApplyParse = async () => {
    if (!parsePayload) return
    setApplying(true)
    try {
      await onApplyParseCompare(parsePayload)
      setParseCompareOpen(false)
      setParsePayload(null)
    } finally {
      setApplying(false)
    }
  }

  const onRunFullOptimize = async () => {
    const payload = await onFullOptimize()
    if (payload) {
      setOptimizePayload(payload)
      setOptimizeCompareOpen(true)
    }
  }

  const onApplyOptimize = async () => {
    if (!optimizePayload) return
    setApplying(true)
    try {
      await onApplyOptimizeCompare(optimizePayload)
      setOptimizeCompareOpen(false)
      setOptimizePayload(null)
    } finally {
      setApplying(false)
    }
  }

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className={resumeUi.wizardInner}>
        <div className="text-center lg:text-left">
          <p className="text-lg font-semibold text-text">导入并智能识别简历</p>
          <p className="mt-1 text-sm text-text-secondary">
            先确认提取的<strong className="text-text">原文</strong>，再 AI 结构化识别并
            <strong className="text-text">对照确认</strong>后进入排版（智能识别 + 重新排版，非 PDF 一比一还原）
          </p>
        </div>

        <div className="mt-4">
          <ResumeLlmBanner />
        <p className="mt-2 text-xs text-muted">
          <Link to="/resume/help#import" className="inline-flex items-center gap-1 text-brand hover:underline">
            <HelpCircle className="h-3.5 w-3.5" /> 导入说明与演示模式
          </Link>
        </p>
        </div>

        {extractErrorCode === SCANNED_PDF_CODE && (
          <div className="mt-4">
            <ScannedPdfGuide />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                step >= s.id ? 'bg-brand/15 text-brand' : 'bg-elevated/60 text-muted'
              }`}
            >
              {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              {s.label}
            </div>
          ))}
        </div>

        <div className={`${resumeUi.card} relative mt-5 space-y-3`}>
          {busy && !parseCompareOpen && !optimizeCompareOpen && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-panel/85 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="mt-3 text-sm font-medium text-text">
                {extracting ? '正在提取文件文本…' : parsing ? '正在智能识别…' : 'AI 正在优化…'}
              </p>
              {slowHint && (
                <p className="mt-2 max-w-xs text-center text-xs text-muted">
                  大简历识别可能需要 1–2 分钟，请耐心等待…
                </p>
              )}
            </div>
          )}

          {(step === 1 || step === 2) && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => document.getElementById('resume-import-upload')?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> 上传 PDF / DOCX / TXT
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pasteText.trim() || busy}
                  onClick={() => setPasteText(stripRichText(pasteText))}
                >
                  <Eraser className="h-3.5 w-3.5" /> 清除富文本样式
                </Button>
                <input
                  id="resume-import-upload"
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,.docx"
                  className="hidden"
                  aria-label="上传简历文件 PDF DOCX TXT"
                  onChange={onFileChange}
                />
              </div>

              {jobs.length > 0 && (
                <div>
                  <label className={resumeUi.label}>定向 JD（全文优化可选）</label>
                  <select
                    className={resumeUi.input}
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">通用全文优化</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.company} · {j.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label htmlFor="resume-import-text" className={resumeUi.label}>
                简历原文
              </label>
              <textarea
                id="resume-import-text"
                className={`${resumeUi.input} min-h-[260px] resize-y text-sm leading-relaxed`}
                placeholder="粘贴完整简历正文，或上传文件后在此核对提取结果…"
                aria-label="简历原文文本框"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                disabled={busy}
                onPaste={(e) => {
                  const cleaned = pastePlainText(e)
                  if (cleaned != null) {
                    const ta = e.currentTarget
                    const start = ta.selectionStart
                    const end = ta.selectionEnd
                    setPasteText(pasteText.slice(0, start) + cleaned + pasteText.slice(end))
                  }
                }}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {step === 1 && textOk && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStep(2)}>
                    <ChevronRight className="h-4 w-4" /> 下一步：确认原文
                  </Button>
                )}
                {step === 2 && (
                  <>
                    <Button disabled={busy || !textOk} onClick={onStartParse}>
                      {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                      开始智能识别
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || !textOk}
                      onClick={onRunFullOptimize}
                    >
                      {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      AI 全文优化（对比后应用）
                    </Button>
                  </>
                )}
                {step === 1 && !textOk && (
                  <p className="text-xs text-muted">至少 30 字后可继续</p>
                )}
              </div>
            </>
          )}

          {step === 3 && !parseCompareOpen && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-text-secondary">对照弹窗已关闭。可重新识别或优化。</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStep(2)}>
                  返回确认原文
                </Button>
                <Button size="sm" disabled={!textOk || busy} onClick={onStartParse}>
                  <Clipboard className="h-4 w-4" /> 重新识别
                </Button>
              </div>
            </div>
          )}

          {success && <p className="text-xs text-success">{success}</p>}

          <p className="text-[11px] text-muted">
            排版编辑中可对单个模块 AI 优化，同样支持优化前后对比再替换。
          </p>
        </div>
      </div>

      <ImportParseCompareModal
        open={parseCompareOpen}
        payload={parsePayload}
        applying={applying}
        onClose={() => {
          setParseCompareOpen(false)
          setParsePayload(null)
        }}
        onApply={onApplyParse}
        onCopy={onCopy}
      />

      <SectionOptimizeCompareModal
        open={optimizeCompareOpen}
        payload={optimizePayload}
        applying={applying}
        onClose={() => {
          setOptimizeCompareOpen(false)
          setOptimizePayload(null)
        }}
        onApply={onApplyOptimize}
        onCopy={onCopy}
      />
    </>
  )
}

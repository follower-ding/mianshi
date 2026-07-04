import { useRef } from 'react'
import { Clipboard, Eraser, Loader2, Upload, Wand2 } from 'lucide-react'
import type { JobPosting } from '../../api/client'
import { pastePlainText, stripRichText } from './resumeStripHtml'
import { resumeUi } from './resumeLayout'
import { Button } from '../ui/Button'

type Props = {
  pasteText: string
  onPasteTextChange: (v: string) => void
  jobs: JobPosting[]
  selectedJobId: string
  onJobChange: (id: string) => void
  processing: boolean
  optimizing: boolean
  onUpload: (file: File) => void
  onParse: () => void
  onOptimize: () => void
  optimizeSummary?: string
}

export function ResumeOptimizePanel({
  pasteText,
  onPasteTextChange,
  jobs,
  selectedJobId,
  onJobChange,
  processing,
  optimizing,
  onUpload,
  onParse,
  onOptimize,
  optimizeSummary,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className={resumeUi.sideNavSection}>
      <p className="mb-1 text-xs font-semibold text-text">快速优化</p>
      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        粘贴或上传简历，自动清除富文本样式后 AI 优化
      </p>

      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={processing} onClick={() => fileRef.current?.click()}>
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          上传
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!pasteText.trim()}
          onClick={() => onPasteTextChange(stripRichText(pasteText))}
        >
          <Eraser className="h-3.5 w-3.5" /> 清除样式
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      {jobs.length > 0 && (
        <div className="mb-2">
          <label className={resumeUi.label}>定向 JD</label>
          <select
            className={resumeUi.input}
            value={selectedJobId}
            onChange={(e) => onJobChange(e.target.value)}
          >
            <option value="">通用优化</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} · {j.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <textarea
        className={`${resumeUi.input} mb-3 min-h-[100px] resize-y text-xs leading-relaxed`}
        placeholder="粘贴简历文本… 支持自动清除 HTML 样式"
        value={pasteText}
        onChange={(e) => onPasteTextChange(e.target.value)}
        onPaste={(e) => {
          const cleaned = pastePlainText(e)
          if (cleaned != null) {
            const ta = e.currentTarget
            const start = ta.selectionStart
            const end = ta.selectionEnd
            onPasteTextChange(pasteText.slice(0, start) + cleaned + pasteText.slice(end))
          }
        }}
      />

      <div className="flex flex-col gap-2">
        <Button size="sm" disabled={optimizing || processing} onClick={onOptimize}>
          {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          AI 一键优化
        </Button>
        <Button variant="secondary" size="sm" disabled={processing} onClick={onParse}>
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
          解析到编辑器
        </Button>
      </div>

      {optimizeSummary && (
        <div className="mt-4 rounded-xl border border-brand/25 bg-brand/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">优化亮点摘要</p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{optimizeSummary}</p>
        </div>
      )}
    </div>
  )
}

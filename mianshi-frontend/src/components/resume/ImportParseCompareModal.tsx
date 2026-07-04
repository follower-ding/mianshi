import { Check, Copy, X, AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ResumeSourceBadge } from './ResumeSourceBadge'
import type { ResumeContent, ResumeFieldCoverageItem } from '../../api/client'

export type ParseComparePayload = {
  beforeText: string
  afterText: string
  merged: ResumeContent
  source: 'llm' | 'demo'
  fieldCoverage?: ResumeFieldCoverageItem[]
}

type Props = {
  open: boolean
  payload: ParseComparePayload | null
  applying?: boolean
  onClose: () => void
  onApply: () => void
  onCopy: (text: string) => void
}

function coverageClass(status: ResumeFieldCoverageItem['status']) {
  if (status === 'ok') return 'border-green-500/30 bg-green-500/10 text-green-200'
  if (status === 'low') return 'border-amber-500/40 bg-amber-500/12 text-amber-100'
  return 'border-red-500/40 bg-red-500/10 text-red-200'
}

function coverageLabel(status: ResumeFieldCoverageItem['status']) {
  if (status === 'ok') return '已识别'
  if (status === 'low') return '低置信度'
  return '未识别'
}

function FieldCoveragePanel({ items }: { items: ResumeFieldCoverageItem[] }) {
  const missing = items.filter((i) => i.status === 'missing').length
  const low = items.filter((i) => i.status === 'low').length

  return (
    <div className="mb-3 rounded-xl border border-border/60 bg-panel/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-text">字段识别覆盖率</span>
        {missing > 0 && (
          <span className="rounded-md border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-red-200">
            {missing} 项未识别
          </span>
        )}
        {low > 0 && (
          <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-amber-100">
            {low} 项低置信度
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.key}
            title={item.hint ?? item.label}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${coverageClass(item.status)}`}
          >
            {item.status !== 'ok' && <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" />}
            {item.label}
            <span className="opacity-75">· {coverageLabel(item.status)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ComparePane({ title, text, variant }: { title: string; text: string; variant: 'before' | 'after' }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-panel">
      <div
        className={`shrink-0 border-b px-3 py-2 text-xs font-semibold ${
          variant === 'before' ? 'border-border/50 text-muted' : 'border-brand/20 bg-brand/5 text-brand'
        }`}
      >
        {title}
      </div>
      <pre className="min-h-[200px] flex-1 overflow-y-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed text-text">
        {text || '（空）'}
      </pre>
    </div>
  )
}

export function ImportParseCompareModal({
  open,
  payload,
  applying,
  onClose,
  onApply,
  onCopy,
}: Props) {
  if (!payload) return null

  const coverage = payload.fieldCoverage ?? []
  const hasIssues = coverage.some((i) => i.status !== 'ok')

  return (
    <Modal open={open} onClose={onClose} title="智能识别结果 — 确认后应用" maxWidth="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ResumeSourceBadge source={payload.source} />
        <span className="text-xs text-muted">智能识别内容并重新排版，非 PDF 版式一比一还原</span>
      </div>

      {payload.source === 'demo' && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          当前为<strong className="font-medium">演示模式</strong>，识别结果为规则模板，可能与原文差异较大。
          配置 <code className="rounded bg-black/20 px-1">LLM_API_KEY</code> 后可获得更准确的 AI 识别，或确认后手动修改字段。
        </p>
      )}

      {coverage.length > 0 && <FieldCoveragePanel items={coverage} />}

      {hasIssues && (
        <p className="mb-3 text-xs text-muted">
          <span className="text-red-300">红色</span> = 未从原文识别；
          <span className="text-amber-300"> 琥珀色</span> = 模板/占位，导入后请在编辑页补全。
        </p>
      )}

      <div className="flex max-h-[50vh] flex-col gap-3 sm:flex-row">
        <ComparePane title="原文（提取/粘贴）" text={payload.beforeText} variant="before" />
        <ComparePane title="结构化识别" text={payload.afterText} variant="after" />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={applying}>
          <X className="h-4 w-4" /> 取消
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onCopy(payload.afterText)} disabled={applying}>
          <Copy className="h-4 w-4" /> 复制识别结果
        </Button>
        <Button size="sm" disabled={applying} onClick={onApply}>
          <Check className="h-4 w-4" /> {applying ? '应用中…' : '确认应用并进入排版'}
        </Button>
      </div>
    </Modal>
  )
}

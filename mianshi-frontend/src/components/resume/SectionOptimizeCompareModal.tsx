import { useMemo } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { ResumeContent } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { contentToPlainText, pickSectionContent } from './resumeUtils'
import { SECTION_LABELS, type ResumeSectionKey } from './resumeSections'
import { ResumeSourceBadge } from './ResumeSourceBadge'

export type OptimizeComparePayload = {
  kind: 'full' | 'section'
  section?: ResumeSectionKey
  before: ResumeContent
  beforeText: string
  after: ResumeContent
  afterText: string
  merged: ResumeContent
  summary?: string
  suggestions?: string[]
  source?: 'llm' | 'demo'
}

type Props = {
  open: boolean
  payload: OptimizeComparePayload | null
  applying?: boolean
  onClose: () => void
  onApply: () => void
  onCopy: (text: string) => void
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

export function SectionOptimizeCompareModal({
  open,
  payload,
  applying,
  onClose,
  onApply,
  onCopy,
}: Props) {
  const title = useMemo(() => {
    if (!payload) return 'AI 优化对比'
    if (payload.kind === 'full') return '全文 AI 优化 — 确认后替换'
    return `${SECTION_LABELS[payload.section!]} — AI 优化对比`
  }, [payload])

  if (!payload) return null

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {payload.source && <ResumeSourceBadge source={payload.source} />}
      </div>
      {payload.summary && (
        <p className="mb-3 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-text-secondary">
          {payload.summary}
        </p>
      )}

      <div className="flex max-h-[50vh] flex-col gap-3 sm:flex-row">
        <ComparePane title="优化前" text={payload.beforeText} variant="before" />
        <ComparePane title="AI 优化后" text={payload.afterText} variant="after" />
      </div>

      {payload.suggestions && payload.suggestions.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">
          {payload.suggestions.slice(0, 4).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={applying}>
          <X className="h-4 w-4" /> 取消
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onCopy(payload.afterText)} disabled={applying}>
          <Copy className="h-4 w-4" /> 复制优化内容
        </Button>
        <Button size="sm" disabled={applying} onClick={onApply}>
          <Check className="h-4 w-4" /> {applying ? '应用中…' : '满意，替换并应用'}
        </Button>
      </div>
    </Modal>
  )
}

export function sectionCompareTexts(
  section: ResumeSectionKey,
  before: ResumeContent,
  after: ResumeContent,
): { beforeText: string; afterText: string } {
  return {
    beforeText: contentToPlainText(pickSectionContent(before, section)),
    afterText: contentToPlainText(pickSectionContent(after, section)),
  }
}

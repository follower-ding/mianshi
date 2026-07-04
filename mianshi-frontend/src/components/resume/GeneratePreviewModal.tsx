import { Loader2 } from 'lucide-react'
import type { ResumeContent } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ProMinimalPreview } from './ProMinimalPreview'
import { ResumeSourceBadge } from './ResumeSourceBadge'
import { DEFAULT_SECTION_ORDER } from './resumeSections'

type Props = {
  open: boolean
  title: string
  content: ResumeContent
  templateId: ResumeTemplateId
  source: 'llm' | 'demo'
  applying?: boolean
  onClose: () => void
  onApply: () => void
}

export function GeneratePreviewModal({
  open,
  title,
  content,
  templateId,
  source,
  applying,
  onClose,
  onApply,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="预览生成结果" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text">{title}</p>
          <ResumeSourceBadge source={source} />
        </div>
        <p className="text-xs text-text-secondary">
          确认后将保存并进入排版编辑，你仍可修改任意字段与模板。
        </p>
        <div className="rounded-lg bg-resume-canvas/60 p-4">
          <div className="mx-auto max-w-[520px] overflow-hidden rounded-sm bg-resume-paper p-4 shadow-lg">
            <ProMinimalPreview
              content={content}
              templateId={templateId}
              sectionOrder={DEFAULT_SECTION_ORDER}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={applying}>取消</Button>
          <Button onClick={onApply} disabled={applying}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            应用并进入编辑
          </Button>
        </div>
      </div>
    </Modal>
  )
}

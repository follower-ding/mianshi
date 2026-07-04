import { Modal } from '../ui/Modal'
import { ResumeSharePanel } from './ResumeSharePanel'
import type { ResumeContent } from '../../api/client'

type Props = {
  open: boolean
  onClose: () => void
  content: ResumeContent
  resumeTitle: string
  resumeId?: string | null
  onExport: () => Promise<void>
  onBeforeShare?: () => Promise<void>
  exporting?: boolean
}

export function ResumeShareModal({
  open,
  onClose,
  content,
  resumeTitle,
  resumeId,
  onExport,
  onBeforeShare,
  exporting,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="分享与导出" maxWidth="max-w-md">
      <ResumeSharePanel
        content={content}
        resumeTitle={resumeTitle}
        resumeId={resumeId}
        onExport={onExport}
        onBeforeShare={onBeforeShare}
        exporting={exporting}
      />
    </Modal>
  )
}

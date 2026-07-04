import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RESUME_TEMPLATES, type ResumeTemplateId } from '../../lib/data'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ProMinimalPreview } from './ProMinimalPreview'
import { galleryPreviewContent, type EMPTY_RESUME_CONTENT } from './resumeUtils'
import { getTemplatePreset, settingsToPaperStyle } from './resumePreviewSettings'
import { DEFAULT_SECTION_ORDER } from './resumeSections'
import { resumeCardUi } from './resumeLayout'
import { ResumeCardPreviewFrame } from './ResumeCardPreviewFrame'
import './resume-card-preview.css'

type Props = {
  currentTemplateId: ResumeTemplateId
  onSelectTemplate: (id: ResumeTemplateId) => void
  previewContent?: typeof EMPTY_RESUME_CONTENT
}

const GALLERY_SECTION_ORDER = DEFAULT_SECTION_ORDER.filter((k) =>
  ['skills', 'education', 'experience', 'projects', 'intro'].includes(k),
)

export function ResumeTemplateGallery({
  currentTemplateId,
  onSelectTemplate,
  previewContent,
}: Props) {
  const navigate = useNavigate()
  const [previewId, setPreviewId] = useState<ResumeTemplateId | null>(null)
  const displayContent = galleryPreviewContent(previewContent)

  const useTemplate = (id: ResumeTemplateId) => {
    onSelectTemplate(id)
    setPreviewId(null)
    navigate('/resume/edit')
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
        {RESUME_TEMPLATES.map((tpl) => {
          const preset = getTemplatePreset(tpl.id)
          return (
            <article
              key={tpl.id}
              className={`group flex w-full min-w-0 flex-col overflow-hidden ${resumeCardUi.root} !w-full hover:shadow-card-hover`}
            >
              <div className={`${resumeCardUi.preview} shrink-0`}>
                <ResumeCardPreviewFrame
                  accent={preset.accentColor}
                  className="absolute inset-0"
                >
                  <ProMinimalPreview
                    content={displayContent}
                    templateId={tpl.id}
                    previewSettings={preset}
                    sectionOrder={GALLERY_SECTION_ORDER}
                  />
                </ResumeCardPreviewFrame>

                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-page/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-white"
                    onClick={() => setPreviewId(tpl.id)}
                  >
                    <Eye className="h-4 w-4" />
                    点击预览
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-full bg-gradient-to-r from-brand to-[#7c5cff] px-5 py-2 text-sm font-medium text-on-brand shadow-lg transition-transform hover:scale-[1.02]"
                    onClick={() => useTemplate(tpl.id)}
                  >
                    使用模板
                  </button>
                </div>

                {currentTemplateId === tpl.id && (
                  <span className="absolute left-2 top-2 z-20 rounded-md bg-brand px-2 py-0.5 text-[10px] font-medium text-on-brand shadow-sm">
                    当前使用
                  </span>
                )}
              </div>

              <div className={`${resumeCardUi.footer} min-h-[88px]`}>
                <h3 className="truncate text-sm font-semibold text-text">{tpl.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tpl.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-brand/12 px-2 py-0.5 text-[11px] font-medium text-brand"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Modal
        open={previewId != null}
        onClose={() => setPreviewId(null)}
        title={RESUME_TEMPLATES.find((t) => t.id === previewId)?.name ?? '模板预览'}
        maxWidth="max-w-3xl"
      >
        {previewId && (
          <div className="rounded-lg bg-resume-canvas/60 p-4">
            <div
              className="mx-auto max-w-[520px] overflow-hidden rounded-sm bg-resume-paper shadow-lg"
              style={settingsToPaperStyle(getTemplatePreset(previewId))}
            >
              <ProMinimalPreview
                content={displayContent}
                templateId={previewId}
                previewSettings={getTemplatePreset(previewId)}
                sectionOrder={GALLERY_SECTION_ORDER}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewId(null)}>
                关闭
              </Button>
              <Button size="sm" onClick={() => useTemplate(previewId)}>
                使用此模板
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

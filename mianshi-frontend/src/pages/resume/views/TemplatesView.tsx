import { useResume } from '../ResumeProvider'
import { ResumeTemplateGallery } from '../../../components/resume/ResumeTemplateGallery'
import { resumeUi } from '../../../components/resume/resumeLayout'
import { LayoutTemplate } from 'lucide-react'

export function TemplatesView() {
  const { templateId, selectTemplate, content } = useResume()

  return (
    <div className={resumeUi.moduleMain}>
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="border-b border-border/50 pb-5">
            <div className="flex items-center gap-2 text-brand">
              <LayoutTemplate className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-wider">Templates</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-text">模板画廊</h1>
            <p className="mt-1 text-sm text-text-secondary">
              共 8 套专业模板 · 示例数据预览 · 悬停可放大 · 一键应用到排版编辑
            </p>
          </header>

          <ResumeTemplateGallery
            currentTemplateId={templateId}
            onSelectTemplate={selectTemplate}
            previewContent={content}
          />
        </div>
      </div>
    </div>
  )
}

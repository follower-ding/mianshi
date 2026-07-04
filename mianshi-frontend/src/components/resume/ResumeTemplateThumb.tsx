import type { ResumeTemplateId } from '../../lib/data'

/** 模板缩略图 — 参考模板市场卡片预览 */
export function ResumeTemplateThumb({ templateId }: { templateId: ResumeTemplateId }) {
  switch (templateId) {
    case 'classic-business':
      return (
        <div className="resume-thumb resume-thumb--classic">
          <div className="resume-thumb__banner" />
          <div className="resume-thumb__body">
            <div className="resume-thumb__line w-[55%]" />
            <div className="resume-thumb__line w-[35%] opacity-60" />
            <div className="resume-thumb__section">
              <div className="resume-thumb__bar" />
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[90%]" />
            </div>
            <div className="resume-thumb__section">
              <div className="resume-thumb__bar" />
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[85%]" />
            </div>
          </div>
        </div>
      )
    case 'tech-simple':
      return (
        <div className="resume-thumb resume-thumb--tech">
          <div className="resume-thumb__side-bar" />
          <div className="resume-thumb__body !pl-3">
            <div className="resume-thumb__line w-[50%] !h-[5px]" />
            <div className="flex gap-1 pt-1">
              <span className="resume-thumb__tag" />
              <span className="resume-thumb__tag" />
              <span className="resume-thumb__tag" />
            </div>
            <div className="resume-thumb__section">
              <div className="resume-thumb__dot-title" />
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[80%]" />
            </div>
          </div>
        </div>
      )
    case 'creative-design':
      return (
        <div className="resume-thumb resume-thumb--creative">
          <div className="resume-thumb__avatar" />
          <div className="resume-thumb__body !pt-1">
            <div className="resume-thumb__line w-[45%] !h-[5px]" />
            <div className="resume-thumb__section">
              <div className="resume-thumb__dot-title" />
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[92%]" />
            </div>
            <div className="resume-thumb__section">
              <div className="resume-thumb__dot-title" />
              <div className="flex flex-wrap gap-1">
                <span className="resume-thumb__tag" />
                <span className="resume-thumb__tag" />
              </div>
            </div>
          </div>
        </div>
      )
    case 'academic-research':
      return (
        <div className="resume-thumb resume-thumb--academic">
          <div className="resume-thumb__body">
            <div className="text-center">
              <div className="resume-thumb__line mx-auto w-[40%] !h-[5px]" />
              <div className="resume-thumb__line mx-auto mt-1 w-[55%] opacity-50" />
            </div>
            <div className="resume-thumb__section border-b border-slate-200 pb-1">
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[88%]" />
            </div>
            <div className="resume-thumb__section">
              <div className="resume-thumb__line w-full" />
              <div className="resume-thumb__line w-[75%]" />
            </div>
          </div>
        </div>
      )
    case 'modern-minimal':
      return (
        <div className="resume-thumb resume-thumb--tech">
          <div className="resume-thumb__body">
            <div className="resume-thumb__line w-[42%] !h-[5px]" />
            <div className="resume-thumb__line mt-2 w-[28%] opacity-50" />
            <div className="resume-thumb__section mt-3">
              <div className="resume-thumb__bar !w-[30%]" />
              <div className="resume-thumb__line w-full" />
            </div>
          </div>
        </div>
      )
    case 'executive-pro':
      return (
        <div className="resume-thumb resume-thumb--classic">
          <div className="resume-thumb__banner !h-[18%]" />
          <div className="resume-thumb__body !pt-2">
            <div className="resume-thumb__line w-[50%]" />
            <div className="resume-thumb__section">
              <div className="resume-thumb__bar" />
              <div className="resume-thumb__line w-full" />
            </div>
          </div>
        </div>
      )
    case 'fresh-campus':
      return (
        <div className="resume-thumb resume-thumb--creative">
          <div className="resume-thumb__avatar !h-6 !w-6" />
          <div className="resume-thumb__body !pt-1">
            <div className="resume-thumb__line w-[38%] !h-[5px]" />
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="resume-thumb__tag" />
              <span className="resume-thumb__tag" />
            </div>
          </div>
        </div>
      )
    case 'data-analyst':
      return (
        <div className="resume-thumb resume-thumb--tech">
          <div className="resume-thumb__side-bar !w-[6px]" />
          <div className="resume-thumb__body !pl-2">
            <div className="resume-thumb__line w-[48%] !h-[5px]" />
            <div className="flex gap-1 pt-1">
              <span className="resume-thumb__tag !rounded-sm" />
              <span className="resume-thumb__tag !rounded-sm" />
            </div>
            <div className="resume-thumb__section">
              <div className="resume-thumb__dot-title" />
              <div className="resume-thumb__line w-[85%]" />
            </div>
          </div>
        </div>
      )
    default:
      return (
        <div className="resume-thumb resume-thumb--tech">
          <div className="resume-thumb__side-bar" />
          <div className="resume-thumb__body !pl-3">
            <div className="resume-thumb__line w-[50%] !h-[5px]" />
          </div>
        </div>
      )
  }
}

import { useEffect, useState, useDeferredValue } from 'react'
import { CheckCircle2, Pencil, Eye } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ResumeEditor } from '../../../components/resume/ResumeEditor'
import { ResumePreviewStudio } from '../../../components/resume/ResumePreviewStudio'
import { ResumeSectionSidebar } from '../../../components/resume/ResumeSectionSidebar'
import {
  SectionOptimizeCompareModal,
  type OptimizeComparePayload,
} from '../../../components/resume/SectionOptimizeCompareModal'
import { filterPreviewContent, type ResumeSectionKey } from '../../../components/resume/resumeSections'
import { resumeUi } from '../../../components/resume/resumeLayout'
import { ResumeOnboarding } from '../../../components/resume/ResumeOnboarding'
import { useResume } from '../ResumeProvider'

type MobileTab = 'edit' | 'preview'

export function EditView() {
  const location = useLocation()
  const {
    content,
    setContent,
    templateId,
    selectTemplate,
    fetchSectionOptimizeCompare,
    applyOptimizeCompare,
    optimizingSection,
    sectionOrder,
    sectionVisibility,
    previewSettings,
    setPreviewSettings,
    toggleSection,
    moveSection,
  } = useResume()

  const [activeSection, setActiveSection] = useState<ResumeSectionKey | null>('basic')
  const [scrollToSection, setScrollToSection] = useState<ResumeSectionKey | null>(null)
  const [studioFeedback, setStudioFeedback] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [comparePayload, setComparePayload] = useState<OptimizeComparePayload | null>(null)
  const [applying, setApplying] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit')

  const selectSection = (key: ResumeSectionKey) => {
    setActiveSection(key)
    setScrollToSection(key)
    setTimeout(() => setScrollToSection(null), 300)
  }

  useEffect(() => {
    const key = (location.state as { scrollToSection?: ResumeSectionKey } | null)?.scrollToSection
    if (key) selectSection(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const previewContent = filterPreviewContent(content, sectionVisibility)
  const deferredPreview = useDeferredValue(previewContent)
  const previewStale = previewContent !== deferredPreview

  const showFeedback = (msg: string) => {
    setStudioFeedback(msg)
    setTimeout(() => setStudioFeedback(null), 4500)
  }

  const onOptimizeSection = async (section: ResumeSectionKey) => {
    const payload = await fetchSectionOptimizeCompare(section)
    if (payload) {
      setComparePayload(payload)
      setCompareOpen(true)
    }
  }

  const onApplyCompare = async () => {
    if (!comparePayload) return
    setApplying(true)
    try {
      await applyOptimizeCompare(comparePayload)
      setCompareOpen(false)
      setComparePayload(null)
    } finally {
      setApplying(false)
    }
  }

  const onCopyCompare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showFeedback('已复制优化内容')
    } catch {
      showFeedback('复制失败，请手动选择文本')
    }
  }

  return (
    <div className={resumeUi.moduleMain}>
      <div className={resumeUi.editWrap}>
        {studioFeedback && (
          <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm text-success shadow-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {studioFeedback}
          </div>
        )}

        <div className={resumeUi.editBody}>
          <aside className={`${resumeUi.sideNav} ${mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
            <div className={resumeUi.sideNavScroll}>
              <div className={resumeUi.sideNavSection}>
                <p className="text-xs font-semibold text-text-secondary">模块选择</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">顺序与预览同步 · 预览区可上下调整</p>
              </div>
              <ResumeSectionSidebar
                sectionOrder={sectionOrder}
                visibility={sectionVisibility}
                onToggle={toggleSection}
                activeSection={activeSection}
                onSelect={selectSection}
              />
            </div>
          </aside>

          <section
            className={`${resumeUi.editorPane} ${mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className={resumeUi.editorHead}>
              <p className="text-sm font-medium text-text">内容编辑</p>
              <p className="text-[11px] text-muted">富文本编辑 · AI 优化可对比后再替换</p>
            </div>
            <div className={resumeUi.editorScroll}>
              <ResumeEditor
                content={content}
                onChange={setContent}
                visibleSections={sectionVisibility}
                scrollToSection={scrollToSection}
                sectionOrder={sectionOrder}
                onOptimizeSection={onOptimizeSection}
                optimizingSection={optimizingSection}
              />
            </div>
          </section>

          <section
            className={`${resumeUi.previewPane} ${
              mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
            } ${previewStale ? 'opacity-80' : ''}`}
          >
            <ResumePreviewStudio
              content={deferredPreview}
              fullContent={content}
              templateId={templateId}
              onTemplateChange={selectTemplate}
              onContentChange={setContent}
              sectionVisibility={sectionVisibility}
              sectionOrder={sectionOrder}
              previewSettings={previewSettings}
              onPreviewSettingsChange={setPreviewSettings}
              onToggleSection={toggleSection}
              onSelectSection={selectSection}
              onMoveSection={moveSection}
              onFeedback={showFeedback}
              interactive
              activeSection={activeSection}
              showModuleActions
            />
          </section>
        </div>

        <div className={resumeUi.mobileTabBar}>
          <button
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mobileTab === 'edit' ? 'bg-brand/15 text-brand' : 'text-muted'
            }`}
            onClick={() => setMobileTab('edit')}
          >
            <Pencil className="h-4 w-4" />
            内容编辑
          </button>
          <button
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mobileTab === 'preview' ? 'bg-brand/15 text-brand' : 'text-muted'
            }`}
            onClick={() => setMobileTab('preview')}
          >
            <Eye className="h-4 w-4" />
            预览
          </button>
        </div>
      </div>

      <SectionOptimizeCompareModal
        open={compareOpen}
        payload={comparePayload}
        applying={applying}
        onClose={() => {
          setCompareOpen(false)
          setComparePayload(null)
        }}
        onApply={onApplyCompare}
        onCopy={onCopyCompare}
      />
      <ResumeOnboarding variant="edit" />
    </div>
  )
}

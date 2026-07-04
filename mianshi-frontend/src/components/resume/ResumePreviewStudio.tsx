import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  FileStack,
  LayoutTemplate,
  Loader2,
  Plus,
  Sparkles,
} from 'lucide-react'
import type { ResumeContent } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ProMinimalPreview } from './ProMinimalPreview'
import { ResumeTemplatePicker } from './ResumeTemplatePicker'
import { SpacingConfigButton } from './SpacingConfigPopover'
import { proofreadResumeContent, suggestOnePageSettings } from './resumePreviewActions'
import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  MARGIN_OPTIONS,
  DEFAULT_PREVIEW_SETTINGS,
  applyTemplatePreset,
  settingsToPaperStyle,
  type ResumePreviewSettings,
} from './resumePreviewSettings'
import { RESUME_PREVIEW_ID, SECTION_ITEMS, type ResumeSectionKey } from './resumeSections'
import { resumeUi } from './resumeLayout'
import { toolbarSelectClassName } from '../ui/inputStyles'

const STUDIO_BTN = '!h-8'

type Props = {
  content: ResumeContent
  /** 纠错时使用完整内容，预览使用过滤后的 content */
  fullContent?: ResumeContent
  templateId: ResumeTemplateId
  onTemplateChange: (id: ResumeTemplateId) => void
  onContentChange: (c: ResumeContent) => void
  sectionVisibility: Record<ResumeSectionKey, boolean>
  sectionOrder: ResumeSectionKey[]
  previewSettings?: ResumePreviewSettings
  onPreviewSettingsChange?: (s: ResumePreviewSettings | ((prev: ResumePreviewSettings) => ResumePreviewSettings)) => void
  onToggleSection: (key: ResumeSectionKey) => void
  onSelectSection: (key: ResumeSectionKey) => void
  onMoveSection?: (key: ResumeSectionKey, direction: 'up' | 'down') => void
  onFeedback?: (msg: string, type?: 'success' | 'error') => void
  /** 预览区点击模块定位编辑 */
  interactive?: boolean
  activeSection?: ResumeSectionKey | null
  /** 隐藏添加模块等仅编辑页需要的操作 */
  showModuleActions?: boolean
}

function ToolbarSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className="hidden xl:inline">{label}</span>
      <select
        className={toolbarSelectClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ResumePreviewStudio({
  content,
  fullContent,
  templateId,
  onTemplateChange,
  onContentChange,
  sectionVisibility,
  sectionOrder,
  previewSettings: controlledSettings,
  onPreviewSettingsChange,
  onToggleSection,
  onSelectSection,
  onMoveSection,
  onFeedback,
  interactive = false,
  activeSection = null,
  showModuleActions = true,
}: Props) {
  const [localSettings, setLocalSettings] = useState<ResumePreviewSettings>(DEFAULT_PREVIEW_SETTINGS)
  const settings = controlledSettings ?? localSettings
  const patchSettings = useCallback(
    (patch: Partial<ResumePreviewSettings>) => {
      const apply = (s: ResumePreviewSettings) => ({ ...s, ...patch, onePageFit: patch.onePageFit ?? s.onePageFit })
      if (onPreviewSettingsChange) {
        onPreviewSettingsChange((prev) => apply(prev))
      } else {
        setLocalSettings((s) => apply(s))
      }
    },
    [onPreviewSettingsChange],
  )
  const setSettings = useCallback(
    (next: ResumePreviewSettings) => {
      if (onPreviewSettingsChange) onPreviewSettingsChange(next)
      else setLocalSettings(next)
    },
    [onPreviewSettingsChange],
  )
  const [spacingOpen, setSpacingOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [proofreading, setProofreading] = useState(false)
  const [onePageBusy, setOnePageBusy] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const moduleRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (controlledSettings) return
    try {
      localStorage.setItem('mianshi_resume_preview_settings', JSON.stringify(localSettings))
    } catch {
      /* legacy fallback for non-edit views */
    }
  }, [controlledSettings, localSettings])

  useEffect(() => {
    if (!moduleOpen) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (moduleRef.current && !moduleRef.current.contains(t)) setModuleOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moduleOpen])

  const patchSettingsInline = useCallback((patch: Partial<ResumePreviewSettings>) => {
    patchSettings(patch)
  }, [patchSettings])

  const handleProofread = async () => {
    setProofreading(true)
    await new Promise((r) => setTimeout(r, 300))
    const { content: fixed, fixes } = proofreadResumeContent(fullContent ?? content)
    onContentChange(fixed)
    onFeedback?.(fixes.slice(0, 3).join('；') || '纠错完成', 'success')
    setProofreading(false)
  }

  const handleOnePage = async () => {
    setOnePageBusy(true)
    await new Promise((r) => setTimeout(r, 100))
    const el = contentRef.current
    const h = el?.scrollHeight ?? 800
    const next = suggestOnePageSettings(h, settings)
    setSettings(next)
    onFeedback?.(
      next.onePageFit
        ? `已调整为 ${next.fontSize}px / 行高 ${next.lineHeight} / 边距 ${next.pageMargin}px，适配一页`
        : '内容较多，已尽量压缩',
      'success',
    )
    setOnePageBusy(false)
  }

  const hiddenSections = SECTION_ITEMS.filter((s) => !sectionVisibility[s.key])

  const paperStyle = settingsToPaperStyle(settings)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 预览 Studio 工具栏 */}
      <div className={resumeUi.studioToolbar}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={STUDIO_BTN}
            disabled={proofreading}
            onClick={handleProofread}
          >
            {proofreading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            智能纠错
          </Button>
          <Button variant="secondary" size="sm" className={STUDIO_BTN} disabled={onePageBusy} onClick={handleOnePage}>
            {onePageBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileStack className="h-3.5 w-3.5" />
            )}
            智能一页
          </Button>

          <span className={resumeUi.studioDivider} />

          <ToolbarSelect
            label="字体"
            value={settings.fontFamily}
            options={FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))}
            onChange={(v) => patchSettingsInline({ fontFamily: v as ResumePreviewSettings['fontFamily'] })}
          />
          <ToolbarSelect
            label="字号"
            value={settings.fontSize}
            options={FONT_SIZE_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            onChange={(v) => patchSettingsInline({ fontSize: Number(v) })}
          />
          <ToolbarSelect
            label="行高"
            value={settings.lineHeight}
            options={LINE_HEIGHT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            onChange={(v) => patchSettingsInline({ lineHeight: Number(v) })}
          />
          <ToolbarSelect
            label="边距"
            value={settings.pageMarginTop}
            options={MARGIN_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            onChange={(v) => {
              const n = Number(v)
              patchSettingsInline({
                pageMargin: n,
                pageMarginTop: n,
                pageMarginLeft: n,
                pageMarginRight: n,
              })
            }}
          />

          <SpacingConfigButton
            open={spacingOpen}
            onToggle={() => setSpacingOpen((o) => !o)}
            settings={settings}
            onChange={patchSettingsInline}
          />

          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => patchSettingsInline({ accentColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-panel p-0.5"
              title="主题色"
            />
          </label>

          {showModuleActions && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-slate-200 lg:block" />

              <Button variant="secondary" size="sm" className={STUDIO_BTN} onClick={() => setTemplateOpen(true)}>
                <LayoutTemplate className="h-3.5 w-3.5" /> 更换模板
              </Button>

              <div className="relative" ref={moduleRef}>
                <Button variant="secondary" size="sm" className={STUDIO_BTN} onClick={() => setModuleOpen((o) => !o)}>
                  <Plus className="h-3.5 w-3.5" /> 添加模块
                </Button>
                {moduleOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-panel py-1 shadow-lg animate-scale-in">
                    {hiddenSections.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted">所有模块已显示</p>
                    ) : (
                      hiddenSections.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-subtle"
                          onClick={() => {
                            onToggleSection(s.key)
                            onSelectSection(s.key)
                            setModuleOpen(false)
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 text-brand" /> {s.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {!showModuleActions && (
            <Button variant="secondary" size="sm" className={STUDIO_BTN} onClick={() => setTemplateOpen(true)}>
              <LayoutTemplate className="h-3.5 w-3.5" /> 更换模板
            </Button>
          )}

          {settings.onePageFit && (
            <span className="ml-auto hidden items-center gap-1 text-[11px] text-success sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5" /> 一页模式
            </span>
          )}
        </div>
      </div>

      {/* 预览画布 */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-resume-canvas px-3 py-4 lg:px-4 lg:py-5">
        <div className="mx-auto w-full" style={{ maxWidth: 'min(794px, 100%)' }}>
          <div
            id={RESUME_PREVIEW_ID}
            className="resume-paper w-full overflow-hidden rounded-sm bg-resume-paper shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{
              minHeight: settings.onePageFit ? A4_HEIGHT : undefined,
              maxHeight: settings.onePageFit ? A4_HEIGHT : undefined,
              overflow: settings.onePageFit ? 'hidden' : undefined,
            }}
          >
            <div ref={contentRef} style={paperStyle}>
              <ProMinimalPreview
                content={content}
                templateId={templateId}
                sectionOrder={sectionOrder}
                previewSettings={settings}
                editable={interactive}
                activeSection={activeSection}
                onSectionClick={onSelectSection}
                onMoveSection={onMoveSection}
                onHideSection={(key) => {
                  if (sectionVisibility[key]) onToggleSection(key)
                }}
              />
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted">A4 · 210 × 297 mm · 实时预览</p>
        </div>
      </div>

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="更换模板" maxWidth="max-w-2xl">
        <p className="mb-4 text-sm text-text-secondary">选择适合目标行业的简历风格，预览区即时更新</p>
        <ResumeTemplatePicker
          value={templateId}
          onChange={(id) => {
            onTemplateChange(id)
            patchSettingsInline(applyTemplatePreset(settings, id))
            setTemplateOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}

const A4_HEIGHT = 1123

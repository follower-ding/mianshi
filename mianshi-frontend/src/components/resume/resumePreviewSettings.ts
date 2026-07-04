import type { CSSProperties } from 'react'
import type { ResumeTemplateId } from '../../lib/data'

export type ResumeFontFamily =
  | 'microsoft-yahei'
  | 'pingfang'
  | 'songti'
  | 'arial'

export type SectionHeadStyle = 'bar' | 'underline' | 'dot' | 'badge' | 'center-line'

export type ResumeLayoutMode = 'single' | 'sidebar-left'

export type ResumePreviewSettings = {
  fontFamily: ResumeFontFamily
  fontSize: number
  lineHeight: number
  /** @deprecated 兼容旧版，读写时同步到三边距 */
  pageMargin: number
  pageMarginTop: number
  pageMarginLeft: number
  pageMarginRight: number
  moduleGap: number
  titleMarginTop: number
  titleMarginBottom: number
  accentColor: string
  titleColor: string
  bodyColor: string
  sectionHeadStyle: SectionHeadStyle
  layout: ResumeLayoutMode
  sidebarWidth: number
  onePageFit: boolean
}

export const FONT_OPTIONS: { id: ResumeFontFamily; label: string; css: string }[] = [
  { id: 'microsoft-yahei', label: '微软雅黑', css: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { id: 'pingfang', label: '苹方', css: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { id: 'songti', label: '宋体', css: '"SimSun", "Songti SC", serif' },
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
]

export const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16] as const
export const LINE_HEIGHT_OPTIONS = [18, 20, 22, 24, 26] as const
export const MARGIN_OPTIONS = [16, 20, 24, 27, 32, 36, 40] as const

export const SPACING_SLIDERS = [
  { key: 'pageMarginTop' as const, label: '页面上边距', min: 12, max: 48, step: 2 },
  { key: 'pageMarginLeft' as const, label: '页面左边距', min: 12, max: 48, step: 2 },
  { key: 'pageMarginRight' as const, label: '页面右边距', min: 12, max: 48, step: 2 },
  { key: 'moduleGap' as const, label: '模块上边距', min: 4, max: 28, step: 2 },
  { key: 'titleMarginTop' as const, label: '标题上边距', min: 0, max: 20, step: 2 },
  { key: 'titleMarginBottom' as const, label: '标题下边距', min: 4, max: 20, step: 2 },
]

export const DEFAULT_PREVIEW_SETTINGS: ResumePreviewSettings = {
  fontFamily: 'microsoft-yahei',
  fontSize: 14,
  lineHeight: 20,
  pageMargin: 27,
  pageMarginTop: 27,
  pageMarginLeft: 27,
  pageMarginRight: 27,
  moduleGap: 14,
  titleMarginTop: 4,
  titleMarginBottom: 10,
  accentColor: '#2563eb',
  titleColor: '#1e293b',
  bodyColor: '#475569',
  sectionHeadStyle: 'bar',
  layout: 'single',
  sidebarWidth: 32,
  onePageFit: false,
}

/** 每套模板默认视觉 preset（换模板时整包应用） */
export const TEMPLATE_PRESETS: Record<ResumeTemplateId, Partial<ResumePreviewSettings>> = {
  'classic-business': {
    accentColor: '#2563eb',
    titleColor: '#1e293b',
    bodyColor: '#475569',
    fontFamily: 'microsoft-yahei',
    fontSize: 14,
    lineHeight: 20,
    moduleGap: 14,
    sectionHeadStyle: 'underline',
    layout: 'single',
  },
  'tech-simple': {
    accentColor: '#0891b2',
    titleColor: '#0f172a',
    bodyColor: '#475569',
    fontFamily: 'pingfang',
    fontSize: 14,
    lineHeight: 22,
    moduleGap: 16,
    sectionHeadStyle: 'dot',
    layout: 'single',
  },
  'creative-design': {
    accentColor: '#7c3aed',
    titleColor: '#1e293b',
    bodyColor: '#64748b',
    fontFamily: 'pingfang',
    fontSize: 14,
    lineHeight: 20,
    moduleGap: 12,
    sectionHeadStyle: 'dot',
    layout: 'sidebar-left',
    sidebarWidth: 34,
  },
  'academic-research': {
    accentColor: '#b45309',
    titleColor: '#292524',
    bodyColor: '#57534e',
    fontFamily: 'songti',
    fontSize: 14,
    lineHeight: 24,
    moduleGap: 18,
    sectionHeadStyle: 'center-line',
    layout: 'single',
  },
  'modern-minimal': {
    accentColor: '#0d9488',
    titleColor: '#134e4a',
    bodyColor: '#64748b',
    fontFamily: 'arial',
    fontSize: 13,
    lineHeight: 22,
    moduleGap: 22,
    pageMarginTop: 32,
    pageMarginLeft: 32,
    pageMarginRight: 32,
    sectionHeadStyle: 'underline',
    layout: 'single',
  },
  'executive-pro': {
    accentColor: '#c9a227',
    titleColor: '#1e293b',
    bodyColor: '#475569',
    fontFamily: 'microsoft-yahei',
    fontSize: 14,
    lineHeight: 20,
    moduleGap: 12,
    sectionHeadStyle: 'bar',
    layout: 'single',
  },
  'fresh-campus': {
    accentColor: '#059669',
    titleColor: '#ffffff',
    bodyColor: '#ecfdf5',
    fontFamily: 'pingfang',
    fontSize: 14,
    lineHeight: 20,
    moduleGap: 10,
    sectionHeadStyle: 'badge',
    layout: 'sidebar-left',
    sidebarWidth: 36,
  },
  'data-analyst': {
    accentColor: '#6366f1',
    titleColor: '#ffffff',
    bodyColor: '#e0e7ff',
    fontFamily: 'microsoft-yahei',
    fontSize: 13,
    lineHeight: 20,
    moduleGap: 12,
    sectionHeadStyle: 'bar',
    layout: 'sidebar-left',
    sidebarWidth: 30,
  },
}

const STORAGE_KEY = 'mianshi_resume_preview_settings'

function migrateSettings(raw: Partial<ResumePreviewSettings>): ResumePreviewSettings {
  const m = raw.pageMargin ?? DEFAULT_PREVIEW_SETTINGS.pageMargin
  return {
    ...DEFAULT_PREVIEW_SETTINGS,
    ...raw,
    pageMarginTop: raw.pageMarginTop ?? m,
    pageMarginLeft: raw.pageMarginLeft ?? m,
    pageMarginRight: raw.pageMarginRight ?? m,
    moduleGap: raw.moduleGap ?? DEFAULT_PREVIEW_SETTINGS.moduleGap,
    titleMarginTop: raw.titleMarginTop ?? DEFAULT_PREVIEW_SETTINGS.titleMarginTop,
    titleMarginBottom: raw.titleMarginBottom ?? DEFAULT_PREVIEW_SETTINGS.titleMarginBottom,
    titleColor: raw.titleColor ?? DEFAULT_PREVIEW_SETTINGS.titleColor,
    bodyColor: raw.bodyColor ?? DEFAULT_PREVIEW_SETTINGS.bodyColor,
    sectionHeadStyle: raw.sectionHeadStyle ?? DEFAULT_PREVIEW_SETTINGS.sectionHeadStyle,
    layout: raw.layout ?? DEFAULT_PREVIEW_SETTINGS.layout,
    sidebarWidth: raw.sidebarWidth ?? DEFAULT_PREVIEW_SETTINGS.sidebarWidth,
  }
}

export function loadPreviewSettings(): ResumePreviewSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREVIEW_SETTINGS }
    return migrateSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREVIEW_SETTINGS }
  }
}

export function savePreviewSettings(s: ResumePreviewSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function resetSpacingSettings(s: ResumePreviewSettings): ResumePreviewSettings {
  return {
    ...s,
    pageMarginTop: DEFAULT_PREVIEW_SETTINGS.pageMarginTop,
    pageMarginLeft: DEFAULT_PREVIEW_SETTINGS.pageMarginLeft,
    pageMarginRight: DEFAULT_PREVIEW_SETTINGS.pageMarginRight,
    moduleGap: DEFAULT_PREVIEW_SETTINGS.moduleGap,
    titleMarginTop: DEFAULT_PREVIEW_SETTINGS.titleMarginTop,
    titleMarginBottom: DEFAULT_PREVIEW_SETTINGS.titleMarginBottom,
    pageMargin: DEFAULT_PREVIEW_SETTINGS.pageMargin,
  }
}

export function fontCss(family: ResumeFontFamily): string {
  return FONT_OPTIONS.find((f) => f.id === family)?.css ?? FONT_OPTIONS[0].css
}

export const A4_CONTENT_HEIGHT = 1056

export function templateRootClass(templateId: ResumeTemplateId): string {
  return `resume-tpl-${templateId}`
}

export function sectionHeadClass(style: SectionHeadStyle): string {
  return `resume-doc--head-${style}`
}

export function layoutClass(layout: ResumeLayoutMode): string {
  return layout === 'sidebar-left' ? 'resume-doc--sidebar' : ''
}

export function getTemplatePreset(templateId: ResumeTemplateId): ResumePreviewSettings {
  return migrateSettings(TEMPLATE_PRESETS[templateId] ?? {})
}

export function applyTemplatePreset(
  current: ResumePreviewSettings,
  templateId: ResumeTemplateId,
): ResumePreviewSettings {
  const preset = TEMPLATE_PRESETS[templateId] ?? {}
  return migrateSettings({
    ...current,
    ...preset,
    onePageFit: current.onePageFit,
  })
}

export function resolvePreviewOptions(
  templateId: ResumeTemplateId,
  settings?: Partial<ResumePreviewSettings> | null,
): Pick<ResumePreviewSettings, 'layout' | 'sectionHeadStyle' | 'sidebarWidth'> {
  const merged = migrateSettings({ ...getTemplatePreset(templateId), ...settings })
  return {
    layout: merged.layout,
    sectionHeadStyle: merged.sectionHeadStyle,
    sidebarWidth: merged.sidebarWidth,
  }
}

export function settingsToPaperStyle(s: ResumePreviewSettings): CSSProperties {
  const sidebarLayout = s.layout === 'sidebar-left'
  return {
    fontFamily: fontCss(s.fontFamily),
    fontSize: s.fontSize,
    lineHeight: `${s.lineHeight}px`,
    paddingTop: sidebarLayout ? 0 : s.pageMarginTop,
    paddingLeft: sidebarLayout ? 0 : s.pageMarginLeft,
    paddingRight: sidebarLayout ? 0 : s.pageMarginRight,
    paddingBottom: sidebarLayout ? 0 : s.pageMarginTop,
    color: s.bodyColor,
    ['--resume-accent' as string]: s.accentColor,
    ['--resume-title-color' as string]: s.titleColor,
    ['--resume-body-color' as string]: s.bodyColor,
    ['--resume-module-gap' as string]: `${s.moduleGap}px`,
    ['--resume-title-top' as string]: `${s.titleMarginTop}px`,
    ['--resume-title-bottom' as string]: `${s.titleMarginBottom}px`,
    ['--resume-sidebar-width' as string]: `${s.sidebarWidth}%`,
  }
}

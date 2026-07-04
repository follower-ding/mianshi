import type { ResumeLayoutConfig } from '../../api/client'
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_VISIBILITY,
  normalizeSectionOrder,
  normalizeSectionVisibility,
  type ResumeSectionKey,
} from './resumeSections'
import {
  DEFAULT_PREVIEW_SETTINGS,
  type ResumePreviewSettings,
} from './resumePreviewSettings'

export type ResumeLayoutState = {
  sectionOrder: ResumeSectionKey[]
  sectionVisibility: Record<ResumeSectionKey, boolean>
  previewSettings: ResumePreviewSettings
}

export function layoutFromConfig(config?: ResumeLayoutConfig | null): ResumeLayoutState {
  const previewRaw = config?.previewSettings as Partial<ResumePreviewSettings> | undefined
  return {
    sectionOrder: normalizeSectionOrder(config?.sectionOrder),
    sectionVisibility: normalizeSectionVisibility(config?.sectionVisibility),
    previewSettings: previewRaw
      ? { ...DEFAULT_PREVIEW_SETTINGS, ...previewRaw }
      : { ...DEFAULT_PREVIEW_SETTINGS },
  }
}

export function layoutToConfig(state: ResumeLayoutState): ResumeLayoutConfig {
  return {
    sectionOrder: state.sectionOrder,
    sectionVisibility: state.sectionVisibility,
    previewSettings: state.previewSettings as Record<string, unknown>,
  }
}

export function defaultLayoutState(): ResumeLayoutState {
  return {
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
    previewSettings: { ...DEFAULT_PREVIEW_SETTINGS },
  }
}

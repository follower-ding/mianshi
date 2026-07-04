export type ResumeSectionKey =
  | 'basic'
  | 'intro'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'honors'
  | 'certificates'
  | 'custom'

export type ResumeModule = 'mine' | 'generate' | 'optimize' | 'edit'

export const RESUME_MODULE_ROUTES: Record<ResumeModule, string> = {
  mine: '/resume/mine',
  generate: '/resume/generate',
  optimize: '/resume/optimize',
  edit: '/resume/edit',
}

export const RESUME_MODULES: {
  id: ResumeModule
  label: string
  desc: string
  path: string
}[] = [
  {
    id: 'mine',
    label: '我的简历',
    desc: '已保存简历卡片与继续编辑',
    path: RESUME_MODULE_ROUTES.mine,
  },
  {
    id: 'generate',
    label: '快速生成',
    desc: 'AI 根据目标职位与个人情况一键生成',
    path: RESUME_MODULE_ROUTES.generate,
  },
  {
    id: 'optimize',
    label: '导入优化',
    desc: '导入整份简历并 AI 全文优化',
    path: RESUME_MODULE_ROUTES.optimize,
  },
  {
    id: 'edit',
    label: '排版编辑',
    desc: '模块开关 + 结构化编辑 + 实时预览',
    path: RESUME_MODULE_ROUTES.edit,
  },
]

/** 默认模块顺序（不含 basic 头区在预览中固定最上） */
export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  'skills',
  'education',
  'experience',
  'projects',
  'honors',
  'certificates',
  'custom',
  'intro',
]

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  basic: '基本信息',
  intro: '个人简介',
  education: '教育背景',
  skills: '专业技能',
  experience: '工作经历',
  projects: '项目经历',
  honors: '荣誉奖项',
  certificates: '证书资质',
  custom: '自定义模块',
}

export const SECTION_ITEMS = DEFAULT_SECTION_ORDER.map((key) => ({
  key,
  label: SECTION_LABELS[key],
}))

export const DEFAULT_SECTION_VISIBILITY: Record<ResumeSectionKey, boolean> = {
  basic: true,
  intro: true,
  education: true,
  skills: true,
  experience: true,
  projects: true,
  honors: true,
  certificates: true,
  custom: true,
}

export function normalizeSectionOrder(order?: string[] | null): ResumeSectionKey[] {
  if (!order?.length) return [...DEFAULT_SECTION_ORDER]
  const valid = order.filter((k): k is ResumeSectionKey =>
    DEFAULT_SECTION_ORDER.includes(k as ResumeSectionKey),
  )
  const missing = DEFAULT_SECTION_ORDER.filter((k) => !valid.includes(k))
  return [...valid, ...missing]
}

export function normalizeSectionVisibility(
  vis?: Record<string, boolean> | null,
): Record<ResumeSectionKey, boolean> {
  if (!vis) return { ...DEFAULT_SECTION_VISIBILITY }
  const out = { ...DEFAULT_SECTION_VISIBILITY }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (typeof vis[key] === 'boolean') out[key] = vis[key]!
  }
  if (typeof vis.basic === 'boolean') out.basic = vis.basic
  return out
}

/** @deprecated 使用 resume 级 layoutConfig */
const ORDER_STORAGE_KEY = 'mianshi_resume_section_order'

export function loadSectionOrder(): ResumeSectionKey[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return [...DEFAULT_SECTION_ORDER]
    return normalizeSectionOrder(JSON.parse(raw) as string[])
  } catch {
    return [...DEFAULT_SECTION_ORDER]
  }
}

export function saveSectionOrder(order: ResumeSectionKey[]) {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function moveSectionInOrder(
  order: ResumeSectionKey[],
  key: ResumeSectionKey,
  direction: 'up' | 'down',
): ResumeSectionKey[] {
  const idx = order.indexOf(key)
  if (idx < 0) return order
  const next = direction === 'up' ? idx - 1 : idx + 1
  if (next < 0 || next >= order.length) return order
  const copy = [...order]
  ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
  return copy
}

export function filterPreviewContent(
  content: import('../../api/client').ResumeContent,
  visibility: Record<ResumeSectionKey, boolean>,
) {
  return {
    basic: visibility.basic
      ? content.basic
      : { name: content.basic?.name, avatarUrl: content.basic?.avatarUrl, fieldVisibility: content.basic?.fieldVisibility, avatarShape: content.basic?.avatarShape },
    selfIntro: visibility.intro ? content.selfIntro : undefined,
    education: visibility.education ? content.education : [],
    experience: visibility.experience ? content.experience : [],
    projects: visibility.projects ? content.projects : [],
    skills: visibility.skills ? content.skills : [],
    honors: visibility.honors ? content.honors : [],
    certificates: visibility.certificates ? content.certificates : [],
    customSections: visibility.custom ? content.customSections : [],
  }
}

export const RESUME_PREVIEW_ID = 'resume-print-root'

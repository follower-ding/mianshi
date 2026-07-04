import type { ResumeContent } from '../types/entities.js'

export type FieldCoverageStatus = 'ok' | 'missing' | 'low'

export type ResumeFieldCoverageItem = {
  key: string
  label: string
  status: FieldCoverageStatus
  hint?: string
}

const PLACEHOLDER_NAMES = new Set(['候选人', '姓名', '你的名字'])
const PLACEHOLDER_COMPANIES = /某科技|某某|示例公司|待填写/i

function hasText(v?: string) {
  return Boolean(v?.trim())
}

function listOk<T>(arr?: T[], min = 1) {
  return Array.isArray(arr) && arr.length >= min
}

/** 简历结构化字段覆盖率 — 用于导入对照页低置信度标注 */
export function computeResumeFieldCoverage(
  content: ResumeContent,
  source?: 'llm' | 'demo',
): ResumeFieldCoverageItem[] {
  const name = content.basic?.name?.trim() ?? ''
  const title = content.basic?.title?.trim() ?? ''
  const contact = [content.basic?.phone, content.basic?.email, content.basic?.city].some(hasText)
  const intro = content.selfIntro?.trim() ?? ''

  const items: ResumeFieldCoverageItem[] = [
    {
      key: 'basic.name',
      label: '姓名',
      status: !name
        ? 'missing'
        : PLACEHOLDER_NAMES.has(name) || source === 'demo'
          ? 'low'
          : 'ok',
      hint: PLACEHOLDER_NAMES.has(name) ? '疑似占位姓名，请核对' : undefined,
    },
    {
      key: 'basic.title',
      label: '目标职位',
      status: !title ? 'missing' : source === 'demo' && title === '软件工程师' ? 'low' : 'ok',
      hint: title === '软件工程师' && source === 'demo' ? '规则默认职位' : undefined,
    },
    {
      key: 'basic.contact',
      label: '联系方式',
      status: contact ? 'ok' : 'missing',
      hint: contact ? undefined : '缺少电话/邮箱/城市',
    },
    {
      key: 'selfIntro',
      label: '个人简介',
      status: !intro ? 'missing' : intro.length < 40 ? 'low' : 'ok',
      hint: intro.length < 40 ? '内容偏短' : undefined,
    },
    {
      key: 'education',
      label: '教育背景',
      status: listOk(content.education) ? 'ok' : 'missing',
    },
    {
      key: 'experience',
      label: '工作经历',
      status: !listOk(content.experience)
        ? 'missing'
        : content.experience!.some((e) => PLACEHOLDER_COMPANIES.test(e.company))
          ? 'low'
          : 'ok',
      hint: content.experience?.some((e) => PLACEHOLDER_COMPANIES.test(e.company))
        ? '含模板公司名'
        : undefined,
    },
    {
      key: 'projects',
      label: '项目经历',
      status: listOk(content.projects) ? 'ok' : 'missing',
    },
    {
      key: 'skills',
      label: '技能标签',
      status: listOk(content.skills, 3) ? 'ok' : listOk(content.skills) ? 'low' : 'missing',
      hint: listOk(content.skills) && (content.skills?.length ?? 0) < 3 ? '技能项偏少' : undefined,
    },
  ]

  return items
}

export function countCoverageIssues(items: ResumeFieldCoverageItem[]) {
  return {
    missing: items.filter((i) => i.status === 'missing').length,
    low: items.filter((i) => i.status === 'low').length,
    ok: items.filter((i) => i.status === 'ok').length,
  }
}

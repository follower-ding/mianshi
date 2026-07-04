import type { ResumeContent } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import type { ResumeSectionKey } from './resumeSections'

export const EMPTY_RESUME_CONTENT: ResumeContent = {
  basic: { name: '', title: '', city: '', phone: '', email: '' },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  selfIntro: '',
  honors: [],
  certificates: [],
  customSections: [],
}

/** 模板画廊默认示例数据（用户简历为空时展示） */
export const TEMPLATE_GALLERY_SAMPLE_CONTENT: ResumeContent = sanitizeResumeContent({
  basic: {
    name: '张明',
    title: 'Java 后端开发工程师',
    city: '上海',
    phone: '138****8888',
    email: 'zhangming@email.com',
  },
  selfIntro:
    '3 年互联网后端经验，熟悉 Spring Boot、MySQL 与微服务架构，注重代码质量与系统稳定性。',
  education: [
    {
      school: '华东师范大学',
      degree: '本科',
      major: '计算机科学与技术',
      start: '2018.09',
      end: '2022.06',
    },
  ],
  experience: [
    {
      company: '某科技有限公司',
      title: 'Java 后端开发',
      start: '2022.07',
      end: '至今',
      highlights: ['订单链路重构', 'Redis 缓存治理', '慢 SQL 优化'],
      detail: '接口 P99 延迟降低 40%，支撑核心业务稳定运行。',
    },
  ],
  projects: [
    {
      name: '高并发秒杀系统',
      role: '核心开发',
      desc: '基于 Redis + MQ 削峰，支撑万级 QPS。',
      techStack: ['Java', 'Redis', 'Kafka'],
      highlights: ['库存超卖率 0', '全链路压测通过'],
    },
  ],
  skills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Kafka', 'Docker'],
})

export function galleryPreviewContent(user?: ResumeContent): ResumeContent {
  const c = sanitizeResumeContent(user ?? EMPTY_RESUME_CONTENT)
  const filled =
    Boolean(c.basic?.name?.trim() || c.basic?.title?.trim()) ||
    Boolean(c.selfIntro?.trim()) ||
    (c.experience?.length ?? 0) > 0 ||
    (c.education?.length ?? 0) > 0
  return filled ? c : TEMPLATE_GALLERY_SAMPLE_CONTENT
}

export function mergeResumeContent(base?: ResumeContent, patch?: ResumeContent): ResumeContent {
  if (!base && !patch) return { ...EMPTY_RESUME_CONTENT }
  const b = base ?? EMPTY_RESUME_CONTENT
  const p = patch ?? {}
  return sanitizeResumeContent({
    basic: { ...b.basic, ...p.basic },
    education: p.education ?? b.education ?? [],
    experience: p.experience ?? b.experience ?? [],
    projects: p.projects ?? b.projects ?? [],
    skills: p.skills ?? b.skills ?? [],
    selfIntro: p.selfIntro ?? b.selfIntro,
    honors: p.honors ?? b.honors ?? [],
    certificates: p.certificates ?? b.certificates ?? [],
    customSections: p.customSections ?? b.customSections ?? [],
  })
}

/** 将过长或合并的技能字符串拆成标签；过滤非技能长文本 */
export function normalizeSkills(skills: string[] | undefined): string[] {
  if (!skills?.length) return []
  const junkRe = /姓名|个人简介|教育背景|工作经历|项目经历|自我介绍|东华大学|字节跳动|腾讯/i
  const out: string[] = []
  for (const item of skills) {
    const raw = item.trim()
    if (!raw || raw.length > 48 || junkRe.test(raw)) continue
    const parts =
      raw.length > 24
        ? raw
            .split(/[,，、\n;；|/／·]+/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 2 && s.length <= 32 && !junkRe.test(s))
        : [raw]
    for (const p of parts) {
      if (!out.includes(p)) out.push(p)
    }
  }
  return out.slice(0, 24)
}

export function sanitizeResumeContent(c: ResumeContent): ResumeContent {
  return {
    ...c,
    skills: normalizeSkills(c.skills),
    selfIntro: c.selfIntro?.trim() || '',
    honors: c.honors ?? [],
    certificates: c.certificates ?? [],
    customSections: c.customSections ?? [],
  }
}

export function pickSectionContent(content: ResumeContent, section: ResumeSectionKey): ResumeContent {
  const empty = { ...EMPTY_RESUME_CONTENT }
  switch (section) {
    case 'basic':
      return { ...empty, basic: content.basic }
    case 'intro':
      return { ...empty, selfIntro: content.selfIntro }
    case 'education':
      return { ...empty, education: content.education ?? [] }
    case 'skills':
      return { ...empty, skills: content.skills ?? [] }
    case 'experience':
      return { ...empty, experience: content.experience ?? [] }
    case 'projects':
      return { ...empty, projects: content.projects ?? [] }
    case 'honors':
      return { ...empty, honors: content.honors ?? [] }
    case 'certificates':
      return { ...empty, certificates: content.certificates ?? [] }
    case 'custom':
      return { ...empty, customSections: content.customSections ?? [] }
    default:
      return empty
  }
}

export function mergeSectionContent(
  base: ResumeContent,
  section: ResumeSectionKey,
  patch: ResumeContent,
): ResumeContent {
  switch (section) {
    case 'basic':
      return sanitizeResumeContent({ ...base, basic: { ...base.basic, ...patch.basic } })
    case 'intro':
      return sanitizeResumeContent({ ...base, selfIntro: patch.selfIntro ?? base.selfIntro })
    case 'education':
      return sanitizeResumeContent({ ...base, education: patch.education?.length ? patch.education : base.education })
    case 'skills':
      return sanitizeResumeContent({ ...base, skills: patch.skills?.length ? patch.skills : base.skills })
    case 'experience':
      return sanitizeResumeContent({
        ...base,
        experience: patch.experience?.length ? patch.experience : base.experience,
      })
    case 'projects':
      return sanitizeResumeContent({ ...base, projects: patch.projects?.length ? patch.projects : base.projects })
    case 'honors':
      return sanitizeResumeContent({ ...base, honors: patch.honors?.length ? patch.honors : base.honors })
    case 'certificates':
      return sanitizeResumeContent({
        ...base,
        certificates: patch.certificates?.length ? patch.certificates : base.certificates,
      })
    case 'custom':
      return sanitizeResumeContent({
        ...base,
        customSections: patch.customSections?.length ? patch.customSections : base.customSections,
      })
    default:
      return base
  }
}

export function isValidTemplateId(id: string): id is ResumeTemplateId {
  return [
    'classic-business',
    'tech-simple',
    'creative-design',
    'academic-research',
    'modern-minimal',
    'executive-pro',
    'fresh-campus',
    'data-analyst',
  ].includes(id)
}

export function contentToPlainText(content: ResumeContent): string {
  const parts: string[] = []
  const b = content.basic
  if (b?.name || b?.title) {
    parts.push(`${b.name ?? ''} | ${b.title ?? ''}`.trim())
    const contact = [b.city, b.phone, b.email].filter(Boolean).join(' · ')
    if (contact) parts.push(contact)
  }
  if (content.selfIntro?.trim()) parts.push(`\n个人简介\n${content.selfIntro}`)
  if (content.education?.length) {
    parts.push(
      '\n教育背景\n' +
        content.education
          .map((e) => `${e.school} ${e.major ?? ''} ${e.degree ?? ''} ${e.start ?? ''}-${e.end ?? ''}`.trim())
          .join('\n'),
    )
  }
  if (content.experience?.length) {
    parts.push(
      '\n工作经历\n' +
        content.experience
          .map(
            (e) =>
              `${e.company} · ${e.title} (${e.start ?? ''}-${e.end ?? ''})\n${e.highlights.map((h) => `  - ${h}`).join('\n')}`,
          )
          .join('\n\n'),
    )
  }
  if (content.projects?.length) {
    parts.push(
      '\n项目经历\n' +
        content.projects
          .map((p) => `${p.name}${p.role ? ` · ${p.role}` : ''}\n${p.highlights.map((h) => `  - ${h}`).join('\n')}`)
          .join('\n\n'),
    )
  }
  if (content.honors?.length) {
    parts.push(
      '\n荣誉奖项\n' +
        content.honors.map((h) => `${h.title} ${h.date ?? ''} ${h.desc ?? ''}`.trim()).join('\n'),
    )
  }
  if (content.certificates?.length) {
    parts.push(
      '\n证书\n' +
        content.certificates.map((c) => `${c.name} ${c.issuer ?? ''} ${c.date ?? ''}`.trim()).join('\n'),
    )
  }
  if (content.customSections?.length) {
    for (const cs of content.customSections) {
      parts.push(`\n${cs.title}\n${cs.body ?? ''}`)
    }
  }
  if (content.skills?.length) parts.push(`\n技能\n${content.skills.join('、')}`)
  return parts.join('\n').trim()
}

export function collectPageStyles(): string {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('\n')
      } catch {
        return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

export function ensurePreviewElement(elementId: string): HTMLElement {
  const el = document.getElementById(elementId)
  if (!el) throw new Error('预览区域未就绪，请稍后再试')
  const rect = el.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8) {
    throw new Error('预览区未显示，请先切换到「预览」标签后再导出')
  }
  return el
}

export function printResume(elementId: string, title = '简历') {
  const el = ensurePreviewElement(elementId)
  const styles = collectPageStyles()
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    throw new Error('无法打开打印窗口，请允许浏览器弹窗后重试')
  }
  win.document.write(`
    <!DOCTYPE html>
    <html><head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>${styles}</style>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 12mm; size: A4; }
      </style>
    </head><body>${el.outerHTML}</body></html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 500)
}

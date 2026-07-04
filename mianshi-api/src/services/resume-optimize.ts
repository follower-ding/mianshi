import { randomUUID } from 'node:crypto'
import { isLlmConfigured, tryCompleteChat } from './llm.js'
import {
  computeResumeFieldCoverage,
  type ResumeFieldCoverageItem,
} from './resume-field-coverage.js'
import type {
  JobPosting,
  ResumeContent,
  ResumeExperience,
  ResumeGenerateResult,
  ResumeOptimizeChange,
  ResumeOptimizeResult,
  ResumeParseResult,
  ResumeProject,
} from '../types/entities.js'

function contentToText(content: ResumeContent): string {
  const parts: string[] = []
  if (content.basic) {
    const b = content.basic
    parts.push(
      `姓名：${b.name ?? ''} | ${b.title ?? ''} | ${b.city ?? ''}\n${b.phone ?? ''} ${b.email ?? ''}`,
    )
  }
  if (content.selfIntro) parts.push(`自我介绍：${content.selfIntro}`)
  if (content.education?.length) {
    parts.push(
      '教育背景：\n' +
        content.education
          .map((e) => `${e.school} ${e.major ?? ''} ${e.degree ?? ''} ${e.start ?? ''}-${e.end ?? ''}`)
          .join('\n'),
    )
  }
  if (content.experience?.length) {
    parts.push(
      '工作经历：\n' +
        content.experience
          .map(
            (e) =>
              `${e.company} · ${e.title} (${e.start ?? ''}-${e.end ?? ''})\n${e.highlights.map((h) => `  - ${h}`).join('\n')}`,
          )
          .join('\n'),
    )
  }
  if (content.projects?.length) {
    parts.push(
      '项目经历：\n' +
        content.projects
          .map(
            (p) =>
              `${p.name} · ${p.role ?? ''}\n${p.desc ?? ''}\n${p.highlights.map((h) => `  - ${h}`).join('\n')}`,
          )
          .join('\n'),
    )
  }
  if (content.skills?.length) parts.push(`技能：${content.skills.join('、')}`)
  if (content.honors?.length) {
    parts.push(
      '荣誉奖项：\n' +
        content.honors.map((h) => `${h.title} ${h.date ?? ''} ${h.desc ?? ''}`.trim()).join('\n'),
    )
  }
  if (content.certificates?.length) {
    parts.push(
      '证书：\n' +
        content.certificates
          .map((c) => `${c.name} ${c.issuer ?? ''} ${c.date ?? ''}`.trim())
          .join('\n'),
    )
  }
  if (content.customSections?.length) {
    for (const cs of content.customSections) {
      parts.push(`${cs.title}：\n${cs.body ?? ''}`)
    }
  }
  return parts.join('\n\n')
}

const FORCE_DEMO = process.env.LLM_FORCE_DEMO === '1' || process.env.LLM_FORCE_DEMO === 'true'

export function isResumeAiDemoMode() {
  return !isLlmConfigured() || FORCE_DEMO
}

function llmDisabled() {
  return isResumeAiDemoMode()
}

function logLlmFallback(label: string, err?: unknown) {
  const detail = err instanceof Error ? err.message : err ? String(err) : 'unavailable'
  console.warn(`[resume] ${label}: LLM unavailable, using demo fallback (${detail})`)
}

function normalizeSkillsArray(skills: string[]): string[] {
  const junkRe = /姓名|个人简介|教育背景|工作经历|项目经历|自我介绍/i
  const out: string[] = []
  for (const item of skills) {
    const raw = String(item).trim()
    if (!raw || raw.length > 48 || junkRe.test(raw)) continue
    const parts =
      raw.length > 24
        ? raw.split(/[,，、\n;；|/／·]+/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 32 && !junkRe.test(s))
        : [raw]
    for (const p of parts) {
      if (!out.includes(p)) out.push(p)
    }
  }
  return out.slice(0, 24)
}

function normalizeContent(raw: unknown): ResumeContent {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  return {
    basic: o.basic as ResumeContent['basic'],
    education: Array.isArray(o.education) ? (o.education as ResumeContent['education']) : [],
    experience: Array.isArray(o.experience)
      ? (o.experience as ResumeExperience[]).map((e) => ({
          company: e.company ?? '',
          title: e.title ?? '',
          department: e.department,
          city: e.city,
          start: e.start,
          end: e.end,
          highlights: Array.isArray(e.highlights) ? e.highlights : [],
          detail: e.detail,
        }))
      : [],
    projects: Array.isArray(o.projects)
      ? (o.projects as ResumeProject[]).map((p) => ({
          name: p.name ?? '',
          role: p.role,
          desc: p.desc,
          techStack: Array.isArray(p.techStack) ? p.techStack : undefined,
          highlights: Array.isArray(p.highlights) ? p.highlights : [],
        }))
      : [],
    skills: normalizeSkillsArray(Array.isArray(o.skills) ? (o.skills as string[]) : []),
    selfIntro: typeof o.selfIntro === 'string' ? o.selfIntro : undefined,
    honors: Array.isArray(o.honors)
      ? (o.honors as ResumeContent['honors'])!.map((h) => ({
          title: h?.title ?? '',
          date: h?.date,
          desc: h?.desc,
        }))
      : [],
    certificates: Array.isArray(o.certificates)
      ? (o.certificates as ResumeContent['certificates'])!.map((c) => ({
          name: c?.name ?? '',
          issuer: c?.issuer,
          date: c?.date,
        }))
      : [],
    customSections: Array.isArray(o.customSections)
      ? (o.customSections as ResumeContent['customSections'])!.map((cs) => ({
          id: cs?.id ?? randomUUID(),
          title: cs?.title ?? '自定义模块',
          body: cs?.body,
        }))
      : [],
  }
}

function demoParse(text: string): ResumeContent {
  const lines = text.split('\n').filter((l) => l.trim())
  const skills = lines
    .filter((l) => /Java|Go|Python|React|MySQL|Redis|Spring/.test(l))
    .slice(0, 8)
  return {
    basic: { name: '候选人', title: '软件工程师' },
    selfIntro: text.slice(0, 200).trim(),
    experience: [
      {
        company: '某科技公司',
        title: '后端开发工程师',
        start: '2021',
        end: '至今',
        highlights: lines.slice(0, 3).map((l) => l.trim()).filter(Boolean),
      },
    ],
    skills: skills.length ? skills : ['Java', 'Spring Boot', 'MySQL'],
  }
}

function demoOptimize(text: string, job?: JobPosting): ResumeOptimizeResult {
  const content = demoParse(text)
  const jobHint = job ? `与 ${job.company}「${job.title}」岗位匹配` : '突出技术深度与业务成果'
  const optimizedText = `${contentToText(content)}\n\n【AI 优化说明】已优化措辞，${jobHint}。建议使用 STAR 法则描述项目，量化成果。`
  const summary = `${content.selfIntro?.slice(0, 120) ?? '具备扎实的工程实践与项目经验'}，熟悉 ${content.skills?.slice(0, 3).join('、') ?? '主流技术栈'}。`
  return {
    content,
    optimizedText,
    summary,
    suggestions: [
      '【演示模式】LLM 密钥无效或未配置，结果为规则润色。请更新 mianshi-api/.env 中 LLM_API_KEY 并重启 API',
      '为项目经历补充量化指标（如 QPS、延迟、用户量）',
      '技能列表按 JD 关键词排序',
      '自我介绍控制在 80-120 字，突出与目标岗位匹配点',
    ],
    changes: [
      {
        section: '项目描述',
        before: '负责系统开发',
        after: '主导核心模块设计与开发，支撑日均 10w+ 请求',
      },
    ],
    source: 'demo',
  }
}

const PARSE_SYSTEM = '你是简历解析专家。只返回要求的 JSON，不要解释。不得编造原文中不存在的信息。'

const PARSE_USER = (text: string) =>
  `将以下简历文本解析为结构化 JSON（缺失字段可省略，不得虚构经历）：

${text.slice(0, 12000)}

返回格式：
{
  "basic": { "name", "phone", "email", "city", "title" },
  "education": [{ "school", "major", "degree", "start", "end" }],
  "experience": [{
    "company", "title", "department", "city", "start", "end",
    "highlights": ["要点1", "要点2"],
    "detail": "工作内容 HTML 或纯文本，保留列表结构"
  }],
  "projects": [{ "name", "role", "desc", "techStack": [], "highlights": ["..."] }],
  "skills": ["..."],
  "selfIntro": "...",
  "honors": [{ "title", "date", "desc" }],
  "certificates": [{ "name", "issuer", "date" }],
  "customSections": [{ "id", "title", "body" }]
}

要求：多段工作经历分开列出；不得把教育/项目合并进经历；skills 仅技术关键词。`

const OPTIMIZE_SYSTEM = `你是资深求职顾问与简历优化专家。
要求：优化措辞、STAR 化项目描述、突出亮点；不得编造具体公司、项目或数据；量化表述用「约」「提升」等合理措辞。
只返回要求的 JSON，不要解释。`

function buildOptimizePrompt(text: string, job?: JobPosting) {
  const jobBlock = job
    ? `\n目标岗位：${job.company} · ${job.title}\n城市：${job.city}\nJD：${job.jd}\n标签：${job.tags.join('、')}`
    : ''
  return `请优化以下简历内容，使其更专业、更有说服力。${jobBlock}

**原始简历**：
${text.slice(0, 10000)}

返回 JSON：
{
  "content": { 同解析格式的结构化简历 },
  "optimizedText": "优化后的完整简历文本（Markdown 风格，分段清晰）",
  "summary": "80-150字简历亮点摘要，用于求职打招呼",
  "suggestions": ["改进建议1", "建议2", "建议3"],
  "changes": [{ "section": "模块名", "before": "原文片段", "after": "优化后片段" }]
}`
}

export async function parseResumeText(text: string): Promise<ResumeParseResult> {
  const trimmed = text.trim()
  if (trimmed.length < 30) {
    throw new Error('简历文本太短（至少 30 字符）')
  }
  if (llmDisabled()) {
    const content = demoParse(trimmed)
    return { content, source: 'demo', fieldCoverage: computeResumeFieldCoverage(content, 'demo') }
  }

  try {
    const raw = await tryCompleteChat(
      [
        { role: 'system', content: PARSE_SYSTEM },
        { role: 'user', content: PARSE_USER(trimmed) },
      ],
      { json: true, maxTokens: 4000 },
    )
    if (!raw) {
      logLlmFallback('parse')
      const content = demoParse(trimmed)
      return { content, source: 'demo', fieldCoverage: computeResumeFieldCoverage(content, 'demo') }
    }
    const parsed = JSON.parse(raw) as { content?: ResumeContent } & ResumeContent
    const content = normalizeContent(parsed.content ?? parsed)
    return {
      content,
      source: 'llm',
      fieldCoverage: computeResumeFieldCoverage(content, 'llm'),
    }
  } catch (err) {
    logLlmFallback('parse', err)
    const content = demoParse(trimmed)
    return { content, source: 'demo', fieldCoverage: computeResumeFieldCoverage(content, 'demo') }
  }
}

export type { ResumeFieldCoverageItem }

export async function optimizeResume(
  input: string | ResumeContent,
  job?: JobPosting,
): Promise<ResumeOptimizeResult> {
  const text = typeof input === 'string' ? input : contentToText(input)
  if (text.trim().length < 30) {
    throw new Error('简历内容太短（至少 30 字符）')
  }
  if (llmDisabled()) return demoOptimize(text, job)

  try {
    const raw = await tryCompleteChat(
      [
        { role: 'system', content: OPTIMIZE_SYSTEM },
        { role: 'user', content: buildOptimizePrompt(text, job) },
      ],
      { json: true, maxTokens: 5000 },
    )
    if (!raw) {
      logLlmFallback('optimize')
      return demoOptimize(text, job)
    }
    const result = JSON.parse(raw) as ResumeOptimizeResult
    const content = normalizeContent(result.content)
    const changes: ResumeOptimizeChange[] = Array.isArray(result.changes)
      ? result.changes.slice(0, 8).map((c) => ({
          section: c.section ?? '其他',
          before: c.before ?? '',
          after: c.after ?? '',
        }))
      : []
    return {
      content,
      optimizedText: (result.optimizedText ?? contentToText(content)).trim(),
      summary: (result.summary ?? content.selfIntro?.slice(0, 150) ?? '').trim(),
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 6) : [],
      changes,
      source: 'llm',
    }
  } catch (err) {
    logLlmFallback('optimize', err)
    return demoOptimize(text, job)
  }
}

const GENERATE_SYSTEM = `你是专业简历撰写专家。根据用户提供的目标职位和个人情况，生成完整、专业的结构化简历。
硬性要求：
- 用户填写的「目标职位」是唯一岗位方向：basic.title 必须与其完全一致，不得改成 Java/后端等其他岗位
- title 字段格式为「{目标职位}-AI」，不得偏离
- 技能、项目描述、工作经历标题必须围绕目标职位（如 AI 开发工程师 → Python/LLM/RAG，而非默认 Java 栈）
- 基于用户提供的信息合理展开与润色，不得编造用户未提及的公司、学校、项目名称
- 若用户未提供姓名，basic.name 留空或使用「候选人」
- 经历与项目用 STAR 法则写 highlights，每条 1-2 句
- 技能列表与目标职位匹配，8-15 项
- 只返回 JSON，不要解释`

/** 演示模式：按目标岗位推断技能栈，避免一律 Java */
export function skillsForTargetJob(targetJob: string): string[] {
  const j = targetJob.toLowerCase()
  if (/ai|人工智能|机器学习|算法|大模型|llm|nlp|深度学习|cv|计算机视觉/.test(j)) {
    return [
      'Python',
      'PyTorch',
      'TensorFlow',
      'LLM',
      'RAG',
      'Prompt Engineering',
      'LangChain',
      '机器学习',
      '深度学习',
      'Git',
    ]
  }
  if (/前端|react|vue|web|h5|小程序/.test(j)) {
    return ['JavaScript', 'TypeScript', 'React', 'Vue', 'HTML/CSS', 'Webpack', 'Node.js', 'Git']
  }
  if (/go|golang/.test(j)) {
    return ['Go', 'Gin', 'gRPC', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'Git']
  }
  if (/java|后端|backend/.test(j)) {
    return ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Kafka', 'Docker', 'Git', 'JVM']
  }
  if (/产品|pm|运营|市场/.test(j)) {
    return ['需求分析', '用户研究', '数据分析', 'SQL', 'Axure', '项目管理', 'A/B 测试', '沟通协作']
  }
  return ['沟通协作', '问题解决', '快速学习', 'Git', '文档撰写', '团队协作', '数据分析', '项目管理']
}

function alignGeneratedToTarget(content: ResumeContent, targetJob: string): ResumeContent {
  return {
    ...content,
    basic: { ...content.basic, title: targetJob },
    skills: content.skills?.length ? content.skills : skillsForTargetJob(targetJob),
  }
}

function resolveGenerateTitle(parsedTitle: string | undefined, targetJob: string): string {
  const expected = `${targetJob}-AI`
  const t = parsedTitle?.trim()
  if (!t) return expected
  if (t.includes(targetJob)) return t.slice(0, 100)
  return expected
}

function buildGeneratePrompt(targetJob: string, personalInfo: string) {
  return `【重要】目标职位（basic.title 与 title 必须严格对应）：${targetJob}

个人情况：
${personalInfo.slice(0, 8000)}

返回 JSON：
{
  "content": {
    "basic": { "name", "phone", "email", "city", "title": "${targetJob}" },
    "education": [{ "school", "major", "degree", "start", "end" }],
    "experience": [{ "company", "title", "start", "end", "highlights": ["..."] }],
    "projects": [{ "name", "role", "desc", "techStack": [], "highlights": ["..."] }],
    "skills": ["与 ${targetJob} 匹配的技能，8-15 项"],
    "selfIntro": "..."
  },
  "title": "${targetJob}-AI",
  "summary": "80-150字亮点摘要，用于求职打招呼",
  "rawText": "完整简历 Markdown 文本，分段清晰"
}`
}

function demoGenerate(targetJob: string, personalInfo: string): ResumeGenerateResult {
  const school = personalInfo.match(/([\u4e00-\u9fa5]{2,12}大学|[\u4e00-\u9fa5]{2,12}学院)/)?.[1]
  const year = personalInfo.match(/20\d{2}/)?.[0] ?? '2020'
  const companies = ['字节跳动', '腾讯', '阿里巴巴', '美团'].filter((c) => personalInfo.includes(c))
  const content: ResumeContent = {
    basic: {
      title: targetJob,
      city: '上海',
    },
    selfIntro: personalInfo.slice(0, 180),
    education: school
      ? [{ school, major: '计算机相关专业', degree: '本科', start: `${Number(year) - 4}`, end: year }]
      : [],
    experience: companies.length
      ? companies.map((company, i) => ({
          company,
          title: `${targetJob}实习生`,
          start: `${Number(year) - 1 + i}`,
          end: i === companies.length - 1 ? '至今' : `${Number(year) + i}`,
          highlights: [
            `参与核心业务模块开发，熟悉 ${targetJob} 相关技术栈`,
            '与团队协作完成需求交付，具备大厂工程规范意识',
          ],
        }))
      : [
          {
            company: '某互联网公司',
            title: targetJob,
            start: year,
            end: '至今',
            highlights: [personalInfo.slice(0, 80)],
          },
        ],
    projects: personalInfo.includes('小程序')
      ? [
          {
            name: '校园社交微信小程序',
            role: '独立开发者',
            desc: '面向在校生的社交与活动组织平台',
            techStack: ['微信小程序', 'Node.js', '云开发'],
            highlights: [
              '独立完成产品设计、开发与上线',
              '实现用户匹配、活动发布等核心功能',
            ],
          },
        ]
      : [],
    skills: skillsForTargetJob(targetJob),
  }
  const rawText = contentToText(content)
  return {
    content,
    title: `${targetJob}-AI`,
    summary: `${year}年毕业${school ? `于${school}` : ''}，目标 ${targetJob}。${personalInfo.slice(0, 60)}…`,
    rawText,
    source: 'demo',
  }
}

export async function generateResume(input: {
  targetJob: string
  personalInfo: string
}): Promise<ResumeGenerateResult> {
  const targetJob = input.targetJob.trim()
  const personalInfo = input.personalInfo.trim()
  if (targetJob.length < 2) throw new Error('请填写目标职位')
  if (personalInfo.length < 10) throw new Error('个人情况至少 10 字')

  if (llmDisabled()) return demoGenerate(targetJob, personalInfo)

  try {
    const raw = await tryCompleteChat(
      [
        { role: 'system', content: GENERATE_SYSTEM },
        { role: 'user', content: buildGeneratePrompt(targetJob, personalInfo) },
      ],
      { json: true, maxTokens: 5000 },
    )
    if (!raw) {
      logLlmFallback('generate')
      return demoGenerate(targetJob, personalInfo)
    }
    const parsed = JSON.parse(raw) as ResumeGenerateResult & { content?: ResumeContent }
    const content = alignGeneratedToTarget(normalizeContent(parsed.content ?? parsed), targetJob)
    return {
      content,
      title: resolveGenerateTitle(parsed.title, targetJob),
      summary: (parsed.summary ?? content.selfIntro?.slice(0, 150) ?? '').trim(),
      rawText: (parsed.rawText ?? contentToText(content)).trim(),
      source: 'llm',
    }
  } catch (err) {
    logLlmFallback('generate', err)
    return demoGenerate(targetJob, personalInfo)
  }
}

export async function extractTextFromFile(buffer: Buffer, ext: string): Promise<string> {
  const { extractTextFromFile: extract } = await import('./resume-extract.js')
  return extract(buffer, ext)
}

export { contentToText }

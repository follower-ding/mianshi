import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  User,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Sparkles,
  Wrench,
  ChevronDown,
  Loader2,
  Award,
  BadgeCheck,
  Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ResumeContent } from '../../api/client'
import { Button } from '../ui/Button'
import { EMPTY_RESUME_CONTENT } from './resumeUtils'
import { resumeUi } from './resumeLayout'
import { SortableList } from './SortableList'
import { SkillTagEditor } from './SkillTagEditor'
import { ResumeRichTextEditor, richTextToPlain } from './ResumeRichTextEditor'
import { ResumeFormField } from './ResumeFormField'
import { useToast } from '../../contexts/ToastContext'
import { reorderList } from './resumeSortable'
import { AvatarCropModal } from './AvatarCropModal'
import { readImageFile } from './avatarCrop'
import {
  AVATAR_SHAPE_OPTIONS,
  FIELD_VISIBILITY_OPTIONS,
  type AvatarShape,
  type ResumeBasicFieldVisibility,
} from './resumeBasicHelpers'
import { DEFAULT_SECTION_ORDER, type ResumeSectionKey } from './resumeSections'

type SectionId = ResumeSectionKey

type Props = {
  content: ResumeContent
  onChange: (content: ResumeContent) => void
  visibleSections?: Partial<Record<SectionId, boolean>>
  scrollToSection?: SectionId | null
  sectionOrder?: SectionId[]
  onOptimizeSection?: (section: SectionId) => void
  optimizingSection?: SectionId | null
}

function experienceDetail(exp: { detail?: string; highlights?: string[] }) {
  if (exp.detail?.trim()) return exp.detail
  if (exp.highlights?.length) {
    return `<ul>${exp.highlights.map((h) => `<li>${h.replace(/</g, '&lt;')}</li>`).join('')}</ul>`
  }
  return ''
}

function newKey() {
  return crypto.randomUUID()
}

function syncKeys(prev: string[], targetLen: number): string[] {
  if (prev.length === targetLen) return prev
  if (prev.length < targetLen) {
    return [...prev, ...Array.from({ length: targetLen - prev.length }, newKey)]
  }
  return prev.slice(0, targetLen)
}

function Section({
  id,
  title,
  icon: Icon,
  count,
  open,
  onToggle,
  onAiOptimize,
  aiOptimizing,
  children,
}: {
  id: SectionId
  title: string
  icon: LucideIcon
  count?: number
  open: boolean
  onToggle: (id: SectionId) => void
  onAiOptimize?: () => void
  aiOptimizing?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={resumeUi.sectionCard}>
      <div className="flex items-center gap-2 pr-2">
        <button type="button" className={`${resumeUi.sectionHeader} flex-1`} onClick={() => onToggle(id)}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-text">{title}</span>
            {count != null && count > 0 && (
              <span className="ml-2 text-[11px] font-normal text-muted">{count} 项</span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {onAiOptimize && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 !px-2 !py-1 text-xs"
            disabled={aiOptimizing}
            onClick={onAiOptimize}
          >
            {aiOptimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI 优化
          </Button>
        )}
      </div>
      {open && <div className="space-y-3 border-t border-border/50 px-4 py-4">{children}</div>}
    </div>
  )
}

export function ResumeEditor({
  content,
  onChange,
  visibleSections,
  scrollToSection,
  sectionOrder,
  onOptimizeSection,
  optimizingSection,
}: Props) {
  const { showToast } = useToast()
  const c = content ?? EMPTY_RESUME_CONTENT
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({})

  const show = (id: SectionId) => visibleSections?.[id] !== false
  const basic = c.basic ?? {}
  const experience = c.experience ?? []
  const projects = c.projects ?? []
  const education = c.education ?? []
  const honors = c.honors ?? []
  const certificates = c.certificates ?? []
  const customSections = c.customSections ?? []

  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    basic: true,
    intro: true,
    experience: true,
    projects: false,
    education: false,
    skills: false,
    honors: false,
    certificates: false,
    custom: false,
  })

  const [expKeys, setExpKeys] = useState<string[]>([])
  const [projKeys, setProjKeys] = useState<string[]>([])
  const [eduKeys, setEduKeys] = useState<string[]>([])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setExpKeys((k) => syncKeys(k, experience.length)), [experience.length])
  useEffect(() => setProjKeys((k) => syncKeys(k, projects.length)), [projects.length])
  useEffect(() => setEduKeys((k) => syncKeys(k, education.length)), [education.length])

  useEffect(() => {
    if (!scrollToSection) return
    const el = sectionRefs.current[scrollToSection]
    if (el) {
      setOpenSections((prev) => ({ ...prev, [scrollToSection]: true }))
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [scrollToSection])

  const toggle = (id: SectionId) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))

  const patch = (partial: Partial<ResumeContent>) => onChange({ ...c, ...partial })

  const patchFieldVisibility = (key: keyof ResumeBasicFieldVisibility, value: boolean) => {
    patch({
      basic: {
        ...basic,
        fieldVisibility: { ...basic.fieldVisibility, [key]: value },
      },
    })
  }

  const handleAvatarFile = async (file: File) => {
    try {
      const src = await readImageFile(file)
      setCropSrc(src)
      setCropOpen(true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取图片失败', 'error')
    }
  }

  const removeAt = useCallback(
    (field: 'experience' | 'projects' | 'education', index: number) => {
      const list = c[field] ?? []
      patch({ [field]: list.filter((_, j) => j !== index) })
      if (field === 'experience') setExpKeys((k) => k.filter((_, j) => j !== index))
      if (field === 'projects') setProjKeys((k) => k.filter((_, j) => j !== index))
      if (field === 'education') setEduKeys((k) => k.filter((_, j) => j !== index))
    },
    [c, patch],
  )

  const ord = sectionOrder ?? DEFAULT_SECTION_ORDER
  const flexOrder = (id: SectionId) => {
    if (id === 'basic') return 0
    const idx = ord.indexOf(id)
    return idx >= 0 ? 10 + idx : 99
  }
  const ai = (id: SectionId) => ({
    onAiOptimize: onOptimizeSection ? () => onOptimizeSection(id) : undefined,
    aiOptimizing: optimizingSection === id,
  })

  return (
    <div className="flex flex-col gap-3">
      {show('basic') && (
      <div style={{ order: flexOrder('basic') }} ref={(el) => { sectionRefs.current.basic = el }}>
      <Section id="basic" title="基本信息" icon={User} open={openSections.basic} onToggle={toggle} {...ai('basic')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ResumeFormField label="姓名">
            <input
              className={resumeUi.input}
              placeholder="请输入姓名"
              value={basic.name ?? ''}
              onChange={(e) => patch({ basic: { ...basic, name: e.target.value } })}
            />
          </ResumeFormField>
          <ResumeFormField label="目标岗位">
            <input
              className={resumeUi.input}
              placeholder="如 AI 开发工程师"
              value={basic.title ?? ''}
              onChange={(e) => patch({ basic: { ...basic, title: e.target.value } })}
            />
          </ResumeFormField>
          <ResumeFormField label="所在城市">
            <input
              className={resumeUi.input}
              placeholder="如 上海"
              value={basic.city ?? ''}
              onChange={(e) => patch({ basic: { ...basic, city: e.target.value } })}
            />
          </ResumeFormField>
          <ResumeFormField label="手机号码">
            <input
              className={resumeUi.input}
              placeholder="11 位手机号"
              value={basic.phone ?? ''}
              onChange={(e) => patch({ basic: { ...basic, phone: e.target.value } })}
            />
          </ResumeFormField>
          <ResumeFormField label="电子邮箱" className="sm:col-span-2">
            <input
              className={resumeUi.input}
              type="email"
              placeholder="name@example.com"
              value={basic.email ?? ''}
              onChange={(e) => patch({ basic: { ...basic, email: e.target.value } })}
            />
          </ResumeFormField>
          <ResumeFormField label="头像" hint="JPG/PNG/WebP · 支持裁剪" className="sm:col-span-2">
            <div className="flex flex-wrap items-start gap-4">
              {basic.avatarUrl ? (
                <img
                  src={basic.avatarUrl}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-border/60"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-elevated text-xs text-muted">
                  无头像
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {basic.avatarUrl ? '更换头像' : '上传头像'}
                  </Button>
                  {basic.avatarUrl && (
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-danger"
                      onClick={() => patch({ basic: { ...basic, avatarUrl: undefined } })}
                    >
                      移除
                    </button>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void handleAvatarFile(f)
                  }}
                />
                <label className="text-xs text-muted">头像形状（预览）</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_SHAPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs ${
                        (basic.avatarShape ?? 'rounded') === opt.id
                          ? 'bg-brand/15 font-medium text-brand'
                          : 'bg-elevated text-muted hover:text-text'
                      }`}
                      onClick={() => patch({ basic: { ...basic, avatarShape: opt.id as AvatarShape } })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ResumeFormField>
          <ResumeFormField label="预览显示" hint="控制简历预览区是否展示对应字段" className="sm:col-span-2">
            <div className="flex flex-wrap gap-3">
              {FIELD_VISIBILITY_OPTIONS.map(({ key, label }) => {
                const checked = basic.fieldVisibility?.[key] !== false
                return (
                  <label
                    key={key}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => patchFieldVisibility(key, e.target.checked)}
                      className="accent-brand"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </ResumeFormField>
        </div>
      </Section>
      </div>
      )}

      <AvatarCropModal
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={() => {
          setCropOpen(false)
          setCropSrc(null)
        }}
        onConfirm={(avatarUrl) => {
          patch({ basic: { ...basic, avatarUrl, fieldVisibility: { ...basic.fieldVisibility, avatar: true } } })
          setCropOpen(false)
          setCropSrc(null)
        }}
      />

      {show('intro') && (
      <div style={{ order: flexOrder('intro') }} ref={(el) => { sectionRefs.current.intro = el }}>
      <Section id="intro" title="个人简介" icon={Sparkles} open={openSections.intro} onToggle={toggle} {...ai('intro')}>
        <ResumeRichTextEditor
          value={c.selfIntro ?? ''}
          onChange={(html) => patch({ selfIntro: html })}
          placeholder="用 2–3 句话概括你的核心优势与求职方向…"
          minHeight={140}
        />
      </Section>
      </div>
      )}

      {show('experience') && (
      <div style={{ order: flexOrder('experience') }} ref={(el) => { sectionRefs.current.experience = el }}>
      <Section
        id="experience"
        title="工作经历"
        icon={Briefcase}
        count={experience.length}
        open={openSections.experience}
        onToggle={toggle}
        {...ai('experience')}
      >
        {experience.length > 0 && (
          <p className="mb-2 text-[11px] text-muted">拖拽手柄或 ↑↓ 调整顺序，预览区同步更新</p>
        )}
        {experience.length > 0 ? (
          <SortableList
            items={experience}
            getKey={(_, i) => expKeys[i] ?? String(i)}
            onReorder={(next, { from, to }) => {
              patch({ experience: next })
              setExpKeys((k) => reorderList(k, from, to))
            }}
            itemClassName="rounded-lg border border-border/60 bg-elevated/50 p-3.5"
            renderItem={(exp, i) => (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    onClick={() => removeAt('experience', i)}
                    aria-label="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResumeFormField label="公司名称">
                    <input
                      className={resumeUi.input}
                      placeholder="如 字节跳动"
                      value={exp.company}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, company: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="岗位名称">
                    <input
                      className={resumeUi.input}
                      placeholder="如 AI 开发工程师"
                      value={exp.title}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, title: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="部门名称">
                    <input
                      className={resumeUi.input}
                      placeholder="如 基础架构部"
                      value={exp.department ?? ''}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, department: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="工作城市">
                    <input
                      className={resumeUi.input}
                      placeholder="如 上海"
                      value={exp.city ?? ''}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, city: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="开始时间">
                    <input
                      className={resumeUi.input}
                      placeholder="如 2022-06"
                      value={exp.start ?? ''}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, start: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="结束时间">
                    <input
                      className={resumeUi.input}
                      placeholder="如 至今"
                      value={exp.end ?? ''}
                      onChange={(e) => {
                        const list = [...experience]
                        list[i] = { ...exp, end: e.target.value }
                        patch({ experience: list })
                      }}
                    />
                  </ResumeFormField>
                </div>
                <ResumeFormField label="工作内容" hint="支持加粗、列表；建议用 STAR 法则描述成果">
                  <ResumeRichTextEditor
                    value={experienceDetail(exp)}
                    onChange={(html) => {
                      const list = [...experience]
                      list[i] = { ...exp, detail: html, highlights: [] }
                      patch({ experience: list })
                    }}
                    placeholder="描述职责与成果，可使用列表条目…"
                    minHeight={140}
                  />
                </ResumeFormField>
              </div>
            )}
          />
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            patch({
              experience: [...experience, { company: '', title: '', highlights: [''] }],
            })
            setExpKeys((k) => [...k, newKey()])
          }}
        >
          <Plus className="h-3.5 w-3.5" /> 添加工作经历
        </Button>
      </Section>
      </div>
      )}

      {show('projects') && (
      <div style={{ order: flexOrder('projects') }} ref={(el) => { sectionRefs.current.projects = el }}>
      <Section
        id="projects"
        title="项目经历"
        icon={FolderKanban}
        count={projects.length}
        open={openSections.projects}
        onToggle={toggle}
        {...ai('projects')}
      >
        {projects.length > 0 && (
          <p className="mb-2 text-[11px] text-muted">拖拽手柄或 ↑↓ 调整顺序</p>
        )}
        {projects.length > 0 ? (
          <SortableList
            items={projects}
            getKey={(_, i) => projKeys[i] ?? String(i)}
            onReorder={(next, { from, to }) => {
              patch({ projects: next })
              setProjKeys((k) => reorderList(k, from, to))
            }}
            itemClassName="rounded-lg border border-border/60 bg-elevated/50 p-3.5"
            renderItem={(proj, i) => (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted hover:text-danger"
                    onClick={() => removeAt('projects', i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ResumeFormField label="项目名称">
                  <input
                    className={resumeUi.input}
                    placeholder="如 RAG 知识库问答"
                    value={proj.name}
                    onChange={(e) => {
                      const list = [...projects]
                      list[i] = { ...proj, name: e.target.value }
                      patch({ projects: list })
                    }}
                  />
                </ResumeFormField>
                <ResumeFormField label="担任角色">
                  <input
                    className={resumeUi.input}
                    placeholder="如 核心开发"
                    value={proj.role ?? ''}
                    onChange={(e) => {
                      const list = [...projects]
                      list[i] = { ...proj, role: e.target.value }
                      patch({ projects: list })
                    }}
                  />
                </ResumeFormField>
                <ResumeFormField label="项目描述">
                  <ResumeRichTextEditor
                    value={proj.desc ?? ''}
                    onChange={(html) => {
                      const list = [...projects]
                      list[i] = { ...proj, desc: html }
                      patch({ projects: list })
                    }}
                    placeholder="项目背景、技术方案与成果…"
                    minHeight={100}
                  />
                </ResumeFormField>
                <ResumeFormField label="项目亮点" hint="支持列表条目">
                  <ResumeRichTextEditor
                    value={
                      proj.highlights.length
                        ? `<ul>${proj.highlights.map((h) => `<li>${h.replace(/</g, '&lt;')}</li>`).join('')}</ul>`
                        : ''
                    }
                    onChange={(html) => {
                      const list = [...projects]
                      const div = document.createElement('div')
                      div.innerHTML = html
                      const items = Array.from(div.querySelectorAll('li')).map((li) => li.textContent?.trim() ?? '')
                      list[i] = {
                        ...proj,
                        highlights: items.length ? items.filter(Boolean) : [richTextToPlain(html)].filter(Boolean),
                      }
                      patch({ projects: list })
                    }}
                    placeholder="量化成果、技术难点…"
                    minHeight={100}
                  />
                </ResumeFormField>
              </div>
            )}
          />
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            patch({ projects: [...projects, { name: '', highlights: [''] }] })
            setProjKeys((k) => [...k, newKey()])
          }}
        >
          <Plus className="h-3.5 w-3.5" /> 添加项目
        </Button>
      </Section>
      </div>
      )}

      {show('education') && (
      <div style={{ order: flexOrder('education') }} ref={(el) => { sectionRefs.current.education = el }}>
      <Section
        id="education"
        title="教育背景"
        icon={GraduationCap}
        count={education.length}
        open={openSections.education}
        onToggle={toggle}
        {...ai('education')}
      >
        {education.length > 0 && (
          <p className="mb-2 text-[11px] text-muted">拖拽手柄或 ↑↓ 调整顺序</p>
        )}
        {education.length > 0 ? (
          <SortableList
            items={education}
            getKey={(_, i) => eduKeys[i] ?? String(i)}
            onReorder={(next, { from, to }) => {
              patch({ education: next })
              setEduKeys((k) => reorderList(k, from, to))
            }}
            itemClassName="rounded-lg border border-border/60 bg-elevated/50 p-3.5"
            renderItem={(edu, i) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResumeFormField label="学校名称">
                    <input
                      className={resumeUi.input}
                      placeholder="如 上海交通大学"
                      value={edu.school}
                      onChange={(e) => {
                        const list = [...education]
                        list[i] = { ...edu, school: e.target.value }
                        patch({ education: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="专业">
                    <input
                      className={resumeUi.input}
                      placeholder="如 计算机科学与技术"
                      value={edu.major ?? ''}
                      onChange={(e) => {
                        const list = [...education]
                        list[i] = { ...edu, major: e.target.value }
                        patch({ education: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="学历">
                    <input
                      className={resumeUi.input}
                      placeholder="如 本科 / 硕士"
                      value={edu.degree ?? ''}
                      onChange={(e) => {
                        const list = [...education]
                        list[i] = { ...edu, degree: e.target.value }
                        patch({ education: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="入学时间">
                    <input
                      className={resumeUi.input}
                      placeholder="如 2018-09"
                      value={edu.start ?? ''}
                      onChange={(e) => {
                        const list = [...education]
                        list[i] = { ...edu, start: e.target.value }
                        patch({ education: list })
                      }}
                    />
                  </ResumeFormField>
                  <ResumeFormField label="毕业时间">
                    <input
                      className={resumeUi.input}
                      placeholder="如 2022-06"
                      value={edu.end ?? ''}
                      onChange={(e) => {
                        const list = [...education]
                        list[i] = { ...edu, end: e.target.value }
                        patch({ education: list })
                      }}
                    />
                  </ResumeFormField>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted transition-colors hover:text-danger"
                  onClick={() => removeAt('education', i)}
                >
                  删除此项
                </button>
              </div>
            )}
          />
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            patch({ education: [...education, { school: '' }] })
            setEduKeys((k) => [...k, newKey()])
          }}
        >
          <Plus className="h-3.5 w-3.5" /> 添加教育经历
        </Button>
      </Section>
      </div>
      )}

      {show('honors') && (
      <div style={{ order: flexOrder('honors') }} ref={(el) => { sectionRefs.current.honors = el }}>
      <Section id="honors" title="荣誉奖项" icon={Award} count={honors.length} open={openSections.honors} onToggle={toggle} {...ai('honors')}>
        {honors.map((h, i) => (
          <div key={i} className="mb-3 grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
            <ResumeFormField label="奖项名称">
              <input className={resumeUi.input} value={h.title} onChange={(e) => {
                const list = [...honors]; list[i] = { ...h, title: e.target.value }; patch({ honors: list })
              }} />
            </ResumeFormField>
            <ResumeFormField label="时间">
              <input className={resumeUi.input} value={h.date ?? ''} onChange={(e) => {
                const list = [...honors]; list[i] = { ...h, date: e.target.value }; patch({ honors: list })
              }} />
            </ResumeFormField>
            <ResumeFormField label="说明" className="sm:col-span-2">
              <input className={resumeUi.input} value={h.desc ?? ''} onChange={(e) => {
                const list = [...honors]; list[i] = { ...h, desc: e.target.value }; patch({ honors: list })
              }} />
            </ResumeFormField>
            <button type="button" className="text-xs text-muted hover:text-danger sm:col-span-2" onClick={() => patch({ honors: honors.filter((_, j) => j !== i) })}>删除</button>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="w-full" onClick={() => patch({ honors: [...honors, { title: '' }] })}>
          <Plus className="h-3.5 w-3.5" /> 添加荣誉
        </Button>
      </Section>
      </div>
      )}

      {show('certificates') && (
      <div style={{ order: flexOrder('certificates') }} ref={(el) => { sectionRefs.current.certificates = el }}>
      <Section id="certificates" title="证书资质" icon={BadgeCheck} count={certificates.length} open={openSections.certificates} onToggle={toggle} {...ai('certificates')}>
        {certificates.map((cert, i) => (
          <div key={i} className="mb-3 grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
            <ResumeFormField label="证书名称">
              <input className={resumeUi.input} value={cert.name} onChange={(e) => {
                const list = [...certificates]; list[i] = { ...cert, name: e.target.value }; patch({ certificates: list })
              }} />
            </ResumeFormField>
            <ResumeFormField label="发证机构">
              <input className={resumeUi.input} value={cert.issuer ?? ''} onChange={(e) => {
                const list = [...certificates]; list[i] = { ...cert, issuer: e.target.value }; patch({ certificates: list })
              }} />
            </ResumeFormField>
            <ResumeFormField label="时间">
              <input className={resumeUi.input} value={cert.date ?? ''} onChange={(e) => {
                const list = [...certificates]; list[i] = { ...cert, date: e.target.value }; patch({ certificates: list })
              }} />
            </ResumeFormField>
            <button type="button" className="text-xs text-muted hover:text-danger sm:col-span-2" onClick={() => patch({ certificates: certificates.filter((_, j) => j !== i) })}>删除</button>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="w-full" onClick={() => patch({ certificates: [...certificates, { name: '' }] })}>
          <Plus className="h-3.5 w-3.5" /> 添加证书
        </Button>
      </Section>
      </div>
      )}

      {show('custom') && (
      <div style={{ order: flexOrder('custom') }} ref={(el) => { sectionRefs.current.custom = el }}>
      <Section id="custom" title="自定义模块" icon={Layers} count={customSections.length} open={openSections.custom} onToggle={toggle} {...ai('custom')}>
        {customSections.map((cs, i) => (
          <div key={cs.id} className="mb-3 space-y-2 rounded-lg border border-border/60 p-3">
            <ResumeFormField label="模块标题">
              <input className={resumeUi.input} value={cs.title} onChange={(e) => {
                const list = [...customSections]; list[i] = { ...cs, title: e.target.value }; patch({ customSections: list })
              }} />
            </ResumeFormField>
            <ResumeRichTextEditor value={cs.body ?? ''} onChange={(html) => {
              const list = [...customSections]; list[i] = { ...cs, body: html }; patch({ customSections: list })
            }} minHeight={100} />
            <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => patch({ customSections: customSections.filter((_, j) => j !== i) })}>删除模块</button>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="w-full" onClick={() => patch({ customSections: [...customSections, { id: newKey(), title: '自定义模块', body: '' }] })}>
          <Plus className="h-3.5 w-3.5" /> 添加自定义模块
        </Button>
      </Section>
      </div>
      )}

      {show('skills') && (
      <div style={{ order: flexOrder('skills') }} ref={(el) => { sectionRefs.current.skills = el }}>
      <Section
        id="skills"
        title="专业技能"
        icon={Wrench}
        count={c.skills?.length}
        open={openSections.skills}
        onToggle={toggle}
        {...ai('skills')}
      >
        <SkillTagEditor
          skills={c.skills ?? []}
          onChange={(skills) => patch({ skills })}
        />
      </Section>
      </div>
      )}
    </div>
  )
}

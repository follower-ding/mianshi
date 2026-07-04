import type { ReactNode } from 'react'
import type { ResumeContent } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import type { ResumeSectionKey } from './resumeSections'
import {
  layoutClass,
  resolvePreviewOptions,
  sectionHeadClass,
  templateRootClass,
  type ResumePreviewSettings,
} from './resumePreviewSettings'
import {
  avatarShapeClass,
  formatContactLine,
  resolveFieldVisibility,
} from './resumeBasicHelpers'
import { highlightKeywords } from './resumeHighlight'
import { richTextToPlain } from './ResumeRichTextEditor'
import { publicSafeRichText } from './sanitizePublicHtml'
import { PreviewEditableSection } from './PreviewEditableSection'
import './templates/resume-base.css'
import './templates/resume-templates.css'

const SIDEBAR_SECTIONS: ResumeSectionKey[] = ['skills', 'intro']

type Props = {
  content: ResumeContent
  templateId: ResumeTemplateId
  sectionOrder: ResumeSectionKey[]
  previewSettings?: Partial<ResumePreviewSettings> | null
  editable?: boolean
  activeSection?: ResumeSectionKey | null
  onSectionClick?: (key: ResumeSectionKey) => void
  onMoveSection?: (key: ResumeSectionKey, direction: 'up' | 'down') => void
  onHideSection?: (key: ResumeSectionKey) => void
  /** 公开分享页：禁止 raw HTML 渲染，防 XSS */
  publicSafe?: boolean
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="resume-doc__section-head">
      <span className="resume-doc__section-bar" aria-hidden />
      <span className="resume-doc__section-icon" aria-hidden />
      <h2 className="resume-doc__section-title">{title}</h2>
    </div>
  )
}

function Block({
  sectionKey,
  orderIndex,
  orderLen,
  editable,
  active,
  onSectionClick,
  onMoveSection,
  onHideSection,
  children,
  pad = true,
}: {
  sectionKey: ResumeSectionKey
  orderIndex: number
  orderLen: number
  editable?: boolean
  active?: boolean
  onSectionClick?: (key: ResumeSectionKey) => void
  onMoveSection?: (key: ResumeSectionKey, direction: 'up' | 'down') => void
  onHideSection?: (key: ResumeSectionKey) => void
  children: ReactNode
  pad?: boolean
}) {
  return (
    <PreviewEditableSection
      sectionKey={sectionKey}
      editable={editable}
      active={active}
      onClick={onSectionClick}
      onEdit={onSectionClick}
      onMoveUp={(k) => onMoveSection?.(k, 'up')}
      onMoveDown={(k) => onMoveSection?.(k, 'down')}
      onHide={onHideSection}
      canMoveUp={orderIndex > 0}
      canMoveDown={orderIndex < orderLen - 1}
      className={`resume-doc__section ${pad ? '-mx-2 px-2 py-1' : ''}`}
    >
      {children}
    </PreviewEditableSection>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="resume-doc__bullets">
      {items.map((h, j) => (
        <li key={j}>{highlightKeywords(h)}</li>
      ))}
    </ul>
  )
}

function IntroBlock({ text, publicSafe }: { text: string; publicSafe?: boolean }) {
  const safe = publicSafeRichText(text, publicSafe)
  if (!publicSafe && text.includes('<')) {
    return (
      <div
        className="resume-doc__intro resume-doc__bullets [&_li]:list-item"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }
  return <p className="resume-doc__intro">{highlightKeywords(safe)}</p>
}

function hasSectionContent(content: ResumeContent, key: ResumeSectionKey): boolean {
  switch (key) {
    case 'intro':
      return Boolean(richTextToPlain(content.selfIntro ?? '').trim())
    case 'education':
      return (content.education?.length ?? 0) > 0
    case 'skills':
      return (content.skills?.length ?? 0) > 0
    case 'experience':
      return (content.experience?.length ?? 0) > 0
    case 'projects':
      return (content.projects?.length ?? 0) > 0
    case 'honors':
      return (content.honors?.length ?? 0) > 0
    case 'certificates':
      return (content.certificates?.length ?? 0) > 0
    case 'custom':
      return (content.customSections?.length ?? 0) > 0
    default:
      return false
  }
}

/** 简历预览 — CSS 模板驱动 */
export function ProMinimalPreview({
  content,
  templateId,
  sectionOrder,
  previewSettings,
  editable,
  activeSection,
  onSectionClick,
  onMoveSection,
  onHideSection,
  publicSafe,
}: Props) {
  const b = content.basic ?? {}
  const tplClass = templateRootClass(templateId)
  const { layout, sectionHeadStyle } = resolvePreviewOptions(templateId, previewSettings)
  const isSidebar = layout === 'sidebar-left'
  const isActive = (k: ResumeSectionKey) => activeSection === k

  const ordered = sectionOrder.filter((key) => hasSectionContent(content, key))

  const sidebarKeys = isSidebar ? ordered.filter((k) => SIDEBAR_SECTIONS.includes(k)) : []
  const mainKeys = isSidebar
    ? ordered.filter((k) => !SIDEBAR_SECTIONS.includes(k))
    : ordered

  const renderSection = (key: ResumeSectionKey, orderIndex: number, orderLen: number) => {
    const common = {
      sectionKey: key,
      orderIndex,
      orderLen,
      editable,
      active: isActive(key),
      onSectionClick,
      onMoveSection,
      onHideSection,
    }

    switch (key) {
      case 'education':
        return (
          <Block key={key} {...common}>
            <SectionHead title="教育背景" />
            {content.education!.map((e, i) => (
              <div key={i} className="resume-doc__row">
                <span>
                  <strong>{e.school}</strong>
                  {e.major ? ` · ${e.major}` : ''}
                  {e.degree ? ` · ${e.degree}` : ''}
                </span>
                <span className="resume-doc__date">
                  {e.start}-{e.end}
                </span>
              </div>
            ))}
          </Block>
        )
      case 'skills':
        return (
          <Block key={key} {...common}>
            <SectionHead title="专业技能" />
            <div className="resume-doc__skills">
              {content.skills!.map((s, i) => (
                <span key={i} className="resume-doc__skill-tag">
                  {highlightKeywords(s)}
                </span>
              ))}
            </div>
          </Block>
        )
      case 'intro':
        return (
          <Block key={key} {...common}>
            <SectionHead title="个人简介" />
            <IntroBlock text={content.selfIntro ?? ''} publicSafe={publicSafe} />
          </Block>
        )
      case 'experience':
        return (
          <Block key={key} {...common}>
            <SectionHead title="工作经历" />
            {content.experience!.map((e, i) => (
              <div key={i} className="resume-doc__entry">
                <div className="resume-doc__entry-head">
                  <span>
                    {e.company}
                    {e.title ? ` · ${e.title}` : ''}
                    {e.department ? ` · ${e.department}` : ''}
                    {e.city ? ` · ${e.city}` : ''}
                  </span>
                  <span className="resume-doc__entry-date">
                    {e.start}-{e.end}
                  </span>
                </div>
                {e.detail?.trim() ? (
                  publicSafe || !e.detail.includes('<') ? (
                    <p className="resume-doc__intro" style={{ marginTop: 4 }}>
                      {highlightKeywords(publicSafeRichText(e.detail, publicSafe))}
                    </p>
                  ) : (
                    <div
                      className="resume-doc__intro resume-doc__bullets [&_li]:list-item"
                      dangerouslySetInnerHTML={{ __html: e.detail }}
                    />
                  )
                ) : (
                  <BulletList items={e.highlights} />
                )}
              </div>
            ))}
          </Block>
        )
      case 'projects':
        return (
          <Block key={key} {...common}>
            <SectionHead title="项目经历" />
            {content.projects!.map((p, i) => (
              <div key={i} className="resume-doc__entry">
                <div className="resume-doc__entry-head">
                  <span>
                    {p.name}
                    {p.role ? ` · ${p.role}` : ''}
                  </span>
                </div>
                {p.desc && (
                  <p className="resume-doc__intro" style={{ marginTop: 4 }}>
                    {highlightKeywords(richTextToPlain(p.desc))}
                  </p>
                )}
                <BulletList items={p.highlights} />
              </div>
            ))}
          </Block>
        )
      case 'honors':
        return (
          <Block key={key} {...common}>
            <SectionHead title="荣誉奖项" />
            {content.honors!.map((h, i) => (
              <div key={i} className="resume-doc__row">
                <span>
                  <strong>{h.title}</strong>
                  {h.desc ? ` · ${h.desc}` : ''}
                </span>
                <span className="resume-doc__date">{h.date}</span>
              </div>
            ))}
          </Block>
        )
      case 'certificates':
        return (
          <Block key={key} {...common}>
            <SectionHead title="证书资质" />
            {content.certificates!.map((c, i) => (
              <div key={i} className="resume-doc__row">
                <span>
                  <strong>{c.name}</strong>
                  {c.issuer ? ` · ${c.issuer}` : ''}
                </span>
                <span className="resume-doc__date">{c.date}</span>
              </div>
            ))}
          </Block>
        )
      case 'custom':
        return (
          <>
            {content.customSections!.map((cs) => (
              <Block key={cs.id} {...common} sectionKey="custom">
                <SectionHead title={cs.title || '自定义模块'} />
                {cs.body?.includes('<') && !publicSafe ? (
                  <div
                    className="resume-doc__intro resume-doc__bullets [&_li]:list-item"
                    dangerouslySetInnerHTML={{ __html: cs.body }}
                  />
                ) : (
                  <IntroBlock text={cs.body ?? ''} publicSafe={publicSafe} />
                )}
              </Block>
            ))}
          </>
        )
      default:
        return null
    }
  }

  const renderBasicHeader = () => {
    const vis = resolveFieldVisibility(b)
    const contact = formatContactLine(b, vis)
    const shapeCls = avatarShapeClass(b.avatarShape)
    const showAvatar = vis.avatar && (b.avatarUrl || b.name)
    const showHeader =
      Boolean(b.name?.trim()) ||
      (vis.title && Boolean(b.title?.trim())) ||
      Boolean(contact) ||
      (showAvatar && Boolean(b.avatarUrl))

    if (!showHeader && !editable) return null

    return (
      <Block
        sectionKey="basic"
        orderIndex={-1}
        orderLen={0}
        editable={editable}
        active={isActive('basic')}
        onSectionClick={onSectionClick}
        onHideSection={onHideSection}
        pad={false}
      >
        <div className={`resume-doc__header ${editable ? 'p-2' : ''}`}>
          {showAvatar &&
            (b.avatarUrl ? (
              <img
                src={b.avatarUrl}
                alt=""
                className={`resume-doc__avatar resume-doc__avatar--photo ${shapeCls}`.trim()}
              />
            ) : (
              <div className={`resume-doc__avatar ${shapeCls}`.trim()}>
                {(b.name ?? '简').trim().slice(0, 1)}
              </div>
            ))}
          <div style={{ flex: 1, minWidth: 0, paddingTop: isSidebar && !showAvatar ? 0 : isSidebar ? 0 : 4 }}>
            <h1 className="resume-doc__name">{b.name || '姓名'}</h1>
            {vis.title && b.title && <p className="resume-doc__title">{b.title}</p>}
            {contact && <p className="resume-doc__contact">{contact}</p>}
          </div>
        </div>
      </Block>
    )
  }

  const rootClass = [
    'resume-doc',
    tplClass,
    sectionHeadClass(sectionHeadStyle),
    layoutClass(layout),
  ]
    .filter(Boolean)
    .join(' ')

  if (isSidebar) {
    return (
      <div className={rootClass}>
        <div className="resume-doc__sidebar">
          {renderBasicHeader()}
          {sidebarKeys.map((key, i) => renderSection(key, i, sidebarKeys.length))}
        </div>
        <div className="resume-doc__main">
          {mainKeys.map((key, i) => renderSection(key, i, mainKeys.length))}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      {renderBasicHeader()}
      {ordered.map((key, i) => renderSection(key, i, ordered.length))}
    </div>
  )
}

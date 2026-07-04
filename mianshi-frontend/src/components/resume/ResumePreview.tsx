import type { ResumeContent } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'

type PreviewProps = {
  content: ResumeContent
  templateId: ResumeTemplateId
  scale?: number
  className?: string
}

function SectionTitle({ children, accent }: { children: string; accent?: string }) {
  return (
    <h2
      className="text-sm font-bold uppercase tracking-wider mb-2"
      style={{ color: accent ?? '#1e293b', borderBottom: `2px solid ${accent ?? '#e2e8f0'}`, paddingBottom: 4 }}
    >
      {children}
    </h2>
  )
}

type NormalizedResumeContent = ResumeContent & {
  education: NonNullable<ResumeContent['education']>
  experience: NonNullable<ResumeContent['experience']>
  projects: NonNullable<ResumeContent['projects']>
  skills: NonNullable<ResumeContent['skills']>
}

function ClassicPreview({ content }: { content: NormalizedResumeContent }) {
  const b = content.basic
  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1e293b', fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>{b?.name || '姓名'}</h1>
        <p style={{ margin: '8px 0 0', color: '#475569' }}>{b?.title || '目标岗位'}</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
          {[b?.city, b?.phone, b?.email].filter(Boolean).join(' · ')}
        </p>
      </div>
      {content.selfIntro && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>个人简介</SectionTitle>
          <p>{content.selfIntro}</p>
        </div>
      )}
      {(content.experience?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>工作经历</SectionTitle>
          {content.experience!.map((e, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{e.company} · {e.title}</span>
                <span style={{ color: '#64748b', fontWeight: 400 }}>{e.start}-{e.end}</span>
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {(content.projects?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>项目经历</SectionTitle>
          {content.projects!.map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong>{p.name}</strong>{p.role ? ` · ${p.role}` : ''}
              {p.desc && <p style={{ margin: '2px 0' }}>{p.desc}</p>}
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {p.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {(content.education?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>教育背景</SectionTitle>
          {content.education!.map((e, i) => (
            <p key={i} style={{ margin: '4px 0' }}>
              {e.school} · {e.major} · {e.degree} ({e.start}-{e.end})
            </p>
          ))}
        </div>
      )}
      {(content.skills?.length ?? 0) > 0 && (
        <div>
          <SectionTitle>专业技能</SectionTitle>
          <p>{content.skills!.join(' · ')}</p>
        </div>
      )}
    </div>
  )
}

function TechPreview({ content }: { content: NormalizedResumeContent }) {
  const b = content.basic
  const accent = '#0891b2'
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700 }}>{b?.name || '姓名'}</h1>
        <p style={{ margin: '4px 0', color: accent, fontWeight: 600 }}>{b?.title || '目标岗位'}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          {[b?.city, b?.phone, b?.email].filter(Boolean).join(' | ')}
        </p>
      </div>
      {content.skills?.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {content.skills.map((s, i) => (
            <span key={i} style={{ background: '#ecfeff', color: accent, padding: '2px 10px', borderRadius: 4, fontSize: 12 }}>
              {s}
            </span>
          ))}
        </div>
      )}
      {content.selfIntro && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle accent={accent}>简介</SectionTitle>
          <p>{content.selfIntro}</p>
        </div>
      )}
      {content.experience?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle accent={accent}>工作经历</SectionTitle>
          {content.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{e.title} @ {e.company}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{e.start} — {e.end}</div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {content.projects?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle accent={accent}>项目</SectionTitle>
          {content.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong>{p.name}</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {p.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {content.education?.length > 0 && (
        <div>
          <SectionTitle accent={accent}>教育</SectionTitle>
          {content.education.map((e, i) => (
            <p key={i}>{e.school} · {e.major} ({e.start}-{e.end})</p>
          ))}
        </div>
      )}
    </div>
  )
}

function CreativePreview({ content }: { content: NormalizedResumeContent }) {
  const b = content.basic
  const accent = '#7c3aed'
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
      <div style={{ background: '#f5f3ff', padding: 16, borderRadius: 8 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px', color: accent }}>{b?.name || '姓名'}</h1>
        <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{b?.title || '目标岗位'}</p>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>{[b?.phone, b?.email, b?.city].filter(Boolean).join('\n')}</p>
        {content.skills?.length > 0 && (
          <div>
            <p style={{ fontWeight: 700, fontSize: 11, color: accent, marginBottom: 6 }}>SKILLS</p>
            {content.skills.map((s, i) => (
              <p key={i} style={{ margin: '2px 0', fontSize: 12 }}>{s}</p>
            ))}
          </div>
        )}
      </div>
      <div>
        {content.selfIntro && (
          <div style={{ marginBottom: 16 }}>
            <SectionTitle accent={accent}>关于我</SectionTitle>
            <p>{content.selfIntro}</p>
          </div>
        )}
        {content.experience?.map((e, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <strong>{e.company}</strong> · {e.title}
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
            </ul>
          </div>
        ))}
        {content.projects?.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <strong style={{ color: accent }}>{p.name}</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {p.highlights.map((h, j) => <li key={j}>{h}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function AcademicPreview({ content }: { content: NormalizedResumeContent }) {
  const b = content.basic
  return (
    <div style={{ fontFamily: 'Times New Roman, serif', color: '#1a1a1a', fontSize: 13, lineHeight: 1.65 }}>
      <h1 style={{ fontSize: 22, margin: 0, textAlign: 'center' }}>{b?.name || '姓名'}</h1>
      <p style={{ textAlign: 'center', margin: '4px 0 16px', fontSize: 12 }}>{b?.title} · {b?.email}</p>
      {content.education?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>Education</SectionTitle>
          {content.education.map((e, i) => (
            <p key={i}><strong>{e.school}</strong>, {e.major}, {e.degree} ({e.start}-{e.end})</p>
          ))}
        </div>
      )}
      {content.experience?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>Experience</SectionTitle>
          {content.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <p style={{ margin: 0 }}><strong>{e.title}</strong>, {e.company} ({e.start}-{e.end})</p>
              <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
                {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {content.projects?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionTitle>Research / Projects</SectionTitle>
          {content.projects.map((p, i) => (
            <div key={i}>
              <strong>{p.name}</strong> — {p.desc}
              <ul style={{ paddingLeft: 18 }}>{p.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {content.skills?.length > 0 && (
        <div>
          <SectionTitle>Technical Skills</SectionTitle>
          <p>{content.skills.join(', ')}</p>
        </div>
      )}
    </div>
  )
}

export function ResumePreview({ content, templateId, scale = 1, className = '' }: PreviewProps) {
  const normalized: NormalizedResumeContent = {
    ...content,
    basic: content.basic ?? {},
    education: content.education ?? [],
    experience: content.experience ?? [],
    projects: content.projects ?? [],
    skills: content.skills ?? [],
  }

  const inner = (() => {
    switch (templateId) {
      case 'classic-business': return <ClassicPreview content={normalized} />
      case 'tech-simple': return <TechPreview content={normalized} />
      case 'creative-design': return <CreativePreview content={normalized} />
      case 'academic-research': return <AcademicPreview content={normalized} />
      default: return <TechPreview content={normalized} />
    }
  })()

  return (
    <div
      className={className}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#0f172a',
          padding: 32,
          minHeight: 520,
        }}
      >
        {inner}
      </div>
    </div>
  )
}

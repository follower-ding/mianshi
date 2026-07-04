import type { ReactNode } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import type { JobApplication, JobPosting } from '../../../api/client'

type Props = {
  job: JobPosting | null
  application?: JobApplication
  embedded?: boolean
  full?: boolean
  loading?: boolean
  isApplied?: boolean
}

export function JdDetailBoard({ job, application, embedded, full }: Props) {
  if (!job) return null

  const requirements = extractSections(stripDemoBanner(job.jd))

  if (embedded) {
    return (
      <div
        className={`overflow-y-auto overscroll-contain px-5 pb-5 ${full ? 'h-full' : 'max-h-[280px]'}`}
      >
        <EmbeddedSection title="职位描述">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {requirements.description || stripDemoBanner(job.jd)}
          </p>
        </EmbeddedSection>

        {requirements.requirements.length > 0 && (
          <EmbeddedSection title="岗位要求">
            <ul className="space-y-1 text-sm text-text-secondary">
              {requirements.requirements.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-cyan-400">{i + 1}.</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </EmbeddedSection>
        )}

        {requirements.benefits.length > 0 && (
          <EmbeddedSection title="团队福利">
            <ul className="space-y-1 text-sm text-text-secondary">
              {requirements.benefits.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  {line}
                </li>
              ))}
            </ul>
          </EmbeddedSection>
        )}

        {application?.greeting && (
          <EmbeddedSection title="投递打招呼语">
            <p className="whitespace-pre-wrap rounded-lg border border-gray-800/60 bg-[#0a0e14]/60 p-2.5 text-sm text-text-secondary">
              {application.greeting}
            </p>
          </EmbeddedSection>
        )}

        {job.externalUrl && (
          <a
            href={job.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
          >
            公司主页
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  return null
}

function EmbeddedSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  )
}

function extractSections(jd: string) {
  const requirements: string[] = []
  const benefits: string[] = []
  let description = jd

  const reqMatch = jd.match(/\[?岗位要求\]?[：:]?\s*([\s\S]*?)(?=\[?福利|$)/i)
  const benMatch = jd.match(/\[?福利[^\]]*\]?[：:]?\s*([\s\S]*?)$/i)

  if (reqMatch) {
    requirements.push(
      ...reqMatch[1]
        .split(/\n/)
        .map((l) => l.replace(/^\d+[.、)]\s*/, '').trim())
        .filter(Boolean),
    )
    description = jd.slice(0, reqMatch.index).trim()
  }
  if (benMatch) {
    benefits.push(
      ...benMatch[1]
        .split(/\n/)
        .map((l) => l.replace(/^\d+[.、)]\s*/, '').trim())
        .filter(Boolean),
    )
  }

  return { description, requirements, benefits }
}

function stripDemoBanner(jd: string) {
  return jd
    .replace(/[（(]演示数据[^）)]*[）)]/g, '')
    .replace(/配置\s*FIRECRAWL_API_KEY[^。\n]*/gi, '')
    .trim()
}

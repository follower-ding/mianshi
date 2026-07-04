import { useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugifyHeading } from '../../lib/markdownHeadings'
import { normalizeMarkdownImagePaths } from '../../lib/markdownImage'
import { MarkdownImage } from './MarkdownImage'

type Props = {
  source: string
  className?: string
  /** Prefix for auto-generated heading anchor ids */
  headingIdPrefix?: string
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-bg-subtle px-1.5 py-0.5 font-mono text-[0.88em] text-brand">
      {children}
    </code>
  )
}

export function MarkdownContent({ source, className = '', headingIdPrefix = 'md' }: Props) {
  const trimmed = source.trim()
  const normalized = useMemo(() => normalizeMarkdownImagePaths(trimmed), [trimmed])
  const headingCounts = useMemo(() => new Map<string, number>(), [])

  if (!trimmed) return null

  return (
    <div className={`md-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h4 className="mb-3 mt-6 text-lg font-bold text-text first:mt-0">{children}</h4>
          ),
          h2: ({ children }) => {
            const text = String(children)
            const base = slugifyHeading(text)
            const n = (headingCounts.get(base) ?? 0) + 1
            headingCounts.set(base, n)
            const id = n > 1 ? `${headingIdPrefix}-${base}-${n}` : `${headingIdPrefix}-${base}`
            return (
              <h4 id={id} className="mb-3 mt-6 scroll-mt-32 text-base font-bold text-text first:mt-0">
                {children}
              </h4>
            )
          },
          h3: ({ children }) => {
            const text = String(children)
            const base = slugifyHeading(text)
            const n = (headingCounts.get(base) ?? 0) + 1
            headingCounts.set(base, n)
            const id = n > 1 ? `${headingIdPrefix}-${base}-${n}` : `${headingIdPrefix}-${base}`
            return (
              <h5 id={id} className="mb-2 mt-5 scroll-mt-32 text-[15px] font-semibold text-text">
                {children}
              </h5>
            )
          },
          p: ({ children }) => (
            <p className="mb-4 text-[15px] leading-[1.75] text-text-secondary last:mb-0">{children}</p>
          ),
          strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
          em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
          ul: ({ children }) => (
            <ul className="md-ul mb-4 space-y-2.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="md-ol mb-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-text-secondary last:mb-0 marker:text-brand">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[15px] leading-relaxed text-text-secondary [&>p]:mb-0">
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-brand/40 bg-brand-light/30 px-4 py-3 text-[15px] leading-relaxed text-text-secondary last:mb-0">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = codeClass?.includes('language-')
            if (isBlock) {
              const lang = codeClass?.replace('language-', '') || 'text'
              return (
                <div className="mb-4 overflow-hidden rounded-xl border border-border bg-panel shadow-sm last:mb-0">
                  <div className="border-b border-border bg-bg-subtle px-4 py-2">
                    <span className="text-xs text-muted">{lang}</span>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-7 whitespace-pre-wrap text-text-secondary">
                    {String(children).replace(/\n$/, '')}
                  </pre>
                </div>
              )
            }
            return <InlineCode>{children}</InlineCode>
          },
          pre: ({ children }) => <>{children}</>,
          hr: () => <hr className="my-6 border-border/60" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}

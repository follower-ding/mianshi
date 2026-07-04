import { Check } from 'lucide-react'
import { RESUME_TEMPLATES, type ResumeTemplateId } from '../../lib/data'

const SWATCH: Record<ResumeTemplateId, string> = {
  'classic-business': 'from-slate-600 to-slate-800',
  'tech-simple': 'from-cyan-600/80 to-slate-800',
  'creative-design': 'from-violet-600/70 to-slate-800',
  'academic-research': 'from-amber-700/60 to-slate-800',
  'modern-minimal': 'from-teal-600/70 to-slate-800',
  'executive-pro': 'from-slate-700 to-slate-900',
  'fresh-campus': 'from-emerald-600/70 to-slate-800',
  'data-analyst': 'from-indigo-600/70 to-slate-800',
}

type Props = {
  value: ResumeTemplateId
  onChange: (id: ResumeTemplateId) => void
  compact?: boolean
}

export function ResumeTemplatePicker({ value, onChange, compact = false }: Props) {
  return (
    <div className={`flex gap-2 ${compact ? 'flex-wrap' : 'grid grid-cols-2 xl:grid-cols-4'}`}>
      {RESUME_TEMPLATES.map((tpl) => {
        const active = value === tpl.id
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className={`group relative cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-200 ${
              active
                ? 'border-brand/60 bg-brand/5 ring-1 ring-brand/30'
                : 'border-border/60 bg-panel/30 hover:border-brand/30 hover:bg-panel/50'
            } ${compact ? 'px-3 py-2' : 'p-3'}`}
          >
            {!compact && (
              <div
                className={`mb-2.5 h-14 rounded-lg bg-gradient-to-br ${SWATCH[tpl.id]} opacity-90`}
                aria-hidden
              >
                <div className="flex h-full items-end p-2">
                  <div className="h-1.5 w-8 rounded bg-white/30" />
                </div>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`font-semibold text-text ${compact ? 'text-xs' : 'text-sm'}`}>{tpl.name}</p>
                {!compact && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">{tpl.style}</p>
                )}
              </div>
              {active && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-bg-page">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Building2, MapPin, Send, ChevronRight } from 'lucide-react'
import type { JobMatch, JobPosting } from '../../api/client'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const TIER_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  S: 'success',
  A: 'info',
  B: 'warning',
  C: 'default',
}

const CITIES = ['成都', '北京', '上海', '深圳', '杭州', '广州']
const EXPERIENCE = ['应届', '1-3年', '3-5年', '5-10年']
const SCALES = ['0-20人', '20-99人', '100-499人', '500-999人', '1000-9999人']

export type JobFilters = {
  city: string
  tier: string
  salaryMin: number
  experience: string
  scale: string
  query: string
}

type Props = {
  matches: JobMatch[]
  appliedJobIds: Set<string>
  onSelect: (job: JobPosting, match?: JobMatch) => void
  selectedId?: string
  onApply?: (match: JobMatch) => void
  onFilterCrawl?: (filters: JobFilters) => void
  crawling?: boolean
}

export function JobSplitPane({
  matches,
  appliedJobIds,
  onSelect,
  selectedId,
  onApply,
  onFilterCrawl,
  crawling,
}: Props) {
  const [filters, setFilters] = useState<JobFilters>({
    city: '成都',
    tier: 'S,A',
    salaryMin: 0,
    experience: '',
    scale: '',
    query: '',
  })

  const filtered = useMemo(() => {
    const tiers = filters.tier.split(',').filter(Boolean)
    return matches.filter((m) => {
      if (tiers.length && !tiers.includes(m.tier)) return false
      if (filters.city && m.job?.city && !m.job.city.includes(filters.city)) return false
      if (filters.query && m.job) {
        const q = filters.query.toLowerCase()
        if (!`${m.job.title} ${m.job.company}`.toLowerCase().includes(q)) return false
      }
      if (filters.salaryMin > 0 && m.job?.salary) {
        const n = Number(m.job.salary.match(/(\d+)/)?.[1] ?? 0)
        if (n > 0 && n < filters.salaryMin) return false
      }
      return true
    })
  }, [matches, filters])

  const selected = filtered.find((m) => m.job?.id === selectedId) ?? filtered[0]
  const job = selected?.job

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-panel/50 p-3">
        <select
          className="rounded-lg border border-border bg-page px-2 py-1.5 text-sm"
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-page px-2 py-1.5 text-sm"
          value={filters.tier}
          onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
        >
          <option value="S,A">S/A 级</option>
          <option value="S">S 级</option>
          <option value="A">A 级</option>
          <option value="S,A,B,C">全部评级</option>
        </select>
        <select
          className="rounded-lg border border-border bg-page px-2 py-1.5 text-sm"
          value={filters.experience}
          onChange={(e) => setFilters((f) => ({ ...f, experience: e.target.value }))}
        >
          <option value="">工作经验</option>
          {EXPERIENCE.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-page px-2 py-1.5 text-sm"
          value={filters.scale}
          onChange={(e) => setFilters((f) => ({ ...f, scale: e.target.value }))}
        >
          <option value="">公司规模</option>
          {SCALES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="最低 K"
          className="w-24 rounded-lg border border-border bg-page px-2 py-1.5 text-sm"
          value={filters.salaryMin || ''}
          onChange={(e) => setFilters((f) => ({ ...f, salaryMin: Number(e.target.value) || 0 }))}
        />
        {onFilterCrawl && (
          <Button size="sm" disabled={crawling} onClick={() => onFilterCrawl(filters)}>
            {crawling ? '爬取中…' : '按条件深度爬取'}
          </Button>
        )}
      </div>

      <div className="grid min-h-[480px] gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-xl border border-border bg-page p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-text-secondary">无匹配岗位，请调整筛选或抓取</p>
          ) : (
            filtered.map((match) => {
              const j = match.job!
              const active = j.id === (selected?.job?.id ?? selectedId)
              const applied = appliedJobIds.has(j.id)
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelect(j, match)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active ? 'border-brand bg-brand-light/30' : 'border-transparent hover:bg-panel'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">{j.title}</p>
                      <p className="truncate text-xs text-text-secondary">{j.company}</p>
                    </div>
                    <Badge variant={TIER_VARIANT[match.tier] ?? 'default'}>{match.tier}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-brand">{j.salary}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted">
                    <span>{j.city}</span>
                    <span>{j.experience}</span>
                    {applied && <Badge variant="success">已投递</Badge>}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <Card className="flex flex-col p-5">
          {job ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-text">{job.title}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <Building2 className="h-4 w-4" />
                    {job.company}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-brand">{job.salary}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.city}
                    </span>
                    <span>{job.experience}</span>
                    <span>{job.education}</span>
                    {selected && (
                      <Badge variant={TIER_VARIANT[selected.tier] ?? 'default'}>
                        {`${selected.tier} 级 · ${selected.score} 分`}
                      </Badge>
                    )}
                  </div>
                </div>
                {selected && onApply && !appliedJobIds.has(job.id) && (
                  <Button size="sm" onClick={() => onApply(selected)}>
                    <Send className="mr-1 h-4 w-4" />
                    立即沟通
                  </Button>
                )}
              </div>
              <div className="mt-4 flex-1 overflow-y-auto">
                <h3 className="text-sm font-semibold text-text">职位描述</h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.tags.map((t) => (
                    <span key={t} className="rounded-md bg-panel px-2 py-0.5 text-xs text-text-secondary">{t}</span>
                  ))}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{job.jd}</p>
                {selected?.suggestedGreeting && (
                  <div className="mt-4 rounded-lg bg-brand-light/30 p-3">
                    <p className="text-xs font-medium text-brand">AI 打招呼语</p>
                    <p className="mt-1 text-sm text-text-secondary">{selected.suggestedGreeting}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-text-secondary">
              选择左侧岗位查看详情
              <ChevronRight className="ml-1 h-4 w-4" />
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

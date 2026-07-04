import type { LucideIcon } from 'lucide-react'
import { Code2, Database, Layers, Monitor, Network, Sparkles } from 'lucide-react'
import type { LearningPath, LearningPathStage } from '../../api/client'

const PATH_ICONS: Record<string, LucideIcon> = {
  java: Code2,
  database: Database,
  middleware: Layers,
  network: Network,
  frontend: Monitor,
  ai: Sparkles,
}

/** 统一品牌色系 — 青色系明暗微调，禁止橙/粉/紫等彩虹色 */
export type PathAccent = {
  bar: string
  icon: string
}

const UNIFIED_ACCENTS: PathAccent[] = [
  { bar: 'bg-brand/55', icon: 'bg-brand/14 text-brand ring-1 ring-brand/28' },
  { bar: 'bg-brand/45', icon: 'bg-brand/12 text-brand ring-1 ring-brand/22' },
  { bar: 'bg-brand/38', icon: 'bg-brand/10 text-brand/95 ring-1 ring-brand/18' },
  { bar: 'bg-brand/50', icon: 'bg-brand/13 text-brand ring-1 ring-brand/25' },
  { bar: 'bg-brand/42', icon: 'bg-brand/11 text-brand ring-1 ring-brand/20' },
  { bar: 'bg-brand/48', icon: 'bg-brand/12 text-brand ring-1 ring-brand/24' },
]

const DEFAULT_ACCENT: PathAccent = UNIFIED_ACCENTS[0]

export function resolvePathIcon(path: LearningPath): LucideIcon {
  return PATH_ICONS[path.id] ?? Code2
}

/** @param index 卡片序号，用于同色系内的轻微层次（非彩虹） */
export function resolvePathAccent(path: LearningPath, index = 0): PathAccent {
  if (path.id && PATH_ICONS[path.id]) {
    return UNIFIED_ACCENTS[index % UNIFIED_ACCENTS.length] ?? DEFAULT_ACCENT
  }
  return DEFAULT_ACCENT
}

/** @deprecated 使用 resolvePathAccent */
export function resolvePathGradient(_path: LearningPath): string {
  return 'from-brand/60 to-brand/25'
}

export type StageStatus = 'completed' | 'active' | 'pending' | 'empty'

export function getStageStatus(stages: LearningPathStage[], index: number): StageStatus {
  const stage = stages[index]
  if (stage.total === 0) return 'empty'
  if (stage.progressPct >= 100) return 'completed'

  const prevDone = stages.slice(0, index).every((s) => s.total === 0 || s.progressPct >= 100)
  if (prevDone) return 'active'
  return 'pending'
}

export const pathUi = {
  workspace: 'mx-auto max-w-6xl px-4 py-10 lg:px-8',
  grid: 'mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
  card:
    'group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-elevated text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)]',
  accentBar: 'h-0.5 w-full shrink-0',
  cardBody: 'flex flex-1 flex-col p-5',
  cardHeader: 'flex items-start gap-3',
  cardTitle: 'text-base font-semibold leading-snug text-text',
  cardSubtitle: 'mt-0.5 text-xs text-text-secondary',
  statBadge:
    'inline-flex items-center rounded-md border border-border/60 bg-panel/50 px-2 py-0.5 text-[11px] font-medium text-text-secondary',
  progressBlock: 'mt-4 space-y-2',
  progressRow: 'flex items-center justify-between gap-2 text-xs',
  progressLabel: 'font-medium text-text-secondary',
  progressValue: 'font-mono font-semibold tabular-nums text-brand',
  progressTrack: 'h-1.5 overflow-hidden rounded-full bg-border/40',
  progressFill: 'h-full rounded-full bg-brand/90 transition-all duration-500',
  metaRow: 'mt-3 flex flex-wrap gap-1.5',
  cardFooter: 'mt-auto flex items-center gap-2 pt-4',
  toggleLink:
    'inline-flex items-center gap-0.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:text-brand',
  ctaPrimary:
    'ml-auto inline-flex items-center justify-center gap-1 rounded-lg border border-brand/35 bg-brand/15 px-4 py-2 text-xs font-medium text-brand transition-all duration-200 hover:border-brand/50 hover:bg-brand/22 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45',
  expandPanel:
    'col-span-full overflow-hidden rounded-xl border border-border/60 bg-elevated/90 p-5 backdrop-blur-sm sm:p-6',
  expandHeader: 'mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4',
  expandTitle: 'text-sm font-semibold text-text',
  expandMeta: 'text-xs text-text-secondary',
  timelineWrap: 'space-y-1',
  stageCard:
    'group relative flex-1 rounded-lg border border-border/60 bg-panel/40 p-3.5 transition-all duration-200 hover:border-brand/20 hover:bg-panel/55',
  stageTitle: 'text-sm font-medium text-text',
  stageMeta: 'mt-0.5 text-[11px] text-text-secondary',
  stagePct: 'font-mono text-lg font-bold tabular-nums leading-none text-text',
  stagePctSuffix: 'text-xs font-semibold text-muted',
  stageBar: 'mt-2 h-1 overflow-hidden rounded-full bg-border/40',
  stageBarFill: 'h-full rounded-full bg-brand/85 transition-all duration-500',
  stageAction:
    'mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-brand/80',
} as const

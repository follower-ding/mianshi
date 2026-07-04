import { resumeCardUi, resumeUi } from '../resume/resumeLayout'

const bone = 'animate-shimmer rounded-md bg-border/35'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`${bone} ${className}`} aria-hidden />
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function ResumeCardSkeleton() {
  return (
    <article className={resumeCardUi.root} aria-hidden>
      <Skeleton className={`${resumeCardUi.preview} !rounded-none`} />
      <div className={resumeCardUi.footer}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <div className="mt-auto flex gap-1.5 pt-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>
    </article>
  )
}

export function ResumeMineSkeleton() {
  return (
    <div className={resumeUi.moduleMain} role="status" aria-label="加载简历">
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-fade-in">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </header>
          <div className={resumeCardUi.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <ResumeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResumeShellSkeleton() {
  return (
    <header className={resumeUi.toolbar} aria-hidden>
      <div className={`${resumeUi.toolbarInner} animate-fade-in`}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
      <div className={`${resumeUi.tabRail} flex gap-4 px-4 pb-2 pt-2 lg:px-6`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
      </div>
    </header>
  )
}

export function QuestionBankHubSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page" role="status" aria-label="加载题库">
      <div className="border-b border-border bg-elevated">
        <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 animate-fade-in">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-elevated p-5"
              aria-hidden
            >
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="mt-4 h-5 w-2/3" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-4 h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function QuestionSearchSkeleton() {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-elevated" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

export function PublicResumeSkeleton() {
  return (
    <div className="min-h-screen bg-resume-canvas" role="status" aria-label="加载公开简历">
      <Skeleton className="h-[72px] w-full !rounded-none" />
      <div className="mx-auto max-w-[820px] px-4 py-8 animate-fade-in">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[640px] !rounded-sm" />
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1000px] px-4 py-10 lg:px-8 animate-fade-in"
      role="status"
      aria-label="加载个人中心"
    >
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-6 h-16 w-full rounded-xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-48 w-full rounded-xl" />
    </div>
  )
}

export function JobsWorkbenchSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg-page px-4 py-5 lg:px-6 lg:py-6" role="status" aria-label="加载投递工作台">
      <div className="mx-auto max-w-[1200px] animate-fade-in">
        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
        <div className="flex h-[min(680px,calc(100vh-11rem))] overflow-hidden rounded-2xl border border-border bg-panel/40">
          <div className="w-[320px] shrink-0 border-r border-border/60 p-3 space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="min-w-0 flex-1 p-5 space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <SkeletonText lines={4} className="mt-6" />
            <div className="mt-8 flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

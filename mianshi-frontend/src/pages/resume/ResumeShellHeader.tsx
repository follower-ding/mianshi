import { useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  Pencil,
  Save,
  Share2,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { resumeCompletionLabel, resumeCompletionPercent, resumeUi } from '../../components/resume/resumeLayout'
import { ResumeSwitcher } from '../../components/resume/ResumeSwitcher'
import { ExportResumeMenu } from '../../components/resume/ExportResumeMenu'
import { ResumeModuleNav } from '../../components/resume/ResumeModuleNav'
import { ResumeShareModal } from '../../components/resume/ResumeShareModal'
import { AutoSaveIndicator } from '../../components/resume/AutoSaveIndicator'
import { Button } from '../../components/ui/Button'
import { useResume } from './ResumeProvider'

function Toast({ type, message }: { type: 'error' | 'success'; message: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm animate-slide-down ${
        type === 'error'
          ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-success/30 bg-success/10 text-success'
      }`}
      role="status"
      aria-live="polite"
    >
      {type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  )
}

function TitleChip({
  title,
  draft,
  onDraft,
  onCommit,
}: {
  title: string
  draft: string
  onDraft: (t: string) => void
  onCommit: (t: string) => void
}) {
  const [editing, setEditing] = useState(false)

  return editing ? (
    <input
      className={`${resumeUi.input} !w-auto min-w-[140px] !py-1 text-sm`}
      value={draft}
      autoFocus
      onChange={(e) => onDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        onCommit(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  ) : (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand/10 px-2.5 py-1 text-sm font-medium text-brand"
      onClick={() => setEditing(true)}
    >
      {title}
      <Pencil className="h-3 w-3 opacity-60" />
    </button>
  )
}

export function ResumeShellHeader() {
  const { pathname } = useLocation()
  const isGenerateFlow = pathname.startsWith('/resume/generate')
  const isResumeHub = pathname === '/resume/mine' || pathname === '/resume'
  const [shareOpen, setShareOpen] = useState(false)

  const {
    content,
    resume,
    resumes,
    activeResumeId,
    switchResume,
    resumeTitle,
    titleDraft,
    setTitleDraft,
    updateResumeTitle,
    autoSaveStatus,
    exporting,
    handleSave,
    handleExport,
    error,
    success,
    setError,
  } = useResume()

  const completion = resumeCompletionPercent(content)
  const completionText = resumeCompletionLabel(content)

  const commitTitle = async (t: string) => {
    const trimmed = t.trim()
    setTitleDraft(trimmed)
    if (!activeResumeId || !trimmed) return
    await updateResumeTitle(activeResumeId, trimmed)
  }

  const onExport = async () => {
    await handleExport()
    setShareOpen(false)
  }

  return (
    <header className={resumeUi.toolbar}>
      <div className={resumeUi.toolbarInner}>
        <div className="flex min-w-0 items-center gap-3">
          <NavLink
            to="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted transition-colors hover:border-brand/30 hover:bg-brand/10 hover:text-brand"
            title="返回首页"
            aria-label="返回首页"
          >
            <Home className="h-4 w-4" strokeWidth={1.75} />
          </NavLink>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isResumeHub ? (
                <span className="text-sm font-semibold text-text">我的简历</span>
              ) : (
                <>
                  <NavLink
                    to="/resume/mine"
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-brand/15 text-brand'
                          : 'text-muted hover:bg-brand/10 hover:text-brand'
                      }`
                    }
                  >
                    <FileText className="h-3.5 w-3.5" />
                    我的简历
                  </NavLink>
                  <span className="text-muted/40">/</span>
                  <ResumeSwitcher
                    resumes={resumes}
                    activeId={activeResumeId}
                    onSwitch={switchResume}
                  />
                  <TitleChip
                    title={resumeTitle}
                    draft={titleDraft}
                    onDraft={setTitleDraft}
                    onCommit={commitTitle}
                  />
                </>
              )}
            </div>
            {!isResumeHub && !isGenerateFlow && (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <AutoSaveIndicator
                  status={autoSaveStatus}
                  onRetry={autoSaveStatus === 'error' ? () => handleSave() : undefined}
                />
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <span className="max-w-[140px] truncate text-[11px] tabular-nums text-muted" title={completionText}>
                    {completionText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isGenerateFlow && !isResumeHub && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" /> 分享
            </Button>
            <ExportResumeMenu
              filenameBase={content.basic?.name ? `${content.basic.name}-简历` : resumeTitle}
              resumeId={resume?.id}
              disabled={exporting}
              onBeforeExport={async () => {
                await handleSave()
              }}
              onError={(msg) => {
                setError(msg)
              }}
            />
            <Button size="sm" disabled={autoSaveStatus === 'saving'} onClick={handleSave}>
              {autoSaveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存
            </Button>
          </div>
        )}
      </div>

      <div className={resumeUi.tabRail}>
        <ResumeModuleNav />
      </div>

      {(error || success) && (
        <div className={`${resumeUi.shellMax} space-y-2 px-4 pb-2 lg:px-6`}>
          {error && <Toast type="error" message={error} />}
          {success && <Toast type="success" message={success} />}
        </div>
      )}

      <ResumeShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        content={content}
        resumeTitle={resumeTitle}
        resumeId={resume?.id}
        onExport={onExport}
        onBeforeShare={handleSave}
        exporting={exporting}
      />
    </header>
  )
}

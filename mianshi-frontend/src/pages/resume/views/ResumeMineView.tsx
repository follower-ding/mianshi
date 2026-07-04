import { Link } from 'react-router-dom'
import { Download, FileText, LayoutTemplate, Plus, Sparkles, Wand2 } from 'lucide-react'
import {
  resumeCardUi,
  resumeUi,
  hasResumeContent,
} from '../../../components/resume/resumeLayout'
import { SavedResumeCard } from '../../../components/resume/SavedResumeCard'
import { CreateResumeCard } from '../../../components/resume/CreateResumeCard'
import { ResumeOnboarding } from '../../../components/resume/ResumeOnboarding'
import { Button } from '../../../components/ui/Button'
import { ResumeMineSkeleton } from '../../../components/ui/Skeleton'
import { isValidTemplateId } from '../../../components/resume/resumeUtils'
import type { ResumeTemplateId } from '../../../lib/data'
import { useResume } from '../ResumeProvider'

export function ResumeMineView() {
  const {
    loading,
    resumes,
    createBlankResume,
    deleteResumeById,
    duplicateResumeById,
    updateResumeTitle,
    handleExport,
    exporting,
    handleSyncSummary,
    syncingSummary,
    resume,
  } = useResume()

  if (loading) return <ResumeMineSkeleton />

  return (
    <div className={resumeUi.moduleMain}>
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header
            className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-5"
            data-onboard="mine-header"
          >
            <div>
              <div className="flex items-center gap-2 text-brand">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-xs font-semibold uppercase tracking-wider">My Resumes</span>
              </div>
              <h1 className="mt-2 text-xl font-semibold text-text">我的简历</h1>
              <p className="mt-1 text-sm text-text-secondary">
                从这里开始：快速生成、导入优化或新建空白 · 共 {resumes.length} 份
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => createBlankResume()}>
                <Plus className="h-3.5 w-3.5" /> 新建空白
              </Button>
              <Link to="/resume/generate">
                <Button variant="secondary" size="sm">
                  <Sparkles className="h-3.5 w-3.5" /> 快速生成
                </Button>
              </Link>
              <Link to="/resume/templates">
                <Button variant="secondary" size="sm">
                  <LayoutTemplate className="h-3.5 w-3.5" /> 模板画廊
                </Button>
              </Link>
              <Link to="/resume/optimize">
                <Button variant="secondary" size="sm">
                  <Wand2 className="h-3.5 w-3.5" /> 导入优化
                </Button>
              </Link>
              {resume?.summary?.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={syncingSummary}
                  onClick={() => handleSyncSummary()}
                >
                  {syncingSummary ? '同步中…' : '同步亮点到投递'}
                </Button>
              )}
              {resumes[0] && (
                <>
                  <Link to={`/resume/edit?id=${resumes[0].id}`}>
                    <Button variant="secondary" size="sm">
                      <LayoutTemplate className="h-3.5 w-3.5" /> 排版编辑
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" disabled={exporting} onClick={() => handleExport('pdf')}>
                    <Download className="h-3.5 w-3.5" /> 导出
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className={resumeCardUi.grid} data-onboard="create-cards">
            {resumes.map((r) => {
              const content = r.content ?? {}
              const tpl = isValidTemplateId(r.templateId) ? (r.templateId as ResumeTemplateId) : 'tech-simple'
              const statTags = [
                content.experience?.length ? `${content.experience.length} 段经历` : null,
                content.projects?.length ? `${content.projects.length} 个项目` : null,
                content.skills?.length ? `${content.skills.length} 项技能` : null,
                !hasResumeContent(content) && r.rawText?.trim() ? `文本 ${r.rawText.trim().length} 字` : null,
              ].filter(Boolean) as string[]
              return (
                <SavedResumeCard
                  key={r.id}
                  resumeId={r.id}
                  title={r.title}
                  content={content}
                  templateId={tpl}
                  layoutConfig={r.layoutConfig}
                  updatedAt={r.updatedAt}
                  tags={statTags}
                  onRename={updateResumeTitle}
                  onDuplicate={duplicateResumeById}
                  onDelete={deleteResumeById}
                />
              )
            })}

            {resumes.length === 0 && (
              <article
                className={`flex flex-col items-center justify-center text-center ${resumeCardUi.rootDashed}`}
                onClick={() => createBlankResume()}
                onKeyDown={(e) => e.key === 'Enter' && createBlankResume()}
                role="button"
                tabIndex={0}
              >
                <div className={`${resumeCardUi.preview} flex cursor-pointer flex-col items-center justify-center px-4`}>
                  <FileText className="h-9 w-9 text-muted/50" strokeWidth={1.25} />
                  <p className="mt-3 text-sm font-medium text-text-secondary">还没有保存的简历</p>
                  <p className="mt-1 text-xs text-muted">点击创建第一份简历</p>
                </div>
                <div className={resumeCardUi.footer} />
              </article>
            )}

            <CreateResumeCard variant="generate" />
            <CreateResumeCard variant="optimize" />
          </div>
        </div>
      </div>
      <ResumeOnboarding variant="mine" />
    </div>
  )
}

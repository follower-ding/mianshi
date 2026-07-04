import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { AI_GENERATE_EXAMPLES } from '../../../components/resume/aiGenerateExample'
import { GeneratePreviewModal } from '../../../components/resume/GeneratePreviewModal'
import { ResumeLlmBanner } from '../../../components/resume/ResumeLlmBanner'
import { resumeUi } from '../../../components/resume/resumeLayout'
import { Button } from '../../../components/ui/Button'
import { useConfirm } from '../../../contexts/ConfirmContext'
import { useResume } from '../ResumeProvider'

const STEPS = [
  '填写目标职位',
  '描述个人情况',
  '预览生成结果',
  '确认后进入排版编辑',
] as const

export function GenerateView() {
  const {
    generating,
    templateId,
    handleGenerate,
    generatePreview,
    applyGeneratePreview,
    dismissGeneratePreview,
    hasContent,
  } = useResume()
  const { confirm } = useConfirm()
  const [targetJob, setTargetJob] = useState('')
  const [personalInfo, setPersonalInfo] = useState('')
  const [applying, setApplying] = useState(false)

  const canSubmit = targetJob.trim().length >= 2 && personalInfo.trim().length >= 10 && !generating

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    await handleGenerate({ targetJob: targetJob.trim(), personalInfo: personalInfo.trim() })
  }

  const loadExample = async (id: (typeof AI_GENERATE_EXAMPLES)[number]['id']) => {
    const ex = AI_GENERATE_EXAMPLES.find((e) => e.id === id)
    if (!ex) return
    if (
      (targetJob.trim() || personalInfo.trim()) &&
      !(await confirm({
        message: `将用「${ex.label}」示例覆盖当前表单，是否继续？`,
      }))
    ) {
      return
    }
    setTargetJob(ex.targetJob)
    setPersonalInfo(ex.personalInfo)
  }

  const onApplyPreview = async () => {
    setApplying(true)
    try {
      await applyGeneratePreview()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className={resumeUi.moduleMain}>
      <div className={resumeUi.wizardScroll}>
        <div className={resumeUi.wizardInner}>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-text">AI 快速生成简历</h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              用几句话描述自己，生成后可预览确认再进入编辑
            </p>
          </div>

          <div className="mt-4">
            <ResumeLlmBanner />
          </div>

          <div className={resumeUi.stepRow}>
            {STEPS.map((step, i) => (
              <div key={step} className={resumeUi.stepPill}>
                <span className={resumeUi.stepBadge}>{i + 1}</span>
                <span className="hidden sm:inline">{step}</span>
                <span className="sm:hidden">{step.slice(0, 4)}…</span>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className={`${resumeUi.card} relative mt-5 space-y-4`}>
            {generating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-panel/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="mt-3 text-sm font-medium text-text">AI 正在生成简历…</p>
              </div>
            )}

            {hasContent && !generating && (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                已有简历内容，新生成将创建一份新简历
              </p>
            )}

            <div>
              <label className={resumeUi.label} htmlFor="generate-target-job">目标职位</label>
              <input
                id="generate-target-job"
                className={resumeUi.input}
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="如 AI 开发工程师、Java 后端开发"
                disabled={generating}
              />
              <p className="mt-1 text-[11px] text-muted">生成内容将严格围绕此岗位，请确认与求职方向一致</p>
            </div>
            <div>
              <label className={resumeUi.label} htmlFor="generate-personal-info">个人情况</label>
              <textarea
                id="generate-personal-info"
                className={`${resumeUi.input} min-h-[180px] resize-y`}
                value={personalInfo}
                onChange={(e) => setPersonalInfo(e.target.value)}
                placeholder="学校、专业、实习/项目经历、技能栈…"
                disabled={generating}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {AI_GENERATE_EXAMPLES.map((ex) => (
                <Button
                  key={ex.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={generating}
                  onClick={() => loadExample(ex.id)}
                >
                  {ex.label}
                </Button>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              生成并预览
            </Button>
          </form>
        </div>
      </div>

      {generatePreview && (
        <GeneratePreviewModal
          open
          title={generatePreview.title}
          content={generatePreview.content}
          templateId={templateId}
          source={generatePreview.source}
          applying={applying}
          onClose={dismissGeneratePreview}
          onApply={onApplyPreview}
        />
      )}
    </div>
  )
}

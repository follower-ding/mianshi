import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PanelRight,
  Wand2,
} from 'lucide-react'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { AdminSegmentedControl } from './AdminSegmentedControl'
import { CategoryCombobox } from './CategoryCombobox'
import { useQuestionCategories } from './useQuestionCategories'
import {
  QUESTION_PUBLISH_FLOW,
  QUESTION_STATUS_LABEL,
  adminCx,
  adminStatusClass,
} from './adminTheme'
import type { QuestionFormErrors } from './questionFormValidation'
import { MarkdownEditor } from '../markdown/MarkdownEditor'
import {
  DIFFICULTIES,
  QUESTION_PUBLISH_INTENTS,
  QUESTION_TYPES,
  formToPreviewQuestion,
  type QuestionFormData,
  type QuestionPublishIntent,
} from './questionFormUtils'
import { QuestionPublicPreview } from '../question-bank/QuestionPublicPreview'

const textareaCls = `${adminCx.textarea} w-full`

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

function AiButton({
  loading,
  disabled,
  onClick,
  children,
  primary,
}: {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  primary?: boolean
}) {
  const cls = primary
    ? `${adminCx.btnPrimary} !px-2.5 !py-1 !text-[11px] !rounded-lg`
    : `${adminCx.btnGhost} !px-2 !py-1 !text-[11px] !rounded-lg ring-1 ring-admin-border/50`
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={cls}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
      {children}
    </button>
  )
}

function CharCount({ value, min }: { value: string; min?: number }) {
  const len = value.trim().length
  const warn = min !== undefined && len > 0 && len < min
  return (
    <span className={`text-[11px] tabular-nums ${warn ? 'text-amber-600' : 'text-admin-muted'}`}>
      {len} 字{min !== undefined && len < min ? ` / ${min}` : ''}
    </span>
  )
}

function ExtraFieldBlock({
  label,
  hint,
  action,
  children,
}: {
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[120px] flex-col overflow-hidden rounded-lg border border-admin-border/50 bg-admin-surface">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-admin-border/40 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-admin-text-secondary">{label}</p>
          {hint && <p className="mt-0.5 text-[10px] leading-snug text-admin-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </div>
  )
}

function suggestTagsFromForm(form: QuestionFormData): string {
  const fromKeyPoints = form.keyPoints
    .split('\n')
    .map((line) => line.replace(/^[-*\d.]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
  const parts = [form.category, ...fromKeyPoints].filter(Boolean)
  return [...new Set(parts)].slice(0, 5).join(', ')
}

type AiTarget = 'stem' | 'answer' | 'keypoints' | 'extra' | 'scoring' | 'followups' | null

type Props = {
  form: QuestionFormData
  errors?: QuestionFormErrors
  saveBanner?: { type: 'success' | 'error' | 'info'; message: string } | null
  onDismissSaveBanner?: () => void
  onChange: (form: QuestionFormData) => void
  headerActions?: ReactNode
}

export function QuestionFormEditor({
  form,
  errors = {},
  saveBanner,
  onDismissSaveBanner,
  onChange,
  headerActions,
}: Props) {
  const { showToast } = useToast()
  const { banks } = useQuestionCategories()
  const [aiTarget, setAiTarget] = useState<AiTarget>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [stemOpen, setStemOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)
  const [keypointsOpen, setKeypointsOpen] = useState(true)

  const needsQuality = form.status === 'review' || form.status === 'published'
  const contentMin = needsQuality ? 10 : 2
  const previewQuestion = useMemo(() => formToPreviewQuestion(form), [form])

  const publishIntent: QuestionPublishIntent = QUESTION_PUBLISH_INTENTS.includes(
    form.status as QuestionPublishIntent,
  )
    ? (form.status as QuestionPublishIntent)
    : 'draft'

  const runAi = async (target: AiTarget) => {
    if (!form.title.trim()) {
      showToast('请先填写题目标题', 'error')
      return
    }
    setAiTarget(target)
    try {
      const title = form.title.trim()
      const content = form.content.trim()

      if (target === 'stem') {
        const generated = await api.generateQuestionContent(title, form.category, form.difficulty)
        onChange({
          ...form,
          content: generated.content || content || title,
        })
        showToast(
          generated.source === 'llm' ? 'AI 已生成题目详情' : '已使用演示模板（可手动修改）',
          'success',
        )
        setStemOpen(true)
      } else if (target === 'answer') {
        if (content.length < 10) {
          const generated = await api.generateQuestionContent(title, form.category, form.difficulty)
          onChange({
            ...form,
            content: generated.content || content || title,
            keyPoints: generated.keyPoints.join('\n'),
            referenceAnswer: generated.referenceAnswer,
            scoringRubric: generated.scoringRubric,
            followUpTemplates: generated.followUpTemplates.join('\n'),
          })
          showToast('AI 已生成题干与参考答案', 'success')
        } else {
          const result = await api.suggestQuestionFields(
            title,
            content,
            form.category,
            form.difficulty,
          )
          onChange({
            ...form,
            keyPoints: result.keyPoints.join('\n'),
            referenceAnswer: result.referenceAnswer,
            scoringRubric: result.scoringRubric,
            followUpTemplates: result.followUpTemplates.join('\n'),
          })
          showToast('AI 已补全参考答案', 'success')
        }
      } else if (target === 'keypoints') {
        const result = await api.suggestQuestionFields(
          title,
          content || title,
          form.category,
          form.difficulty,
        )
        onChange({
          ...form,
          keyPoints: result.keyPoints.join('\n'),
        })
        showToast('AI 已补全得分要点', 'success')
      } else if (target === 'scoring' || target === 'followups' || target === 'extra') {
        const ctx = content || form.referenceAnswer.trim() || title
        const result = await api.suggestQuestionFields(
          title,
          ctx,
          form.category,
          form.difficulty,
        )
        if (target === 'scoring') {
          onChange({ ...form, scoringRubric: result.scoringRubric })
          showToast('AI 已生成评分标准', 'success')
        } else if (target === 'followups') {
          onChange({
            ...form,
            followUpTemplates: result.followUpTemplates.join('\n'),
          })
          showToast('AI 已生成追问模板', 'success')
        } else {
          onChange({
            ...form,
            scoringRubric: result.scoringRubric,
            followUpTemplates: result.followUpTemplates.join('\n'),
            tags: form.tags.trim() || suggestTagsFromForm(form),
          })
          showToast('AI 已补全评分、追问与标签', 'success')
        }
        setExtraOpen(true)
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'AI 生成失败', 'error')
    } finally {
      setAiTarget(null)
    }
  }

  return (
    <div className="pb-20 lg:pb-6">
      <div
        className={`${adminCx.surface} flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden !shadow-[0_1px_3px_rgba(15,23,42,0.06)]`}
      >
        <header className="shrink-0 border-b border-admin-border/60 bg-admin-surface">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-5">
            <input
              id="section-stem"
              className={`min-w-[200px] flex-1 border-0 bg-transparent text-base font-semibold tracking-tight text-admin-text outline-none placeholder:text-admin-muted lg:text-lg ${
                errors.title ? 'rounded-lg ring-1 ring-red-300 px-2' : ''
              }`}
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              placeholder="题目标题"
            />
            <div className="hidden shrink-0 items-center gap-2 lg:flex">{headerActions}</div>
          </div>
          {errors.title && (
            <div className="px-4 pb-2 lg:px-5">
              <FieldError message={errors.title} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-admin-border/40 px-4 py-2.5 lg:px-5">
            <CategoryCombobox
              value={form.category}
              onChange={(category) => onChange({ ...form, category })}
              banks={banks}
            />
            <AdminSegmentedControl
              label="难度"
              value={form.difficulty}
              onChange={(difficulty) => onChange({ ...form, difficulty })}
              options={DIFFICULTIES}
            />
            <AdminSegmentedControl
              label="题型"
              value={form.type}
              onChange={(type) => onChange({ ...form, type })}
              options={QUESTION_TYPES}
            />

            <span className="hidden h-5 w-px bg-admin-border/80 sm:block" aria-hidden />

            <div
              className="inline-flex rounded-lg bg-admin-surface-alt/80 p-0.5 ring-1 ring-admin-border/70"
              role="group"
              aria-label="发布方式"
            >
              {QUESTION_PUBLISH_FLOW.filter((f) => f.status !== 'archived').map((item) => {
                const active = publishIntent === item.status
                return (
                  <button
                    key={item.status}
                    type="button"
                    title={item.summary}
                    onClick={() => onChange({ ...form, status: item.status })}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? `${adminStatusClass(item.status)} shadow-sm`
                        : 'text-admin-muted hover:text-admin-text-secondary'
                    }`}
                  >
                    {item.title}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className={`${adminCx.btnGhost} ml-auto !px-2 !py-1 !text-[11px] !rounded-lg ${
                previewOpen ? 'bg-admin-brand-light text-admin-brand' : ''
              }`}
            >
              <PanelRight className="h-3.5 w-3.5" />
              预览
            </button>
          </div>
        </header>

        {saveBanner && (
          <div className="shrink-0 border-b border-admin-border/40 px-4 py-2 lg:px-5">
            <div
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                saveBanner.type === 'error'
                  ? 'bg-red-50 text-red-800'
                  : saveBanner.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-900'
              }`}
            >
              {saveBanner.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <p className="flex-1">{saveBanner.message}</p>
              {onDismissSaveBanner && (
                <button type="button" onClick={onDismissSaveBanner} className="underline opacity-70">
                  关闭
                </button>
              )}
            </div>
          </div>
        )}

        {needsQuality && !form.referenceAnswer.trim() && (
          <p className="shrink-0 border-b border-amber-100 bg-amber-50/90 px-4 py-1.5 text-[11px] text-amber-900 lg:px-5">
            「{QUESTION_STATUS_LABEL[form.status]}」需补全参考答案
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col">
            <section
              id="section-answer"
              className="flex min-h-[min(420px,calc(100vh-16rem))] flex-1 flex-col scroll-mt-24"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-admin-border/40 px-4 py-2 lg:px-5">
                <span className="text-xs font-medium text-admin-text-secondary">参考答案</span>
                <div className="flex items-center gap-2">
                  <CharCount value={form.referenceAnswer} min={needsQuality ? 30 : undefined} />
                  <AiButton
                    primary
                    loading={aiTarget === 'answer'}
                    disabled={!form.title.trim()}
                    onClick={() => runAi('answer')}
                  >
                    AI 补全
                  </AiButton>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3 lg:p-4">
                <MarkdownEditor
                  className="min-h-0 flex-1"
                  value={form.referenceAnswer}
                  onChange={(referenceAnswer) => onChange({ ...form, referenceAnswer })}
                  minHeight={0}
                  error={Boolean(errors.referenceAnswer)}
                  enableImageUpload
                  placeholder={`## 回答重点\n\n…\n\n## 扩展知识\n\n- …`}
                />
                <FieldError message={errors.referenceAnswer} />
              </div>
            </section>

            <details
              open={keypointsOpen}
              onToggle={(e) => setKeypointsOpen(e.currentTarget.open)}
              className="shrink-0 border-t border-admin-border/40 group"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 lg:px-5 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-3.5 w-3.5 text-admin-muted transition group-open:rotate-180" />
                  <span className="text-xs font-medium text-admin-text-secondary">得分要点</span>
                  {!keypointsOpen && form.keyPoints.trim() && (
                    <span className="truncate text-[11px] text-admin-muted">
                      {form.keyPoints.split('\n').filter(Boolean).length} 条
                    </span>
                  )}
                </div>
                <span onClick={(e) => e.preventDefault()}>
                  <AiButton
                    loading={aiTarget === 'keypoints'}
                    disabled={!form.title.trim()}
                    onClick={() => runAi('keypoints')}
                  >
                    AI
                  </AiButton>
                </span>
              </summary>
              <div className="border-t border-admin-border/30 px-4 pb-3 pt-2 lg:px-5">
                <textarea
                  className={`${textareaCls} !min-h-[72px] !py-2 text-sm ${errors.keyPoints ? 'border-red-400' : ''}`}
                  rows={3}
                  value={form.keyPoints}
                  onChange={(e) => onChange({ ...form, keyPoints: e.target.value })}
                  placeholder="每行一条得分要点"
                />
                <FieldError message={errors.keyPoints} />
              </div>
            </details>
          </div>

          {previewOpen && (
            <aside className="shrink-0 border-t border-admin-border/60 bg-admin-surface-alt/40 xl:w-[min(340px,30%)] xl:border-l xl:border-t-0">
              <div className="sticky top-0 border-b border-admin-border/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-muted">
                  用户端预览
                </p>
              </div>
              <div className="max-h-[min(480px,calc(100vh-14rem))] overflow-y-auto p-3 xl:max-h-[calc(100vh-14rem)]">
                <QuestionPublicPreview question={previewQuestion} variant="admin" compact />
              </div>
            </aside>
          )}
        </div>

        <footer className="shrink-0 border-t border-admin-border/60 bg-admin-surface-alt/30">
          <details
            open={stemOpen}
            onToggle={(e) => setStemOpen(e.currentTarget.open)}
            className="group border-b border-admin-border/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 lg:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-3.5 w-3.5 text-admin-muted transition group-open:rotate-180" />
                <span className="text-xs font-medium text-admin-text-secondary">题干 / 题目详情</span>
              </div>
              <span onClick={(e) => e.preventDefault()}>
                <AiButton
                  loading={aiTarget === 'stem'}
                  disabled={!form.title.trim()}
                  onClick={() => runAi('stem')}
                >
                  AI 生成
                </AiButton>
              </span>
            </summary>
            <div className="px-4 pb-3 lg:px-5">
              <textarea
                className={`${textareaCls} !min-h-[80px] text-sm ${errors.content ? 'border-red-400' : ''}`}
                rows={3}
                value={form.content}
                onChange={(e) => onChange({ ...form, content: e.target.value })}
                placeholder="面试提问原文（可留空，保存时用标题兜底）"
              />
              <div className="mt-1 flex justify-between">
                <FieldError message={errors.content} />
                <CharCount value={form.content} min={contentMin} />
              </div>
            </div>
          </details>

          <details
            open={extraOpen}
            onToggle={(e) => setExtraOpen(e.currentTarget.open)}
            id="section-publish"
            className="group scroll-mt-24"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 lg:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-admin-muted transition group-open:rotate-180" />
                <span className="text-xs font-medium text-admin-text-secondary">
                  更多 · 评分 / 追问 / 标签
                </span>
                {!extraOpen && (
                  <span className="truncate text-[11px] text-admin-muted">
                    {[
                      form.scoringRubric.trim() && '评分',
                      form.followUpTemplates.trim() && '追问',
                      form.tags.trim() && '标签',
                    ]
                      .filter(Boolean)
                      .join(' · ') || '选填，可 AI 补全'}
                  </span>
                )}
              </div>
              <span onClick={(e) => e.preventDefault()}>
                <AiButton
                  primary
                  loading={aiTarget === 'extra'}
                  disabled={!form.title.trim()}
                  onClick={() => runAi('extra')}
                >
                  AI 补全
                </AiButton>
              </span>
            </summary>
            <div className="grid gap-3 border-t border-admin-border/30 px-4 pb-4 pt-3 lg:grid-cols-3 lg:px-5">
              <ExtraFieldBlock
                label="评分标准"
                hint="面试官打分依据，支持 Markdown"
                action={
                  <AiButton
                    loading={aiTarget === 'scoring'}
                    disabled={!form.title.trim()}
                    onClick={() => runAi('scoring')}
                  >
                    AI
                  </AiButton>
                }
              >
                <textarea
                  className={`${textareaCls} min-h-[88px] flex-1 !py-2 text-sm`}
                  rows={4}
                  value={form.scoringRubric}
                  onChange={(e) => onChange({ ...form, scoringRubric: e.target.value })}
                  placeholder={'- 能说出核心原理（40%）\n- 能举实际案例（30%）\n- 能对比方案优劣（30%）'}
                />
              </ExtraFieldBlock>

              <ExtraFieldBlock
                label="追问模板"
                hint="每行一条，模拟面试官追问"
                action={
                  <AiButton
                    loading={aiTarget === 'followups'}
                    disabled={!form.title.trim()}
                    onClick={() => runAi('followups')}
                  >
                    AI
                  </AiButton>
                }
              >
                <textarea
                  className={`${textareaCls} min-h-[88px] flex-1 !py-2 text-sm`}
                  rows={4}
                  value={form.followUpTemplates}
                  onChange={(e) => onChange({ ...form, followUpTemplates: e.target.value })}
                  placeholder={'如果并发量再增大，你会怎么优化？\n线上出现 Full GC 如何排查？'}
                />
              </ExtraFieldBlock>

              <ExtraFieldBlock
                label="标签"
                hint="逗号分隔，用于搜索与归类"
              >
                <input
                  className={`${adminCx.input} w-full !py-2 text-sm ${errors.tags ? 'border-red-400' : ''}`}
                  value={form.tags}
                  onChange={(e) => onChange({ ...form, tags: e.target.value })}
                  placeholder="JVM, GC, 调优"
                />
                <FieldError message={errors.tags} />
                {form.tags.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.tags
                      .split(/[,，]/)
                      .map((t: string) => t.trim())
                      .filter(Boolean)
                      .map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-md bg-admin-brand-light/60 px-2 py-0.5 text-[10px] font-medium text-admin-brand"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </ExtraFieldBlock>
            </div>
          </details>
        </footer>
      </div>
    </div>
  )
}

export type QuestionFormEditorActionsProps = {
  saving?: boolean
  canSave: boolean
  publishIntent: QuestionPublishIntent
  autosaveHint?: string | null
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  variant?: 'fixed' | 'inline'
}

const SAVE_LABEL: Record<QuestionPublishIntent, string> = {
  draft: '保存草稿',
  review: '提交审核',
  published: '保存并发布',
}

export function QuestionFormEditorActions({
  saving,
  canSave,
  publishIntent,
  autosaveHint,
  onCancel,
  onSaveDraft,
  onSave,
  variant = 'fixed',
}: QuestionFormEditorActionsProps) {
  const primaryLabel = SAVE_LABEL[publishIntent]

  const buttons = (
    <>
      <button
        type="button"
        onClick={onCancel}
        className={`${adminCx.btnGhost} !px-3 !py-1.5 !text-xs`}
        disabled={saving}
      >
        返回
      </button>
      {publishIntent !== 'draft' && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving || !canSave}
          className={`${adminCx.btnSecondary} !px-3 !py-1.5 !text-xs`}
        >
          {saving ? '…' : '草稿'}
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !canSave}
        className={`${adminCx.btnPrimary} !px-4 !py-1.5 !text-xs`}
      >
        {saving ? '保存中…' : primaryLabel}
      </button>
    </>
  )

  if (variant === 'inline') {
    return <div className="flex items-center gap-1.5">{buttons}</div>
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-admin-border/80 bg-admin-surface/98 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <p className="min-w-0 truncate text-[10px] text-admin-muted">
          {autosaveHint ?? SAVE_LABEL[publishIntent]}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">{buttons}</div>
      </div>
    </div>
  )
}

export function QuestionFormHeaderActions(props: QuestionFormEditorActionsProps) {
  return <QuestionFormEditorActions {...props} variant="inline" />
}

import type { ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'
import { MarkdownContent } from '../markdown/MarkdownContent'
import { DifficultyTag, CategoryTag, TypeTag } from './QuestionTags'
import {
  questionSubtitle,
  shouldShowKeyPointsSection,
  shouldShowQuestionSection,
} from './questionDisplayUtils'

export type PublicPreviewQuestion = {
  title: string
  content: string
  category: string
  difficulty: string
  type?: string
  tags?: string[]
  keyPoints?: string[]
  referenceAnswer?: string
  scoringRubric?: string
  followUpTemplates?: string[]
  views?: number
}

type Props = {
  question: PublicPreviewQuestion
  /** admin：嵌入后台录入/审核；user：与用户端刷题页一致 */
  variant?: 'user' | 'admin'
  compact?: boolean
  /** 为 false 时不渲染标题/标签区（嵌入 QuestionDetailPanel 时使用） */
  showHeader?: boolean
  /** 为刷题页 TOC 锚点添加 section-* id */
  withSectionIds?: boolean
}

function SectionTitle({
  children,
  variant,
}: {
  children: ReactNode
  variant: 'user' | 'admin'
}) {
  if (variant === 'admin') {
    return (
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-admin-muted">
        {children}
      </h4>
    )
  }
  return (
    <h3 className="mb-3 scroll-mt-28 border-l-[3px] border-brand pl-3 text-sm font-bold text-text">
      {children}
    </h3>
  )
}

function KeyPointList({
  items,
  variant,
}: {
  items: string[]
  variant: 'user' | 'admin'
}) {
  if (variant === 'admin') {
    return (
      <ul className="space-y-2 rounded-lg border border-admin-border/50 bg-admin-surface-alt/60 p-3">
        {items.map((p) => (
          <li key={p} className="flex gap-2 text-sm leading-relaxed text-admin-text-secondary">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-admin-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="rounded-xl border border-brand/20 bg-brand-light/20 p-4">
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-text-secondary">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 与用户端「推荐答案」Tab 同结构的只读预览 */
export function QuestionPublicPreview({
  question,
  variant = 'user',
  compact,
  showHeader = true,
  withSectionIds = false,
}: Props) {
  const subtitle = questionSubtitle(question.content, question.title)
  const showQuestionBody = shouldShowQuestionSection(question.content, question.title)
  const showKeyPoints = shouldShowKeyPointsSection(
    question.keyPoints,
    question.referenceAnswer,
  )

  const shellClass =
    variant === 'admin'
      ? `${compact ? '' : 'rounded-2xl border border-admin-border bg-admin-surface p-4'} space-y-4`
      : 'space-y-6'

  const mdClass = variant === 'admin' ? 'admin-md-preview' : undefined

  return (
    <div className={shellClass}>
      {variant === 'admin' && !compact && (
        <div className="border-b border-admin-border/60 pb-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-admin-brand">
            用户端预览
          </p>
          <p className="mt-0.5 text-[11px] text-admin-muted">
            与刷题页「推荐答案」展示一致
          </p>
        </div>
      )}

      <header className={showHeader ? undefined : 'hidden'}>
        <h2
          className={
            variant === 'admin'
              ? 'text-base font-bold leading-snug text-admin-text'
              : 'text-2xl font-bold leading-tight text-text'
          }
        >
          {question.title || '（未填写标题）'}
        </h2>
        {subtitle && (
          <p
            className={
              variant === 'admin'
                ? 'mt-2 text-sm leading-relaxed text-admin-text-secondary'
                : 'mt-3 text-[15px] leading-relaxed text-text-secondary'
            }
          >
            {subtitle}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {variant === 'admin' ? (
            <>
              <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200/50">
                {question.category}
              </span>
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200/60">
                {question.difficulty}
              </span>
              {question.type && (
                <span className="inline-flex rounded-full bg-admin-surface-alt px-2.5 py-1 text-xs text-admin-text-secondary ring-1 ring-admin-border">
                  {question.type}
                </span>
              )}
            </>
          ) : (
            <>
              <DifficultyTag difficulty={question.difficulty} />
              <CategoryTag>{question.category}</CategoryTag>
              {question.type && <TypeTag>{question.type}</TypeTag>}
            </>
          )}
          {question.tags?.map((tag) => (
            <span
              key={tag}
              className={
                variant === 'admin'
                  ? 'rounded-md bg-admin-surface-alt px-2 py-0.5 text-[11px] text-admin-muted ring-1 ring-admin-border'
                  : 'rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border/60'
              }
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {showQuestionBody && (
        <section id={withSectionIds ? 'section-question' : undefined} className={withSectionIds ? 'scroll-mt-32' : undefined}>
          <SectionTitle variant={variant}>题目详情</SectionTitle>
          <div className={mdClass}>
            <MarkdownContent source={question.content} headingIdPrefix="pub-q" />
          </div>
        </section>
      )}

      {showKeyPoints && question.keyPoints && (
        <section id={withSectionIds ? 'section-keypoints' : undefined} className={withSectionIds ? 'scroll-mt-28' : undefined}>
          <SectionTitle variant={variant}>回答重点</SectionTitle>
          <KeyPointList items={question.keyPoints} variant={variant} />
        </section>
      )}

      {question.referenceAnswer && (
        <section id={withSectionIds ? 'section-ref' : undefined} className={withSectionIds ? 'scroll-mt-28' : undefined}>
          {variant === 'user' && !withSectionIds && (
            <SectionTitle variant={variant}>推荐答案</SectionTitle>
          )}
          <div className={mdClass}>
            <MarkdownContent source={question.referenceAnswer} headingIdPrefix="pub-ref" />
          </div>
        </section>
      )}

      {question.scoringRubric && (
        <section id={withSectionIds ? 'section-rubric' : undefined} className={withSectionIds ? 'scroll-mt-28' : undefined}>
          <SectionTitle variant={variant}>扩展知识</SectionTitle>
          <div className={mdClass}>
            <MarkdownContent source={question.scoringRubric} headingIdPrefix="pub-rubric" />
          </div>
        </section>
      )}

      {question.followUpTemplates && question.followUpTemplates.length > 0 && (
        <section id={withSectionIds ? 'section-followup-preview' : undefined} className={withSectionIds ? 'scroll-mt-28' : undefined}>
          <SectionTitle variant={variant}>面试官追问</SectionTitle>
          <KeyPointList items={question.followUpTemplates} variant={variant} />
        </section>
      )}

      {!question.referenceAnswer?.trim() && !showQuestionBody && (
        <p
          className={
            variant === 'admin'
              ? 'rounded-lg border border-dashed border-admin-border px-3 py-6 text-center text-sm text-admin-muted'
              : 'rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted'
          }
        >
          补全参考答案后，此处将显示与用户端一致的内容
        </p>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'

import { ExternalLink, Pencil } from 'lucide-react'

import type { Question } from '../../api/client'

import { categoryToSlug } from '../question-bank/bankCatalog'

import {

  AdminCategoryTag,

  AdminDifficultyTag,

  AdminStatusPill,

} from './AdminBadges'

import { adminCx } from './adminTheme'

import {

  formatQuestionDate,

  getQuestionQualityMeta,

  truncateText,

} from './questionAdminUtils'

import { questionToPreviewQuestion } from './questionFormUtils'

import { QuestionPublicPreview } from '../question-bank/QuestionPublicPreview'



type Props = {

  question: Question

  compact?: boolean

}



export function QuestionAdminPreview({ question, compact }: Props) {

  const q = question

  const meta = getQuestionQualityMeta(q)

  const slug = categoryToSlug(q.category) ?? 'java'



  return (

    <div className={`space-y-4 ${compact ? '' : 'rounded-xl border border-admin-border/60 bg-admin-surface-alt/60 p-4'}`}>

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div className="flex flex-wrap items-center gap-2">

          <AdminCategoryTag>{q.category}</AdminCategoryTag>

          {q.type && (

            <span className="rounded-full bg-admin-surface px-2 py-0.5 text-[11px] font-medium text-admin-text-secondary ring-1 ring-admin-border">

              {q.type}

            </span>

          )}

          <AdminDifficultyTag difficulty={q.difficulty} />

          <AdminStatusPill status={q.status ?? 'draft'} />

        </div>

        <div className="flex flex-wrap gap-2">

          {q.status === 'published' && (

            <Link

              to={`/questions/${slug}?id=${q.id}`}

              target="_blank"

              className={`${adminCx.btnGhost} text-xs`}

            >

              <ExternalLink className="h-3.5 w-3.5" />

              用户端预览

            </Link>

          )}

          <Link to={`/admin/manage/${q.id}`} className={`${adminCx.btnSecondary} text-xs`}>

            <Pencil className="h-3.5 w-3.5" />

            编辑

          </Link>

        </div>

      </div>



      <QuestionPublicPreview

        question={questionToPreviewQuestion(q)}

        variant="admin"

        compact

      />



      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-admin-border/60 pt-3 text-xs text-admin-muted">

        <span>标签：{(q.tags ?? []).join('、') || '—'}</span>

        <span>要点 {meta.keyPointCount} 条</span>

        <span>浏览 {q.views ?? 0}</span>

        <span>录入 {formatQuestionDate(q.createdAt)}</span>

        <span className="font-mono">{q.id}</span>

        {!meta.complete && (

          <span className="text-amber-700">待补：{meta.missing.join('、')}</span>

        )}

      </div>

    </div>

  )

}



export function QuestionAnswerPreviewCell({

  question,

  onPreview,

}: {

  question: Question

  onPreview: () => void

}) {

  const answer = question.referenceAnswer?.trim()

  if (!answer) {

    return (

      <button

        type="button"

        onClick={onPreview}

        className="text-left text-xs text-amber-700 underline-offset-2 hover:underline"

      >

        暂无答案

      </button>

    )

  }

  return (

    <button

      type="button"

      onClick={onPreview}

      className="max-w-[220px] text-left text-xs leading-relaxed text-admin-text-secondary underline-offset-2 hover:text-admin-brand hover:underline"

      title={answer}

    >

      {truncateText(answer, 56)}

    </button>

  )

}


import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { categoryToSlug } from '../../components/question-bank/bankCatalog'
import { api, ApiError, type Question } from '../../api/client'
import {
  QuestionFormEditor,
  QuestionFormEditorActions,
} from '../../components/admin/QuestionFormEditor'
import {
  emptyQuestionForm,
  formToPayload,
  questionToForm,
  QUESTION_PUBLISH_INTENTS,
  getQuestionCompletionPct,
  getQuestionNextStep,
  type QuestionFormData,
  type QuestionPublishIntent,
} from '../../components/admin/questionFormUtils'
import {
  validateQuestionForm,
  type QuestionFormErrors,
} from '../../components/admin/questionFormValidation'
import { AdminStatusPill } from '../../components/admin/AdminBadges'
import { AdminSmartGuide } from '../../components/admin/AdminSmartGuide'
import {
  migrateQuestionDraft,
  useQuestionDraftAutosave,
} from '../../components/admin/useQuestionDraftAutosave'
import { QUESTION_STATUS_LABEL, adminLayout } from '../../components/admin/adminTheme'
import { useToast } from '../../contexts/ToastContext'
import { Loading } from '../../components/ui/Loading'

function formatAutosaveTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function AdminQuestionEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(!isNew)
  const [question, setQuestion] = useState<Question | null>(null)
  const [form, setForm] = useState<QuestionFormData>(emptyQuestionForm)
  const [formErrors, setFormErrors] = useState<QuestionFormErrors>({})
  const [saveBanner, setSaveBanner] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const baselineForm = useMemo(
    () => (question ? questionToForm(question) : emptyQuestionForm),
    [question],
  )

  const draftKey = isNew ? 'new' : (id ?? 'new')

  const {
    pendingRestore,
    pendingSavedAt,
    lastAutosavedAt,
    restoreDraft,
    dismissRestore,
    clearDraft,
  } = useQuestionDraftAutosave({
    draftKey,
    form,
    baselineForm,
    onRestore: (restored) => {
      setForm(restored)
      setFormErrors({})
      showToast('已恢复本地草稿', 'success')
    },
    enabled: !saving && !loading,
  })

  const loadQuestion = useCallback(async () => {
    if (isNew || !id) return
    setLoading(true)
    try {
      const q = await api.getQuestion(id)
      setQuestion(q)
      setForm(questionToForm(q))
    } catch (e) {
      showToast(e instanceof Error ? e.message : '加载失败', 'error')
      navigate('/admin/manage', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [id, isNew, navigate, showToast])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  const showSaveSuccessToast = (saved: Question, status: string) => {
    if (status === 'review') {
      showToast('已提交审核', 'success', {
        action: { label: '去审核队列', to: '/admin/questions' },
      })
      return
    }
    if (status === 'published') {
      const slug = categoryToSlug(saved.category) ?? 'java'
      showToast('已发布，用户端可见', 'success', {
        action: {
          label: '用户端预览',
          to: `/questions/${slug}?id=${saved.id}`,
          external: true,
        },
      })
      return
    }
    showToast(isNew ? '题目已创建' : '题目已更新', 'success')
  }

  const persist = async (opts?: {
    forceDraft?: boolean
    scrollToAnswer?: boolean
    formOverride?: QuestionFormData
  }) => {
    const base = opts?.formOverride ?? form
    const draftForm = opts?.forceDraft ? { ...base, status: 'draft' as const } : base
    const validation = validateQuestionForm(draftForm)
    if (!validation.ok) {
      setFormErrors(validation.errors)
      setSaveBanner({ type: 'error', message: validation.messages.join('；') })
      showToast(validation.messages.join('；'), 'error')
      const anchor =
        validation.focusTab === 'quality' ? 'section-answer' : 'section-stem'
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return false
    }

    setFormErrors({})
    setSaveBanner(null)
    setSaving(true)
    try {
      const payload = formToPayload(draftForm)
      let saved: Question
      const wasNew = isNew

      if (isNew) {
        saved = await api.createQuestion(payload)
        setQuestion(saved)
        setForm(questionToForm(saved))
        migrateQuestionDraft('new', saved.id)
        clearDraft()
        navigate(`/admin/manage/${saved.id}`, { replace: true })
      } else if (question) {
        saved = await api.updateQuestion(question.id, payload)
        setQuestion(saved)
        setForm(questionToForm(saved))
        clearDraft()
      } else {
        return false
      }

      const qualityIncomplete =
        !payload.keyPoints?.length || !payload.referenceAnswer?.trim()

      if (payload.status === 'draft' && qualityIncomplete) {
        const msg = '已保存草稿。建议继续填写参考答案，或使用「AI 补全答案」。'
        setSaveBanner({ type: 'success', message: msg })
        showToast('已保存草稿', 'success', {
          action: {
            label: '去补全答案',
            onClick: () => {
              document.getElementById('section-answer')?.scrollIntoView({ behavior: 'smooth' })
            },
          },
        })
        if (opts?.scrollToAnswer !== false) {
          window.setTimeout(() => {
            document.getElementById('section-answer')?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
        return true
      }

      showSaveSuccessToast(saved, payload.status ?? 'draft')
      setSaveBanner({
        type: 'success',
        message: `保存成功 · 状态：${QUESTION_STATUS_LABEL[payload.status ?? 'draft']}`,
      })
      if (wasNew && payload.status === 'review') {
        // navigate already happened; toast action still works
      }
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败'
      setSaveBanner({ type: 'error', message: msg })
      if (e instanceof ApiError && e.duplicateId) {
        showToast(msg, 'error', {
          action: { label: '查看相似题', to: `/admin/manage/${e.duplicateId}` },
        })
      } else {
        showToast(msg, 'error')
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = () => {
    const draftForm = { ...form, status: 'draft' as const }
    setForm(draftForm)
    void persist({ forceDraft: true, formOverride: draftForm })
  }

  const handleSave = () => {
    void persist()
  }

  const canSave = Boolean(form.title.trim())

  const publishIntent: QuestionPublishIntent = QUESTION_PUBLISH_INTENTS.includes(
    form.status as QuestionPublishIntent,
  )
    ? (form.status as QuestionPublishIntent)
    : 'draft'

  const autosaveHint = lastAutosavedAt
    ? `本地草稿已于 ${formatAutosaveTime(lastAutosavedAt)} 自动保存（约 30 秒一次）`
    : null

  const smartGuide = useMemo(() => {
    const pct = getQuestionCompletionPct(form)
    const next = getQuestionNextStep(form)

    if (form.status === 'review') {
      return {
        variant: 'warning' as const,
        title: '发布方式：提交审核',
        description: '保存后进入审核队列；通过前用户看不到此题。你或同事在队列中点「通过」即可。',
        actions: [{ label: '打开审核队列', to: '/admin/questions' }],
      }
    }
    if (form.status === 'published') {
      const slug = categoryToSlug(form.category) ?? 'java'
      const previewTo = question ? `/questions/${slug}?id=${question.id}` : undefined
      return {
        variant: 'success' as const,
        title: '发布方式：直接发布',
        description: '保存后立即对用户可见，无需再审。适合已确认质量的题目。',
        actions: previewTo
          ? [{ label: '用户端预览', to: previewTo, external: true }]
          : undefined,
      }
    }
    if (form.status === 'archived') {
      return {
        variant: 'info' as const,
        title: '题目已归档',
        description: '选择「草稿」或「直接发布」并保存，可恢复至正常流程。',
      }
    }
    if (next) {
      return {
        variant: 'info' as const,
        title: `录入进度 ${pct}%`,
        description: `建议下一步：${next.label}。也可先用 AI 一键补全参考答案。`,
        actions: [
          {
            label: `前往${next.label}`,
            onClick: () => {
              document.getElementById(next.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
          },
        ],
      }
    }
    return {
      variant: 'success' as const,
      title: '录入已完成',
      description: '可选择发布方式后保存，或使用底部「保存草稿」暂存。',
    }
  }, [form, question])

  if (loading) {
    return <Loading text="加载题目…" />
  }

  return (
    <div className={`${adminLayout.stackGap} pb-24`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin/manage"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-admin-muted transition hover:text-admin-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            返回题库管理
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-admin-text">
            {isNew ? '新增题目' : '编辑题目'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-admin-text-secondary">
            在此完成题干、参考答案与发布设置。参考答案即题库答案，用户刷题与 AI 面试共用。
          </p>
          {!isNew && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-admin-muted">
              {question && <span className="font-mono">{question.id}</span>}
              <AdminStatusPill status={form.status ?? 'draft'} />
            </div>
          )}
        </div>
      </div>

      {pendingRestore && (
        <AdminSmartGuide
          variant="warning"
          title="发现未同步的本地草稿"
          description={
            pendingSavedAt
              ? `约 ${formatAutosaveTime(pendingSavedAt)} 的编辑内容仍在浏览器中，是否恢复？`
              : '浏览器中有未同步到服务器的编辑内容，是否恢复？'
          }
          actions={[
            { label: '恢复草稿', onClick: restoreDraft },
            { label: '丢弃', onClick: dismissRestore },
          ]}
        />
      )}

      {smartGuide && <AdminSmartGuide {...smartGuide} />}

      <QuestionFormEditor
        form={form}
        errors={formErrors}
        saveBanner={saveBanner}
        onDismissSaveBanner={() => setSaveBanner(null)}
        onChange={(next) => {
          setForm(next)
          if (Object.keys(formErrors).length) setFormErrors({})
          if (saveBanner?.type === 'error') setSaveBanner(null)
        }}
      />

      <QuestionFormEditorActions
        saving={saving}
        canSave={canSave}
        publishIntent={publishIntent}
        autosaveHint={autosaveHint}
        onCancel={() => navigate('/admin/manage')}
        onSaveDraft={handleSaveDraft}
        onSave={handleSave}
      />
    </div>
  )
}


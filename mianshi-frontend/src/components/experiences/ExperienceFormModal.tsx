import { useEffect, useState, type ReactNode } from 'react'
import { api, type Experience } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { AdminSelect } from '../admin/AdminToolbar'
import { AdminFormField } from '../admin/AdminFormField'
import { adminCx } from '../admin/adminTheme'

const RESULTS = ['通过', '待定', '未通过'] as const

export type ExperienceFormData = {
  company: string
  position: string
  result: (typeof RESULTS)[number]
  rounds: number
  author: string
  date: string
  summary: string
  content: string
}

const adminEmptyForm: ExperienceFormData = {
  company: '',
  position: '',
  result: '通过',
  rounds: 3,
  author: '运营',
  date: new Date().toISOString().slice(0, 10),
  summary: '',
  content: '',
}

const userEmptyForm: ExperienceFormData = {
  company: '',
  position: '',
  result: '通过',
  rounds: 3,
  author: '',
  date: '',
  summary: '',
  content: '',
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Experience | null
  /** admin：后台录入；user：用户分享面经（需审核） */
  variant?: 'admin' | 'user'
}

function FieldWrap({
  variant,
  label,
  required,
  hint,
  children,
}: {
  variant: 'admin' | 'user'
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  if (variant === 'admin') {
    return (
      <AdminFormField label={label} required={required} hint={hint}>
        {children}
      </AdminFormField>
    )
  }
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function ExperienceFormModal({
  open,
  onClose,
  onSaved,
  editing,
  variant = 'admin',
}: Props) {
  const { showToast } = useToast()
  const [form, setForm] = useState<ExperienceFormData>(
    variant === 'admin' ? adminEmptyForm : userEmptyForm,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputCls =
    variant === 'admin'
      ? `${adminCx.input} w-full`
      : 'w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20'
  const textareaCls =
    variant === 'admin'
      ? `${adminCx.textarea} w-full`
      : `${inputCls} resize-y`

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setForm({
        company: editing.company,
        position: editing.position,
        result: editing.result as ExperienceFormData['result'],
        rounds: editing.rounds,
        author: editing.author,
        date: editing.date,
        summary: editing.summary,
        content: editing.content,
      })
    } else {
      const base = variant === 'admin' ? adminEmptyForm : userEmptyForm
      setForm({
        ...base,
        date: variant === 'admin' ? new Date().toISOString().slice(0, 10) : base.date,
      })
    }
  }, [open, editing, variant])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await api.updateExperience(editing.id, form)
      } else if (variant === 'admin') {
        await api.createExperience({ ...form, status: 'published' })
      } else {
        await api.createExperience(form)
        showToast('提交成功！审核通过后将公开展示。', 'success')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const title =
    variant === 'admin'
      ? editing
        ? '编辑面经'
        : '录入面经'
      : editing
        ? '编辑面经'
        : '分享面经'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrap variant={variant} label="公司名称" required>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputCls}
              placeholder="如：腾讯"
            />
          </FieldWrap>
          <FieldWrap variant={variant} label="岗位" required>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className={inputCls}
              placeholder="如：前端开发"
            />
          </FieldWrap>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldWrap
            variant={variant}
            label="面试结果"
            hint={variant === 'admin' ? '通过 / 待定 / 未通过' : undefined}
          >
            {variant === 'admin' ? (
              <AdminSelect
                value={form.result}
                onChange={(v) => setForm({ ...form, result: v as ExperienceFormData['result'] })}
              >
                {RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </AdminSelect>
            ) : (
              <select
                value={form.result}
                onChange={(e) =>
                  setForm({ ...form, result: e.target.value as ExperienceFormData['result'] })
                }
                className={inputCls}
              >
                {RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </FieldWrap>
          <FieldWrap variant={variant} label="面试轮次">
            <input
              type="number"
              min={1}
              max={20}
              value={form.rounds}
              onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })}
              className={inputCls}
            />
          </FieldWrap>
          <FieldWrap variant={variant} label="日期">
            <input
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
              placeholder="2026-01"
            />
          </FieldWrap>
        </div>

        <FieldWrap variant={variant} label="作者">
          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            className={inputCls}
            placeholder={variant === 'user' ? '昵称' : undefined}
          />
        </FieldWrap>

        <FieldWrap
          variant={variant}
          label="摘要"
          required
          hint={variant === 'admin' ? '10–500 字，列表页展示' : '列表页展示的简短摘要'}
        >
          <textarea
            rows={2}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className={textareaCls}
          />
        </FieldWrap>

        <FieldWrap variant={variant} label="面经全文" required>
          <textarea
            rows={variant === 'admin' ? 8 : 5}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={textareaCls}
          />
        </FieldWrap>

        <div
          className={`flex justify-end gap-2 pt-4 ${
            variant === 'admin' ? 'border-t border-admin-border/60' : ''
          }`}
        >
          <Button variant="secondary" size={variant === 'admin' ? 'sm' : 'md'} onClick={onClose}>
            取消
          </Button>
          <Button size={variant === 'admin' ? 'sm' : 'md'} disabled={saving} onClick={handleSave}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

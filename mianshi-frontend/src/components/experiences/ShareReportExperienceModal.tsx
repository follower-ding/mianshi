import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ReportExperienceDraft } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const RESULTS = ['通过', '待定', '未通过'] as const

type Props = {
  reportId: string
  open: boolean
  onClose: () => void
  onShared: (experienceId: string) => void
}

export function ShareReportExperienceModal({ reportId, open, onClose, onShared }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyShared, setAlreadyShared] = useState<{ experienceId: string } | null>(null)
  const [form, setForm] = useState<ReportExperienceDraft | null>(null)

  useEffect(() => {
    if (!open || !reportId) return
    setLoading(true)
    setError(null)
    setAlreadyShared(null)
    setForm(null)
    api
      .getReportSharePreview(reportId)
      .then((res) => {
        if (res.alreadyShared) {
          setAlreadyShared({ experienceId: res.experienceId })
        } else {
          setForm(res.draft)
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [open, reportId])

  const handleShare = async () => {
    if (!form || !form.company.trim()) {
      setError('请填写公司或面试来源')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await api.shareReportToExperience(reportId, {
        company: form.company.trim(),
        result: form.result,
        author: form.author.trim(),
        date: form.date.trim(),
        summary: form.summary.trim(),
        content: form.content.trim(),
      })
      showToast(res.message, 'success')
      onShared(res.experience.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '分享失败')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20'
  const textareaCls = `${inputCls} resize-y font-mono text-xs leading-relaxed`

  return (
    <Modal open={open} onClose={onClose} title="分享到面经社区" maxWidth="max-w-2xl">
      {loading && <p className="text-sm text-muted">正在从面试报告生成面经…</p>}

      {alreadyShared && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">这份面试报告已经分享过面经了。</p>
          <Link to={`/experiences/${alreadyShared.experienceId}`}>
            <Button variant="secondary">前往面经详情</Button>
          </Link>
        </div>
      )}

      {!loading && form && (
        <div className="space-y-4">
          <p className="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs leading-relaxed text-text-secondary">
            系统已根据你的模拟面试报告生成面经草稿。请补充公司/来源信息，可按需编辑后再发布，供其他同学学习参考。
          </p>

          {error && (
            <div className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                公司 / 来源 <span className="text-danger">*</span>
              </label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className={inputCls}
                placeholder="如：腾讯；或填「AI 模拟面试」"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">岗位</label>
              <input value={form.position} readOnly className={`${inputCls} opacity-70`} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">结果</label>
              <select
                value={form.result}
                onChange={(e) =>
                  setForm({ ...form, result: e.target.value as ReportExperienceDraft['result'] })
                }
                className={inputCls}
              >
                {RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">轮次</label>
              <input
                type="number"
                min={1}
                value={form.rounds}
                readOnly
                className={`${inputCls} opacity-70`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">日期</label>
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">摘要</label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className={textareaCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              面经正文（可编辑）
            </label>
            <textarea
              rows={12}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={textareaCls}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button disabled={saving} onClick={handleShare}>
              {saving ? '发布中…' : '发布到面经社区'}
            </Button>
          </div>
        </div>
      )}

      {!loading && error && !form && !alreadyShared && (
        <p className="text-sm text-danger">{error}</p>
      )}
    </Modal>
  )
}

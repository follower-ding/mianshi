import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, type JobPreference } from '../../api/client'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const DEFAULT: Omit<
  JobPreference,
  'userId' | 'updatedAt' | 'lastCrawlAt' | 'manualCrawlPositions' | 'manualCrawlCities'
> = {
  targetCompanies: ['字节跳动', '阿里巴巴', '腾讯'],
  targetCities: ['北京', '上海'],
  targetPositions: ['Java 后端', 'Go 后端'],
  salaryMin: 20,
  salaryMax: 50,
  excludeKeywords: ['外包', '驻场'],
  dailyApplyLimit: 8,
  autoApplyMode: 'review',
  maxJobsAutoCrawl: 20,
  maxJobsManualCrawl: 30,
  maxManualCrawlsPerDay: 3,
  dailyRecommendLimit: 8,
  resumeSummary: '',
}

type Tab = 'auto' | 'ai'

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

function linesToList(text: string) {
  return text.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean)
}

function listToLines(list: string[]) {
  return list.join('\n')
}

const inputCls =
  'w-full rounded-lg border border-gray-700/80 bg-[#0a0e14] px-3 py-2 text-sm text-text outline-none focus:border-cyan-500/50'

export function JobPreferencesModal({ open, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('auto')
  const [form, setForm] = useState(DEFAULT)
  const [companiesText, setCompaniesText] = useState('')
  const [citiesText, setCitiesText] = useState('')
  const [positionsText, setPositionsText] = useState('')
  const [excludeText, setExcludeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api
      .getJobPreferences()
      .then((res) => {
        const p = res.preference
        setForm({
          targetCompanies: p.targetCompanies,
          targetCities: p.targetCities,
          targetPositions: p.targetPositions,
          salaryMin: p.salaryMin,
          salaryMax: p.salaryMax,
          excludeKeywords: p.excludeKeywords,
          dailyApplyLimit: p.dailyApplyLimit,
          autoApplyMode: p.autoApplyMode,
          maxJobsAutoCrawl: p.maxJobsAutoCrawl ?? 30,
          maxJobsManualCrawl: p.maxJobsManualCrawl ?? 50,
          maxManualCrawlsPerDay: p.maxManualCrawlsPerDay ?? 5,
          dailyRecommendLimit: p.dailyRecommendLimit ?? 10,
          resumeSummary: p.resumeSummary ?? '',
        })
        setCompaniesText(listToLines(p.targetCompanies))
        setCitiesText(listToLines(p.targetCities))
        setPositionsText(listToLines(p.targetPositions))
        setExcludeText(listToLines(p.excludeKeywords))
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateJobPreferences({
        ...form,
        targetCompanies: linesToList(companiesText),
        targetCities: linesToList(citiesText),
        targetPositions: linesToList(positionsText),
        excludeKeywords: linesToList(excludeText),
      })
      onSaved?.()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="求职画像（定时自动抓取）">
      {loading ? (
        <p className="text-sm text-text-secondary">加载中…</p>
      ) : (
        <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
          <p className="text-xs leading-relaxed text-text-secondary">
            此处仅配置<strong className="text-text">定时/后台自动抓取</strong>条件。
            手动点「抓取 Boss」请在弹窗里单独设置，两者互不影响。
          </p>

          <div className="flex gap-1 rounded-lg bg-[#0a0e14]/80 p-1">
            {(
              [
                ['auto', '自动抓取条件'],
                ['ai', 'AI 与推荐'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === key
                    ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'auto' && (
            <div className="space-y-3">
              <Field label="目标公司">
                <textarea className={inputCls} rows={2} value={companiesText} onChange={(e) => setCompaniesText(e.target.value)} placeholder="每行一个" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="目标城市">
                  <textarea className={inputCls} rows={2} value={citiesText} onChange={(e) => setCitiesText(e.target.value)} />
                </Field>
                <Field label="岗位关键词">
                  <textarea className={inputCls} rows={2} value={positionsText} onChange={(e) => setPositionsText(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="薪资下限 K">
                  <input type="number" className={inputCls} value={form.salaryMin ?? ''} onChange={(e) => setForm({ ...form, salaryMin: Number(e.target.value) || undefined })} />
                </Field>
                <Field label="薪资上限 K">
                  <input type="number" className={inputCls} value={form.salaryMax ?? ''} onChange={(e) => setForm({ ...form, salaryMax: Number(e.target.value) || undefined })} />
                </Field>
              </div>
              <Field label="排除关键词">
                <input className={inputCls} value={excludeText} onChange={(e) => setExcludeText(e.target.value)} placeholder="外包, 驻场" />
              </Field>
              <Field label="定时抓取上限（个/次）">
                <input type="number" min={5} max={200} className={inputCls} value={form.maxJobsAutoCrawl ?? 30} onChange={(e) => setForm({ ...form, maxJobsAutoCrawl: Number(e.target.value) || 30 })} />
              </Field>
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-3">
              <Field label="简历亮点（AI 打招呼 / 回复 HR 用）">
                <textarea className={inputCls} rows={4} value={form.resumeSummary ?? ''} onChange={(e) => setForm({ ...form, resumeSummary: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="今日推荐条数">
                  <input type="number" min={3} max={50} className={inputCls} value={form.dailyRecommendLimit ?? 10} onChange={(e) => setForm({ ...form, dailyRecommendLimit: Number(e.target.value) || 10 })} />
                </Field>
                <Field label="每日打招呼上限">
                  <input type="number" min={1} max={50} className={inputCls} value={form.dailyApplyLimit} onChange={(e) => setForm({ ...form, dailyApplyLimit: Number(e.target.value) || 10 })} />
                </Field>
              </div>
              <Field label="自动打招呼">
                <select className={inputCls} value={form.autoApplyMode} onChange={(e) => setForm({ ...form, autoApplyMode: e.target.value as JobPreference['autoApplyMode'] })}>
                  <option value="off">关闭</option>
                  <option value="review">确认后打招呼</option>
                  <option value="auto">全自动（覆盖今日推荐）</option>
                </select>
              </Field>
            </div>
          )}

          <div className="flex gap-2 border-t border-gray-800/60 pt-3">
            <Button className="flex-1" disabled={saving} onClick={handleSave}>
              保存
            </Button>
            <Button variant="secondary" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { RefreshCw, Trash2, X } from 'lucide-react'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type Props = {
  open: boolean
  onClose: () => void
  onDone?: (res: Awaited<ReturnType<typeof api.triggerBossCrawl>>) => void
  onRunningChange?: (running: boolean) => void
  onPurged?: () => void
}

function linesToList(text: string) {
  return text
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ManualCrawlModal({ open, onClose, onDone, onRunningChange, onPurged }: Props) {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [purging, setPurging] = useState(false)
  const [positionsText, setPositionsText] = useState('Java 后端')
  const [citiesText, setCitiesText] = useState('北京')
  const [salaryMin, setSalaryMin] = useState<number | ''>(20)
  const [salaryMax, setSalaryMax] = useState<number | ''>(50)
  const [batchGreet, setBatchGreet] = useState(true)
  const [maxJobs, setMaxJobs] = useState(50)

  useEffect(() => {
    onRunningChange?.(running)
  }, [running, onRunningChange])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api
      .getJobPreferences()
      .then((res) => {
        const p = res.preference
        const positions = p.manualCrawlPositions?.length
          ? p.manualCrawlPositions
          : p.targetPositions
        const cities = p.manualCrawlCities?.length ? p.manualCrawlCities : p.targetCities
        setPositionsText(positions.join('\n'))
        setCitiesText(cities.join('\n'))
        setSalaryMin(p.manualCrawlSalaryMin ?? p.salaryMin ?? '')
        setSalaryMax(p.manualCrawlSalaryMax ?? p.salaryMax ?? '')
        setMaxJobs(p.maxJobsManualCrawl ?? 50)
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleCrawl = async () => {
    const positions = linesToList(positionsText)
    const cities = linesToList(citiesText)
    if (!positions.length || !cities.length) {
      alert('请填写岗位关键词和城市')
      return
    }
    setRunning(true)
    try {
      await api.updateJobPreferences({
        manualCrawlPositions: positions,
        manualCrawlCities: cities,
        manualCrawlSalaryMin: salaryMin === '' ? undefined : Number(salaryMin),
        manualCrawlSalaryMax: salaryMax === '' ? undefined : Number(salaryMax),
        maxJobsManualCrawl: maxJobs,
      })
      const res = await api.triggerBossCrawl({
        positions,
        cities,
        salaryMin: salaryMin === '' ? undefined : Number(salaryMin),
        salaryMax: salaryMax === '' ? undefined : Number(salaryMax),
        batchGreet,
      })
      onDone?.(res)
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : '抓取失败')
    } finally {
      setRunning(false)
    }
  }

  const handlePurgeDemo = async () => {
    if (!confirm('确定清除数据库中的历史无效岗位、招呼记录和对话？')) return
    setPurging(true)
    try {
      const res = await api.purgeDemoJobs()
      alert(res.message ?? `已清除 ${res.removed} 条`)
      onPurged?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '清除失败')
    } finally {
      setPurging(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="手动抓取 Boss">
      {loading ? (
        <p className="text-sm text-text-secondary">加载中…</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            手动抓取使用<strong className="text-text">独立条件</strong>，与「自动画像」分开。已登录 Boss
            时仅拉取真实岗位，无次数限制。
          </p>

          <Field label="岗位关键词（每行一个）">
            <textarea
              className="field-input min-h-[72px] w-full rounded-xl border border-border bg-page px-3 py-2 text-sm"
              value={positionsText}
              onChange={(e) => setPositionsText(e.target.value)}
            />
          </Field>

          <Field label="城市（每行一个）">
            <textarea
              className="field-input min-h-[56px] w-full rounded-xl border border-border bg-page px-3 py-2 text-sm"
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="薪资下限 K">
              <input
                type="number"
                className="field-input w-full rounded-xl border border-border bg-page px-3 py-2 text-sm"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </Field>
            <Field label="薪资上限 K">
              <input
                type="number"
                className="field-input w-full rounded-xl border border-border bg-page px-3 py-2 text-sm"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </Field>
            <Field label="本次最多抓取">
              <input
                type="number"
                min={5}
                max={300}
                className="field-input w-full rounded-xl border border-border bg-page px-3 py-2 text-sm"
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value) || 50)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={batchGreet}
              onChange={(e) => setBatchGreet(e.target.checked)}
              className="rounded border-border"
            />
            抓取完成后对今日推荐自动打招呼
          </label>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={running} onClick={handleCrawl}>
              <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
              {running ? '抓取中…' : '开始抓取'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <button
            type="button"
            disabled={purging}
            onClick={handlePurgeDemo}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700/60 px-2 py-1.5 text-[11px] text-text-secondary transition hover:border-gray-600 hover:text-text disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            {purging ? '清除中…' : '清除历史无效数据'}
          </button>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text">{label}</label>
      {children}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { AI_GENERATE_EXAMPLE } from './aiGenerateExample'

type Props = {
  open: boolean
  onClose: () => void
  onGenerate: (input: { targetJob: string; personalInfo: string }) => Promise<void>
  generating?: boolean
  initialTargetJob?: string
  initialPersonalInfo?: string
}

function ClearableField({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const shared =
    'w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#333] outline-none transition-colors placeholder:text-[#bfbfbf] focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/15'

  return (
    <div className="flex gap-4 sm:items-start">
      <label className="w-20 shrink-0 pt-2 text-right text-sm text-[#666] sm:w-24">{label}</label>
      <div className="relative min-w-0 flex-1">
        {multiline ? (
          <textarea
            className={`${shared} min-h-[120px] resize-y pr-8 leading-relaxed`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={5}
          />
        ) : (
          <input
            type="text"
            className={`${shared} pr-8`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        {value && (
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-0.5 text-[#bfbfbf] transition-colors hover:bg-[#f5f5f5] hover:text-[#999]"
            onClick={() => onChange('')}
            aria-label="清空"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function AiGenerateResumeModal({
  open,
  onClose,
  onGenerate,
  generating = false,
  initialTargetJob = '',
  initialPersonalInfo = '',
}: Props) {
  const [targetJob, setTargetJob] = useState(initialTargetJob)
  const [personalInfo, setPersonalInfo] = useState(initialPersonalInfo)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTargetJob(initialTargetJob)
      setPersonalInfo(initialPersonalInfo)
    }
  }, [open, initialTargetJob, initialPersonalInfo])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose, generating])

  if (!open) return null

  const canSubmit = targetJob.trim().length >= 2 && personalInfo.trim().length >= 10 && !generating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    await onGenerate({ targetJob: targetJob.trim(), personalInfo: personalInfo.trim() })
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current && !generating) onClose()
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-[0_6px_16px_rgba(0,0,0,0.12)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="ai-generate-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h2 id="ai-generate-title" className="text-base font-medium text-[#333]">
            AI 生成简历
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="rounded p-1 text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#666] disabled:opacity-40"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            <ClearableField
              label="目标职位"
              value={targetJob}
              onChange={setTargetJob}
              placeholder="如 Java 后端开发"
            />
            <ClearableField
              label="个人情况"
              value={personalInfo}
              onChange={setPersonalInfo}
              multiline
              placeholder="毕业院校、实习/工作经历、项目、技能、性格特点等…"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 min-w-[100px] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#1677ff] px-6 text-sm font-medium text-white transition-colors hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI 生成
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => {
                setTargetJob(AI_GENERATE_EXAMPLE.targetJob)
                setPersonalInfo(AI_GENERATE_EXAMPLE.personalInfo)
              }}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-[#d9d9d9] bg-white px-5 text-sm text-[#333] transition-colors hover:border-[#1677ff] hover:text-[#1677ff] disabled:opacity-50"
            >
              导入示例
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

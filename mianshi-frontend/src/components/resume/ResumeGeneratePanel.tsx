import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { AI_GENERATE_EXAMPLE } from './aiGenerateExample'
import { resumeUi } from './resumeLayout'
import { Button } from '../ui/Button'

type Props = {
  onGenerate: (input: { targetJob: string; personalInfo: string }) => Promise<void>
  generating: boolean
}

export function ResumeGeneratePanel({ onGenerate, generating }: Props) {
  const [targetJob, setTargetJob] = useState('')
  const [personalInfo, setPersonalInfo] = useState('')

  const canSubmit = targetJob.trim().length >= 2 && personalInfo.trim().length >= 10 && !generating

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    await onGenerate({ targetJob: targetJob.trim(), personalInfo: personalInfo.trim() })
  }

  return (
    <div className={resumeUi.sideNavSection}>
      <p className="mb-1 text-xs font-semibold text-text">AI 快速生成</p>
      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        填写目标职位与个人情况，一键生成结构化简历
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={resumeUi.label}>目标职位</label>
          <input
            className={resumeUi.input}
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            placeholder="如 Java 后端开发"
          />
        </div>
        <div>
          <label className={resumeUi.label}>个人情况</label>
          <textarea
            className={`${resumeUi.input} min-h-[96px] resize-y`}
            value={personalInfo}
            onChange={(e) => setPersonalInfo(e.target.value)}
            placeholder="毕业院校、实习经历、项目、技能…"
            rows={4}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI 生成
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={generating}
            onClick={() => {
              setTargetJob(AI_GENERATE_EXAMPLE.targetJob)
              setPersonalInfo(AI_GENERATE_EXAMPLE.personalInfo)
            }}
          >
            导入示例
          </Button>
        </div>
      </form>
    </div>
  )
}

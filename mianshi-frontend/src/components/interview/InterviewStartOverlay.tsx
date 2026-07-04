import { useEffect, useRef, useState } from 'react'
import { Mic, Sparkles, Target } from 'lucide-react'
import {
  playCountdownTick,
  playPreviewPulse,
  unlockInterviewAudio,
} from '../../lib/interviewSounds'

const MODE_LABELS: Record<string, string> = {
  quick: '5 分钟快问快答',
  standard: '15 分钟技术面',
  deep: '30 分钟综合面',
}

type Props = {
  position: string
  experience: string
  mode: string
  onComplete: () => void
}

type Phase = 'preview' | 'countdown' | 'go'

export function InterviewStartOverlay({ position, experience, mode, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('preview')
  const [count, setCount] = useState(3)
  const previewSoundPlayed = useRef(false)

  useEffect(() => {
    unlockInterviewAudio()
  }, [])

  useEffect(() => {
    if (phase === 'preview' && !previewSoundPlayed.current) {
      previewSoundPlayed.current = true
      playPreviewPulse()
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      playCountdownTick(count)
    }
    if (phase === 'go') {
      playCountdownTick(0)
    }
  }, [phase, count])

  useEffect(() => {
    if (phase === 'preview') {
      const t = window.setTimeout(() => setPhase('countdown'), 1800)
      return () => window.clearTimeout(t)
    }
    if (phase === 'countdown') {
      if (count <= 0) {
        setPhase('go')
        return
      }
      const t = window.setTimeout(() => setCount((c) => c - 1), 900)
      return () => window.clearTimeout(t)
    }
    if (phase === 'go') {
      const t = window.setTimeout(() => onComplete(), 600)
      return () => window.clearTimeout(t)
    }
  }, [phase, count, onComplete])

  const modeLabel = MODE_LABELS[mode] ?? '模拟面试'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-page/95 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#7c5cff]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-md px-6 text-center animate-fade-in">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          沉浸式模拟面试
        </div>

        {phase === 'preview' && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-2xl font-bold text-text">{position}</h2>
            <p className="text-sm text-text-secondary">{modeLabel}</p>
            <div className="mx-auto flex max-w-xs flex-col gap-2 rounded-xl border border-border/80 bg-elevated/60 px-4 py-3 text-left text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span>经验：{experience}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span>请确认麦克风可用，倒计时结束后面试官将开口提问</span>
              </div>
            </div>
            <p className="text-xs text-muted animate-pulse">正在准备面试环境…</p>
          </div>
        )}

        {phase === 'countdown' && count > 0 && (
          <div key={count} className="animate-scale-in">
            <p className="mb-4 text-sm font-medium text-brand">面试即将开始</p>
            <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping" />
              <span className="absolute inset-3 rounded-full border border-brand/20" />
              <span className="text-7xl font-bold tabular-nums text-brand">{count}</span>
            </div>
          </div>
        )}

        {phase === 'go' && (
          <div className="animate-scale-in">
            <p className="text-3xl font-bold text-brand">开始！</p>
            <p className="mt-3 text-sm text-text-secondary">面试官正在进入…</p>
          </div>
        )}
      </div>
    </div>
  )
}

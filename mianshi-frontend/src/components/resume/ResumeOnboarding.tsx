import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'

const STORAGE_KEY = 'mianshi_resume_onboarding_v1'

type Step = {
  target: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    target: '[data-onboard="mine-header"]',
    title: '管理多份简历',
    body: '在这里查看、新建、复制和删除简历，云端自动保存。',
  },
  {
    target: '[data-onboard="create-cards"]',
    title: '快速开始',
    body: '可用 AI 快速生成，或导入已有 PDF/Word 进行智能识别与优化。',
  },
  {
    target: '[data-onboard="module-nav"]',
    title: '模块导航',
    body: '顶部可在「我的简历 / 快速生成 / 导入优化 / 排版编辑」之间切换。',
  },
]

type Props = {
  /** 仅在指定页面展示对应步骤 */
  variant: 'mine' | 'edit'
}

export function ResumeOnboarding({ variant }: Props) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
      setVisible(true)
    } catch {
      /* ignore */
    }
  }, [])

  const activeStep = variant === 'mine' ? STEPS[step] : STEPS[2]

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  useEffect(() => {
    if (!visible) return
    const el = document.querySelector(activeStep.target)
    if (!el) {
      if (variant === 'mine' && step < STEPS.length - 1) {
        setStep((s) => s + 1)
      } else {
        finish()
      }
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setRect(el.getBoundingClientRect())
    const onResize = () => setRect(el.getBoundingClientRect())
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [visible, step, variant, activeStep.target])

  const next = () => {
    if (variant === 'mine' && step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    finish()
  }

  if (!visible || !rect) return null

  const isLast = variant === 'edit' || step >= STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50" onClick={finish} aria-hidden />
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-brand ring-offset-2 ring-offset-transparent"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      <div
        className="absolute z-10 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-border/80 bg-panel p-4 shadow-xl"
        style={{
          top: Math.min(rect.bottom + 12, window.innerHeight - 180),
          left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-brand">
              新手引导 {variant === 'mine' ? `${step + 1}/${STEPS.length}` : '3/3'}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-text">{activeStep.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{activeStep.body}</p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-1 text-muted hover:bg-elevated/60 hover:text-text"
            onClick={finish}
            aria-label="关闭引导"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={finish}>
            跳过
          </Button>
          <Button size="sm" onClick={next}>
            {isLast ? '知道了' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  )
}

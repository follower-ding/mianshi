import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/Button'
import {
  resetSpacingSettings,
  SPACING_SLIDERS,
  type ResumePreviewSettings,
} from './resumePreviewSettings'

const POPOVER_WIDTH = 280
const STUDIO_BTN = '!h-8'

type Props = {
  settings: ResumePreviewSettings
  onChange: (patch: Partial<ResumePreviewSettings>) => void
  onReset: () => void
}

export function SpacingConfigPopover({ settings, onChange, onReset }: Props) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-xl animate-scale-in">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <SlidersHorizontal className="h-4 w-4 text-brand" />
          间距配置
        </span>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-brand"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" /> 重置
        </button>
      </div>
      <div className="space-y-3.5">
        {SPACING_SLIDERS.map(({ key, label, min, max, step }) => (
          <label key={key} className="block">
            <div className="mb-1 flex justify-between text-xs text-text-secondary">
              <span>{label}</span>
              <span className="font-medium tabular-nums text-text">{settings[key]}px</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              className="h-1.5 w-full cursor-pointer accent-brand"
              onChange={(e) => {
                const v = Number(e.target.value)
                onChange({
                  [key]: v,
                  ...(key.startsWith('pageMargin') ? { pageMargin: v } : {}),
                })
              }}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

export function SpacingConfigButton({
  open,
  onToggle,
  settings,
  onChange,
}: {
  open: boolean
  onToggle: () => void
  settings: ResumePreviewSettings
  onChange: (patch: Partial<ResumePreviewSettings>) => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    let left = rect.right - POPOVER_WIDTH
    const top = rect.bottom + 4
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      onToggle()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, onToggle])

  return (
    <div ref={anchorRef} className="relative">
      <Button variant="secondary" size="sm" className={STUDIO_BTN} onClick={onToggle}>
        <SlidersHorizontal className="h-3.5 w-3.5" /> 间距配置
      </Button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[250]"
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          >
            <SpacingConfigPopover
              settings={settings}
              onChange={onChange}
              onReset={() => onChange(resetSpacingSettings(settings))}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}

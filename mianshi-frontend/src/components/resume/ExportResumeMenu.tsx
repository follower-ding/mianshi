import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, FileImage, FileText, Loader2, Server } from 'lucide-react'
import type { ExportFormat } from './resumeExport'
import { exportResume, exportResumeServerPdf } from './resumeExport'
import { RESUME_PREVIEW_ID } from './resumeSections'
import { api } from '../../api/client'
import { Button } from '../ui/Button'

type Props = {
  filenameBase: string
  resumeId?: string | null
  disabled?: boolean
  onBeforeExport?: () => Promise<void>
  onError?: (message: string) => void
}

const OPTIONS: {
  format: ExportFormat | 'server-pdf'
  label: string
  icon: typeof FileText
  hint: string
}[] = [
  { format: 'pdf', label: 'PDF / 打印', icon: FileText, hint: '浏览器另存为 PDF' },
  { format: 'server-pdf', label: '服务端 PDF', icon: Server, hint: 'Playwright 高清导出' },
  { format: 'jpg', label: 'JPG 图片', icon: FileImage, hint: '高清 JPEG' },
  { format: 'png', label: 'PNG 图片', icon: FileImage, hint: '透明背景友好' },
]

const MENU_WIDTH = 220

export function ExportResumeMenu({ filenameBase, resumeId, disabled, onBeforeExport, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    let left = rect.right - MENU_WIDTH
    const top = rect.bottom + 6
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const run = async (format: ExportFormat | 'server-pdf') => {
    setExporting(true)
    setOpen(false)
    try {
      await onBeforeExport?.()
      if (format === 'server-pdf') {
        if (!resumeId) throw new Error('请先保存简历后再使用服务端 PDF')
        await exportResumeServerPdf(resumeId, RESUME_PREVIEW_ID, filenameBase)
        void api.trackResumeExport('server-pdf')
      } else {
        await exportResume(format, filenameBase)
        void api.trackResumeExport(format)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败'
      onError?.(msg)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div ref={anchorRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || exporting}
        onClick={() => setOpen((v) => !v)}
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        导出
        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] overflow-hidden rounded-xl border border-border/80 bg-panel py-1 shadow-xl animate-scale-in"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          >
            {OPTIONS.map(({ format, label, icon: Icon, hint }) => (
              <button
                key={format}
                type="button"
                className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-elevated/60"
                onClick={() => run(format)}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm text-text">{label}</span>
                  <span className="block text-[11px] text-muted">{hint}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

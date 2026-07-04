import { ChevronDown, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { UserResume } from '../../api/client'

type Props = {
  resumes: UserResume[]
  activeId: string | null
  onSwitch: (id: string) => void
}

export function ResumeSwitcher({ resumes, activeId, onSwitch }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = resumes.find((r) => r.id === activeId)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (resumes.length <= 1) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-elevated/50 px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-brand/30 hover:text-text"
        onClick={() => setOpen((v) => !v)}
      >
        <FileText className="h-3.5 w-3.5 text-brand" />
        <span className="max-w-[120px] truncate">{active?.title ?? '选择简历'}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-border/80 bg-panel py-1 shadow-xl">
          {resumes.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-elevated/60 ${
                r.id === activeId ? 'bg-brand/10 text-brand' : 'text-text'
              }`}
              onClick={() => {
                onSwitch(r.id)
                setOpen(false)
              }}
            >
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

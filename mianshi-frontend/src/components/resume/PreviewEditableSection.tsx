import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, EyeOff, Pencil } from 'lucide-react'
import type { ResumeSectionKey } from './resumeSections'

type Props = {
  sectionKey: ResumeSectionKey
  active?: boolean
  editable?: boolean
  onClick?: (key: ResumeSectionKey) => void
  onEdit?: (key: ResumeSectionKey) => void
  onMoveUp?: (key: ResumeSectionKey) => void
  onMoveDown?: (key: ResumeSectionKey) => void
  onHide?: (key: ResumeSectionKey) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  children: ReactNode
  className?: string
}

/** 预览区模块 — 悬停浮动工具条（编辑/上移/下移/隐藏） */
export function PreviewEditableSection({
  sectionKey,
  active,
  editable,
  onClick,
  onEdit,
  onMoveUp,
  onMoveDown,
  onHide,
  canMoveUp,
  canMoveDown,
  children,
  className = '',
}: Props) {
  if (!editable) {
    return <section className={className}>{children}</section>
  }

  const btn =
    'flex h-7 w-7 cursor-pointer items-center justify-center text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <section
      className={`group relative rounded-lg transition-all duration-150 ${className} ${
        active
          ? 'bg-brand/8 ring-2 ring-brand/50'
          : 'hover:bg-brand/5 hover:ring-2 hover:ring-brand/25'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => onClick?.(sectionKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.(sectionKey)
          }
        }}
      >
        {children}
      </div>

      <div className="absolute right-2 top-2 z-20 flex opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex overflow-hidden rounded-md bg-brand shadow-md">
          <button
            type="button"
            className={btn}
            title="编辑"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(sectionKey)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            disabled={!canMoveUp}
            title="上移"
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp?.(sectionKey)
            }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            disabled={!canMoveDown}
            title="下移"
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown?.(sectionKey)
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {onHide && sectionKey !== 'basic' && (
            <button
              type="button"
              className={btn}
              title="隐藏模块"
              onClick={(e) => {
                e.stopPropagation()
                onHide(sectionKey)
              }}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

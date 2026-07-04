import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Clock, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { ResumeContent, ResumeLayoutConfig } from '../../api/client'
import type { ResumeTemplateId } from '../../lib/data'
import { RESUME_TEMPLATES } from '../../lib/data'
import { ProMinimalPreview } from './ProMinimalPreview'
import { normalizeSectionOrder, normalizeSectionVisibility } from './resumeSections'
import { layoutFromConfig } from './resumeLayoutConfig'
import { resumeCardUi, resumeCompletionBadge } from './resumeLayout'
import { ResumeCardPreviewFrame } from './ResumeCardPreviewFrame'
import { useConfirm } from '../../contexts/ConfirmContext'
import { Button } from '../ui/Button'

type Props = {
  resumeId: string
  title: string
  content: ResumeContent
  templateId: ResumeTemplateId
  layoutConfig?: ResumeLayoutConfig
  updatedAt?: string
  tags: string[]
  onRename?: (id: string, title: string) => Promise<boolean>
  onDuplicate?: (id: string) => Promise<void | unknown>
  onDelete?: (id: string) => Promise<boolean>
}

function formatTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function templateLabel(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((t) => t.id === id)?.name.replace('简历模板', '') ?? '默认模板'
}

export function SavedResumeCard({
  resumeId,
  title,
  content,
  templateId,
  layoutConfig,
  updatedAt,
  tags,
  onRename,
  onDuplicate,
  onDelete,
}: Props) {
  const { confirm } = useConfirm()
  const completionLabel = resumeCompletionBadge(content)
  const layout = layoutFromConfig(layoutConfig)
  const visibility = normalizeSectionVisibility(layout.sectionVisibility)
  const sectionOrder = normalizeSectionOrder(layout.sectionOrder).filter((k) => visibility[k])
  const accent = layout.previewSettings.accentColor
  const editTo = `/resume/edit?id=${resumeId}`
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)
  const [acting, setActing] = useState(false)

  const commitRename = async () => {
    setEditingTitle(false)
    const t = titleDraft.trim()
    if (!t || t === title || !onRename) return
    setActing(true)
    await onRename(resumeId, t)
    setActing(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (
      !(await confirm({
        title: '删除简历',
        message: `确定删除「${title}」？此操作不可恢复。`,
        confirmLabel: '删除',
        variant: 'danger',
      }))
    )
      return
    setActing(true)
    await onDelete(resumeId)
    setActing(false)
    setMenuOpen(false)
  }

  const handleDuplicate = async () => {
    if (!onDuplicate) return
    setActing(true)
    await onDuplicate(resumeId)
    setActing(false)
    setMenuOpen(false)
  }

  return (
    <article className={`group ${resumeCardUi.root}`}>
      <div className={resumeCardUi.preview}>
        <ResumeCardPreviewFrame accent={accent} className="absolute inset-0">
          <ProMinimalPreview content={content} templateId={templateId} sectionOrder={sectionOrder} />
        </ResumeCardPreviewFrame>
        <span className="absolute left-2 top-2 z-20 rounded-md border border-brand/30 bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand backdrop-blur-sm">
          已保存
        </span>
        {(onRename || onDuplicate || onDelete) && (
          <div className="absolute right-2 top-2 z-30">
            <Button
              variant="ghost"
              size="sm"
              className="!h-7 !w-7 !p-0 bg-panel/80 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              disabled={acting}
              data-testid="resume-card-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-40 mt-1 min-w-[140px] rounded-xl border border-border/80 bg-panel py-1 shadow-xl"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {onRename && (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-text hover:bg-elevated/60"
                    onClick={() => {
                      setMenuOpen(false)
                      setEditingTitle(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> 重命名
                  </button>
                )}
                {onDuplicate && (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-text hover:bg-elevated/60"
                    onClick={handleDuplicate}
                  >
                    <Copy className="h-3.5 w-3.5" /> 复制副本
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-page/75 opacity-0 backdrop-blur-[3px] transition-opacity duration-200 group-hover:opacity-100 max-lg:opacity-0">
          <Link to={editTo} className="inline-flex cursor-pointer flex-col items-center gap-1 text-sm font-medium text-white">
            <Eye className="h-5 w-5" strokeWidth={1.75} />
            点击预览
          </Link>
          <Link
            to={editTo}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-[#7c5cff] px-5 py-2 text-sm font-medium text-bg-page shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Pencil className="h-3.5 w-3.5" />
            继续编辑
          </Link>
        </div>
        <Link
          to={editTo}
          className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center bg-gradient-to-t from-bg-page/90 via-bg-page/50 to-transparent py-3 opacity-100 transition-opacity lg:hidden lg:opacity-0 lg:group-hover:opacity-100"
          aria-label="继续编辑简历"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-[#7c5cff] px-4 py-1.5 text-xs font-medium text-bg-page shadow-md">
            <Pencil className="h-3.5 w-3.5" />
            继续编辑
          </span>
        </Link>
      </div>
      <div className={resumeCardUi.footer}>
        {editingTitle ? (
          <input
            className="w-full rounded-md border border-border bg-elevated px-2 py-1 text-sm text-text outline-none focus:border-brand/50"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
        ) : (
          <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
        )}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3 shrink-0" />
          最近保存 {formatTime(updatedAt)}
        </p>
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand" title={completionLabel}>
            {completionLabel}
          </span>
          <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-medium text-brand">
            {templateLabel(templateId)}
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border/60 bg-elevated/60 px-1.5 py-0.5 text-[10px] text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

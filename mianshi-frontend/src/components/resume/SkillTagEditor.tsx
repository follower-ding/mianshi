import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { GripVertical, Plus, X, ChevronUp, ChevronDown, ClipboardPaste } from 'lucide-react'
import { reorderList } from './resumeSortable'
import { resumeUi } from './resumeLayout'

type Props = {
  skills: string[]
  onChange: (skills: string[]) => void
}

function newKey() {
  return crypto.randomUUID()
}

function syncKeys(prev: string[], len: number): string[] {
  if (prev.length === len) return prev
  if (prev.length < len) return [...prev, ...Array.from({ length: len - prev.length }, newKey)]
  return prev.slice(0, len)
}

function splitSkills(raw: string): string[] {
  return raw
    .split(/[,，、\n;；|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function SkillTagEditor({ skills, onChange }: Props) {
  const [keys, setKeys] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => setKeys((k) => syncKeys(k, skills.length)), [skills.length])

  const finishDrag = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return
      onChange(reorderList(skills, from, to))
      setKeys((k) => reorderList(k, from, to))
    },
    [skills, onChange],
  )

  const addSkill = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || skills.includes(trimmed)) return false
    onChange([...skills, trimmed])
    setKeys((k) => [...k, newKey()])
    return true
  }

  const removeAt = (index: number) => {
    onChange(skills.filter((_, i) => i !== index))
    setKeys((k) => k.filter((_, i) => i !== index))
  }

  const handleAddDraft = () => {
    if (addSkill(draft)) setDraft('')
  }

  const handleDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddDraft()
    }
  }

  const handleBulkApply = () => {
    const incoming = splitSkills(bulkText)
    if (incoming.length === 0) return
    const merged = [...skills]
    const newKeys: string[] = []
    for (const s of incoming) {
      if (!merged.includes(s)) {
        merged.push(s)
        newKeys.push(newKey())
      }
    }
    if (newKeys.length > 0) {
      onChange(merged)
      setKeys((k) => [...k, ...newKeys])
    }
    setBulkText('')
    setBulkOpen(false)
  }

  return (
    <div className="space-y-4">
      {skills.length > 0 ? (
        <>
          <p className="text-[11px] text-muted">拖拽标签调整顺序，预览区按此顺序展示</p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="技能标签列表">
            {skills.map((skill, index) => {
              const isDragging = dragIndex === index
              const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
              return (
                <div
                  key={keys[index] ?? `${skill}-${index}`}
                  role="listitem"
                  className={`inline-flex max-w-full items-center gap-0.5 rounded-full border bg-brand/5 pl-1 pr-1.5 py-1 text-sm transition-all duration-200 ${
                    isDragging ? 'scale-95 opacity-50' : ''
                  } ${
                    isOver
                      ? 'border-brand/60 ring-2 ring-brand/30'
                      : 'border-brand/25 hover:border-brand/45'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setOverIndex(index)
                  }}
                  onDragLeave={() => {
                    if (overIndex === index) setOverIndex(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
                    if (!Number.isNaN(from)) reorder(from, index)
                    finishDrag()
                  }}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(index))
                    }}
                    onDragEnd={finishDrag}
                    className="cursor-grab touch-none rounded-full p-1 text-muted transition-colors hover:bg-bg-subtle hover:text-text active:cursor-grabbing"
                    aria-label={`拖拽 ${skill}`}
                  >
                    <GripVertical className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                  <span className="max-w-[140px] truncate px-1 font-medium text-text" title={skill}>
                    {skill}
                  </span>
                  <span className="flex items-center border-l border-border/50 pl-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => reorder(index, index - 1)}
                      className="rounded-full p-0.5 text-muted hover:text-text disabled:opacity-25"
                      aria-label="左移"
                    >
                      <ChevronUp className="h-3 w-3 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={index === skills.length - 1}
                      onClick={() => reorder(index, index + 1)}
                      className="rounded-full p-0.5 text-muted hover:text-text disabled:opacity-25"
                      aria-label="右移"
                    >
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="rounded-full p-0.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      aria-label={`删除 ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border/70 bg-elevated/30 px-4 py-6 text-center text-sm text-muted">
          暂无技能标签，在下方添加或批量粘贴
        </p>
      )}

      <div className="flex gap-2">
        <input
          className={`${resumeUi.input} flex-1`}
          placeholder="输入技能，如 Java、Spring Boot…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleDraftKeyDown}
        />
        <button
          type="button"
          onClick={handleAddDraft}
          disabled={!draft.trim()}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          添加
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setBulkOpen((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-brand"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          {bulkOpen ? '收起批量粘贴' : '批量粘贴多个技能'}
        </button>
        {bulkOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              className={`${resumeUi.input} min-h-[72px] resize-y text-sm`}
              placeholder="Java, Spring Boot, MySQL&#10;或每行一个技能"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={!bulkText.trim()}
              className="cursor-pointer rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand/30 hover:text-brand disabled:opacity-40"
            >
              合并到标签列表
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

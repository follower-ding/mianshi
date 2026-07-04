import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  Bold,
  Code,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
} from 'lucide-react'
import { api } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { MarkdownContent } from './MarkdownContent'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  error?: boolean
  hint?: ReactNode
  footer?: ReactNode
  /** Enable admin image upload button */
  enableImageUpload?: boolean
  className?: string
}

type Tab = 'edit' | 'preview'

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder?: string,
) {
  const { selectionStart, selectionEnd, value } = textarea
  const selected = value.slice(selectionStart, selectionEnd)
  const insert = selected || placeholder || ''
  const next = value.slice(0, selectionStart) + before + insert + after + value.slice(selectionEnd)
  const cursorStart = selectionStart + before.length
  const cursorEnd = cursorStart + insert.length
  return { next, cursorStart, cursorEnd }
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string) {
  const { selectionStart, selectionEnd, value } = textarea
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const lineEnd = value.indexOf('\n', selectionEnd)
  const end = lineEnd === -1 ? value.length : lineEnd
  const block = value.slice(lineStart, end)
  const prefixed = block
    .split('\n')
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join('\n')
  const next = value.slice(0, lineStart) + prefixed + value.slice(end)
  return { next, cursorStart: lineStart, cursorEnd: lineStart + prefixed.length }
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 220,
  error,
  hint,
  footer,
  enableImageUpload = false,
  className = '',
}: Props) {
  const [tab, setTab] = useState<Tab>('edit')
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const apply = useCallback(
    (next: string, cursorStart?: number, cursorEnd?: number) => {
      onChange(next)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        if (cursorStart !== undefined && cursorEnd !== undefined) {
          el.setSelectionRange(cursorStart, cursorEnd)
        }
      })
    },
    [onChange],
  )

  const runWrap = (before: string, after: string, ph?: string) => {
    const el = textareaRef.current
    if (!el) return
    const { next, cursorStart, cursorEnd } = wrapSelection(el, before, after, ph)
    apply(next, cursorStart, cursorEnd)
  }

  const runPrefix = (prefix: string) => {
    const el = textareaRef.current
    if (!el) return
    const { next, cursorStart, cursorEnd } = prefixLines(el, prefix)
    apply(next, cursorStart, cursorEnd)
  }

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current
    if (!el) {
      onChange(value + snippet)
      return
    }
    const { selectionStart, selectionEnd } = el
    const next = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd)
    const pos = selectionStart + snippet.length
    apply(next, pos, pos)
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await api.uploadQuestionImage(file)
      const alt = file.name.replace(/\.[^.]+$/, '') || '配图'
      const snippet = `\n\n![${alt}](${url})\n\n`
      insertAtCursor(snippet)
      setTab('preview')
      showToast('图片已插入', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '图片上传失败', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertImageByUrl = () => {
    const url = window.prompt('粘贴图片 URL（支持 https 或本地上传地址）')
    if (!url?.trim()) return
    const alt = window.prompt('图片描述（可选，会显示在图片下方）') ?? '配图'
    insertAtCursor(`\n\n![${alt}](${url.trim()})\n\n`)
  }

  const tools = [
    { icon: Bold, label: '粗体', action: () => runWrap('**', '**', '粗体') },
    { icon: Italic, label: '斜体', action: () => runWrap('*', '*', '斜体') },
    { icon: Heading2, label: '小标题', action: () => runPrefix('## ') },
    { icon: List, label: '无序列表', action: () => runPrefix('- ') },
    { icon: ListOrdered, label: '有序列表', action: () => runPrefix('1. ') },
    { icon: Code, label: '代码块', action: () => runWrap('```\n', '\n```', 'code') },
    { icon: Link2, label: '链接', action: () => runWrap('[', '](https://)', '文字') },
  ] as const

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-admin-surface ${
        error ? 'border-red-400 ring-1 ring-red-200' : 'border-admin-border'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/70 bg-admin-surface-alt/80 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {tools.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              title={label}
              onClick={action}
              className="rounded-md p-1.5 text-admin-muted transition hover:bg-admin-surface hover:text-admin-text"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          {enableImageUpload && (
            <>
              <button
                type="button"
                title="上传图片"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md p-1.5 text-admin-muted transition hover:bg-admin-surface hover:text-admin-text disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                title="插入图片链接"
                onClick={insertImageByUrl}
                className="rounded-md px-1.5 py-1 text-[11px] text-admin-muted transition hover:bg-admin-surface hover:text-admin-text"
              >
                URL
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImageUpload(file)
                }}
              />
            </>
          )}
        </div>
        <div className="flex rounded-lg border border-admin-border/80 bg-admin-surface p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
              tab === 'edit'
                ? 'bg-admin-brand-light text-admin-brand'
                : 'text-admin-muted hover:text-admin-text'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
              tab === 'preview'
                ? 'bg-admin-brand-light text-admin-brand'
                : 'text-admin-muted hover:text-admin-text'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            预览
          </button>
        </div>
      </div>

      {hint && (
        <p className="border-b border-admin-border/50 px-3 py-2 text-[11px] leading-relaxed text-admin-muted">
          {hint}
        </p>
      )}

      {tab === 'edit' ? (
        <textarea
          ref={textareaRef}
          className="block min-h-0 flex-1 w-full resize-none border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-admin-text outline-none placeholder:text-admin-muted"
          style={{ minHeight: minHeight > 0 ? minHeight : undefined }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 admin-md-preview"
          style={{ minHeight: minHeight > 0 ? minHeight : undefined }}
        >
          {value.trim() ? (
            <MarkdownContent source={value} headingIdPrefix="preview" />
          ) : (
            <p className="text-sm text-admin-muted">暂无内容，切换「编辑」开始撰写 Markdown 答案</p>
          )}
        </div>
      )}

      {footer && <div className="border-t border-admin-border/50 px-3 py-1">{footer}</div>}
    </div>
  )
}

import { useCallback, useEffect, useRef } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { resumeUi } from './resumeLayout'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
}

export function ResumeRichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const composing = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || composing.current) return
    if (el.innerHTML !== value) el.innerHTML = value || ''
  }, [value])

  const emit = useCallback(() => {
    const html = ref.current?.innerHTML ?? ''
    onChange(html === '<br>' ? '' : html)
  }, [onChange])

  const toolBtn =
    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-text'

  return (
    <div className={`overflow-hidden rounded-xl border border-border/60 bg-panel ${className}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-elevated/40 px-2 py-1.5">
        <button type="button" className={toolBtn} title="加粗" onMouseDown={(e) => { e.preventDefault(); exec('bold') }}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolBtn} title="斜体" onMouseDown={(e) => { e.preventDefault(); exec('italic') }}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border/60" />
        <button
          type="button"
          className={toolBtn}
          title="无序列表"
          onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={toolBtn}
          title="有序列表"
          onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`${resumeUi.input} !min-h-0 !border-0 !bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)] [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc`}
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={() => { if (!composing.current) emit() }}
        onBlur={emit}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false; emit() }}
      />
    </div>
  )
}

export function richTextToPlain(html: string): string {
  if (!html) return ''
  if (!html.includes('<')) return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? div.innerText ?? ''
}

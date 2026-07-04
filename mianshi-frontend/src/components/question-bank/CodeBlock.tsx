import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type Props = {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'text' }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-bg-subtle px-4 py-2">
        <span className="text-xs text-muted">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-brand"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-7 whitespace-pre-wrap text-text-secondary">
        {code}
      </pre>
    </div>
  )
}

/** 从参考答案中提取可能的代码块（简单启发式） */
export function extractCodeFromAnswer(text: string): { prose: string; code: string | null } {
  const fence = text.match(/```[\w]*\n?([\s\S]*?)```/)
  if (fence) {
    const code = fence[1].trim()
    const prose = text.replace(/```[\w]*\n?[\s\S]*?```/, '').trim()
    return { prose, code }
  }
  if (/public\s+(class|interface)|class\s+\w+|void\s+\w+\(/.test(text) && text.split('\n').length >= 3) {
    return { prose: '', code: text }
  }
  return { prose: text, code: null }
}

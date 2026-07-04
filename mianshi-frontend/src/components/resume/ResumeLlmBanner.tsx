import { useEffect, useState } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../../api/client'

type ApiInfo = {
  llm?: { configured?: boolean; model?: string }
  resumeAi?: { demoMode?: boolean }
  llmProbe?: { configured?: boolean; reachable?: boolean | null; latencyMs?: number }
}

/** 简历 AI 能力状态 — 演示模式时提示配置 LLM */
export function ResumeLlmBanner() {
  const [info, setInfo] = useState<ApiInfo | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/info?probe=1`)
      .then((r) => r.json())
      .then((d: ApiInfo) => setInfo(d))
      .catch(() => setInfo(null))
  }, [])

  if (!info) return null

  const configured = info.llm?.configured ?? false
  const reachable = info.llmProbe?.reachable
  const demo = info.resumeAi?.demoMode ?? !configured

  if (configured && reachable === true) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-brand">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        已连接大模型（{info.llm?.model ?? 'LLM'}
        {info.llmProbe?.latencyMs ? ` · ${info.llmProbe.latencyMs}ms` : ''}
        ），生成与优化将针对您填写的目标岗位定制
      </p>
    )
  }

  if (configured && reachable === false) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2 text-xs leading-relaxed text-red-100/90">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
        <span>
          大模型<strong className="font-medium">已配置但当前不可达</strong>（密钥无效、额度或网络问题），将使用规则模板。
          请检查 <code className="rounded bg-black/20 px-1">mianshi-api/.env</code> 并重启 API。
        </span>
      </p>
    )
  }

  if (!demo) return null

  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>
        当前为<strong className="font-medium">演示模式</strong>（未配置 LLM 密钥），结果为规则模板而非大模型定制。
        请在 <code className="rounded bg-black/20 px-1">mianshi-api/.env</code> 配置{' '}
        <code className="rounded bg-black/20 px-1">LLM_API_KEY</code> 后重启 API。
        {' '}
        <Link to="/resume/help#demo" className="font-medium text-amber-300 underline underline-offset-2">
          了解演示模式
        </Link>
      </span>
    </p>
  )
}

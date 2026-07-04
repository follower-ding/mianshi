import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react'
import { api, type AgentActionLog } from '../../api/client'

const ICON: Record<string, typeof Send> = {
  auto_apply: Send,
  ai_reply: Bot,
  hr_reply: MessageSquare,
  crawl_done: CheckCircle2,
  crawl_start: RefreshCw,
  apply_failed: AlertTriangle,
  interview_detected: CheckCircle2,
  match_found: CheckCircle2,
}

type Props = {
  refreshKey?: number
  maxItems?: number
  mode?: 'compact' | 'indicator' | 'mini'
}

export function AgentLogStream({ refreshKey = 0, maxItems = 8, mode = 'compact' }: Props) {
  const [logs, setLogs] = useState<AgentActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getAgentLogs(maxItems)
      .then((res) => {
        if (!cancelled) setLogs(res.items)
      })
      .catch(() => {
        if (!cancelled) setLogs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, maxItems])

  if (loading && logs.length === 0) {
    if (mode === 'indicator') {
      return (
        <span className="flex items-center gap-2 text-xs text-muted">
          <RefreshCw className="h-3 w-3 animate-spin text-cyan-400/70" />
          小助手初始化中…
        </span>
      )
    }
    if (mode === 'mini') {
      return <p className="text-[10px] text-muted">加载中…</p>
    }
    return (
      <div className="flex h-8 items-center gap-2 rounded-md border border-gray-800/60 bg-[#0d1117]/60 px-3">
        <RefreshCw className="h-3 w-3 animate-spin text-cyan-400/70" />
        <span className="text-xs text-muted">加载 Agent 日志…</span>
      </div>
    )
  }

  const latest = logs[0]

  if (mode === 'indicator') {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
        <Zap className="h-3 w-3 shrink-0 text-cyan-400" />
        <span className="shrink-0 text-xs text-cyan-400/90">后台小助手正在运行</span>
        {latest && (
          <span className="truncate text-xs text-muted">
            · {latest.title}
            {latest.body ? ` — ${latest.body}` : ''}
          </span>
        )}
      </div>
    )
  }

  if (mode === 'mini') {
    if (logs.length === 0) {
      return <p className="text-[10px] leading-relaxed text-muted">暂无动态</p>
    }
    return (
      <div className="space-y-1.5 overflow-y-auto">
        {logs.slice(0, 2).map((log) => (
          <p key={log.id} className="line-clamp-2 text-[10px] leading-relaxed text-text-secondary">
            <span className="text-cyan-400/80">{formatTime(log.createdAt)}</span>{' '}
            {log.title}
          </p>
        ))}
      </div>
    )
  }

  if (logs.length === 0) return null

  const LatestIcon = ICON[latest.actionType] ?? Bot

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="group flex h-8 w-full items-center gap-2 rounded-md border border-gray-800/60 bg-[#0d1117]/80 px-3 text-left transition-all duration-200 hover:border-cyan-500/25 hover:bg-[#0d1117]"
        aria-expanded={expanded}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500/10">
          <LatestIcon className="h-3 w-3 text-cyan-400" />
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
          Agent
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
          <span className="font-medium text-text">{latest.title}</span>
          {latest.body && <span className="text-muted"> · {latest.body}</span>}
        </span>
        <time className="hidden shrink-0 text-[10px] tabular-nums text-muted sm:inline">
          {formatTime(latest.createdAt)}
        </time>
        {logs.length > 1 && (
          <span className="shrink-0 rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
            {logs.length}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-hover:text-cyan-400/70 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-md border border-gray-800/60 bg-[#161b22] py-1 shadow-xl shadow-black/50 backdrop-blur-sm">
          {logs.map((log, index) => {
            const Icon = ICON[log.actionType] ?? Bot
            return (
              <div
                key={log.id}
                className={`flex gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-cyan-950/20 ${
                  index === 0 ? 'bg-cyan-950/10' : ''
                }`}
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{log.title}</p>
                  {log.body && (
                    <p className="mt-0.5 line-clamp-2 text-text-secondary">{log.body}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 60_000) return '刚刚'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} 分钟前`
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

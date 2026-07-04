import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Send, Sparkles, ArrowLeft, Bot } from 'lucide-react'
import { api, type BossChatItem, type BossChatMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading } from '../components/ui/Loading'

export function BossMessagesPage() {
  const { user } = useAuth()
  const [chats, setChats] = useState<BossChatItem[]>([])
  const [selected, setSelected] = useState<BossChatItem | null>(null)
  const [messages, setMessages] = useState<BossChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [aiDraft, setAiDraft] = useState('')
  const [needsReview, setNeedsReview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadChats = useCallback(async () => {
    const res = await api.getBossChats()
    setChats(res.items)
    if (!selected && res.items[0]) setSelected(res.items[0])
  }, [selected])

  const loadMessages = useCallback(async (chat: BossChatItem) => {
    if (!chat.jobId) return
    const res = await api.getBossChatMessages(chat.jobId)
    setMessages(res.items)
    const lastHr = [...res.items].reverse().find((m) => m.role === 'hr')
    if (lastHr) {
      const sug = await api.suggestBossReply(chat.jobId, lastHr.content)
      setAiDraft(sug.analysis.suggestedReply)
      setNeedsReview(sug.analysis.intent === 'interview' || sug.analysis.intent === 'question')
      if (!draft) setDraft(sug.analysis.suggestedReply)
    }
  }, [draft])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    loadChats()
      .catch(() => setChats([]))
      .finally(() => setLoading(false))
  }, [user, loadChats])

  useEffect(() => {
    if (selected?.jobId) {
      setDraft('')
      setAiDraft('')
      loadMessages(selected).catch(() => setMessages([]))
    }
  }, [selected, loadMessages])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.syncBossApplications()
      await loadChats()
      if (selected) await loadMessages(selected)
    } finally {
      setSyncing(false)
    }
  }

  const handleSend = async () => {
    if (!selected?.jobId || !draft.trim()) return
    setSending(true)
    try {
      await api.sendBossChatReply(selected.jobId, draft, {
        company: selected.company,
        jobTitle: selected.title,
      })
      await loadMessages(selected)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <Card className="mx-auto mt-16 max-w-md p-8 text-center">
        <p className="text-text-secondary">登录后使用消息托管看板</p>
        <Link to="/login" className="mt-4 inline-block text-brand hover:underline">去登录</Link>
      </Card>
    )
  }

  if (loading) return <Loading text="加载消息…" />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand">
            <ArrowLeft className="h-4 w-4" />
            返回智能投递
          </Link>
          <h1 className="mt-2 text-xl font-bold text-text">消息托管看板</h1>
          <p className="text-sm text-text-secondary">HR 列表 · AI 意图识别 · 自动/人工回复</p>
        </div>
        <Button size="sm" variant="secondary" disabled={syncing} onClick={handleSync}>
          {syncing ? '同步中…' : '同步 Boss 消息'}
        </Button>
      </div>

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">HR 联系人</div>
          <div className="max-h-[480px] overflow-y-auto">
            {chats.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">暂无会话，绑定 Boss 并投递后同步</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.jobId}
                  type="button"
                  onClick={() => setSelected(chat)}
                  className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left hover:bg-panel ${
                    selected?.jobId === chat.jobId ? 'bg-brand-light/30' : ''
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-text">
                        {chat.hrName ?? chat.company}
                      </span>
                      {(chat.unread ?? 0) > 0 && (
                        <Badge variant="danger">{String(chat.unread)}</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-secondary">
                      {chat.title} · {chat.salary}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">{chat.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          {selected ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="font-semibold text-text">
                  {selected.hrName ?? 'HR'} · {selected.company}
                </p>
                <p className="text-sm text-text-secondary">{selected.title} {selected.salary}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'hr' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        m.role === 'hr'
                          ? 'bg-panel text-text'
                          : m.role === 'ai'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-brand text-white'
                      }`}
                    >
                      {m.role === 'ai' && (
                        <span className="mb-1 flex items-center gap-1 text-xs opacity-80">
                          <Bot className="h-3 w-3" /> AI 自动回复
                        </span>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              {aiDraft && needsReview && (
                <div className="mx-4 mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="flex items-center gap-1 font-medium text-amber-800">
                    <Sparkles className="h-4 w-4" />
                    建议人工确认后发送
                  </p>
                  <p className="mt-1 text-amber-900">{aiDraft}</p>
                  <Button size="sm" className="mt-2" variant="secondary" onClick={() => setDraft(aiDraft)}>
                    填入输入框
                  </Button>
                </div>
              )}
              <div className="border-t border-border p-4">
                <textarea
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand"
                  rows={3}
                  placeholder="输入回复，或使用 AI 建议…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="mt-2 flex justify-end gap-2">
                  {aiDraft && (
                    <Button size="sm" variant="secondary" onClick={() => setDraft(aiDraft)}>
                      使用 AI 建议
                    </Button>
                  )}
                  <Button size="sm" disabled={sending || !draft.trim()} onClick={handleSend}>
                    <Send className="mr-1 h-4 w-4" />
                    发送
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-text-secondary">选择左侧 HR 开始对话</p>
          )}
        </Card>
      </div>
    </div>
  )
}

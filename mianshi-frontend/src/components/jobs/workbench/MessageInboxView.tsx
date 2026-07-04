import { useMemo, useState } from 'react'
import { Bot, MessageSquare, Send, Sparkles } from 'lucide-react'
import type { BossChatItem, BossChatMessage } from '../../../api/client'
import { Button } from '../../ui/Button'
import { ChatPaneTransition } from './ChatPaneTransition'
import { CHAT_CATEGORY_LABEL, type ChatCategoryFilter } from './chatCategories'
import type { ReplySuggestion } from './replySuggestions'

type Props = {
  chats: BossChatItem[]
  selectedChatJobId?: string
  messages: BossChatMessage[]
  chatLoading: boolean
  draft: string
  sending: boolean
  suggestions: ReplySuggestion[]
  showInspiration: boolean
  onSelectChat: (chat: BossChatItem) => void
  onDraftChange: (v: string) => void
  onSend: () => void
  onAdoptSuggestion: (text: string) => void
}

export function MessageInboxView({
  chats,
  selectedChatJobId,
  messages,
  chatLoading,
  draft,
  sending,
  suggestions,
  showInspiration,
  onSelectChat,
  onDraftChange,
  onSend,
  onAdoptSuggestion,
}: Props) {
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null)
  const [category, setCategory] = useState<ChatCategoryFilter>('all')

  const filteredChats = useMemo(() => {
    if (category === 'all') return chats
    return chats.filter((c) => (c.category ?? 'communicating') === category)
  }, [chats, category])

  const counts = useMemo(
    () => ({
      all: chats.length,
      new_greeting: chats.filter((c) => c.category === 'new_greeting').length,
      communicating: chats.filter((c) => c.category === 'communicating').length,
    }),
    [chats],
  )

  const selected = filteredChats.find((c) => c.jobId === selectedChatJobId) ??
    chats.find((c) => c.jobId === selectedChatJobId)
  const paneKey = selectedChatJobId ?? 'empty'

  return (
    <div className="flex h-full min-h-0 p-3">
      <div className="flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-gray-800/70 bg-[#0a0e14]/50 shadow-inner shadow-black/20">
        <div className="flex w-[220px] shrink-0 flex-col border-r border-gray-800/60 bg-[#0d1117]/60">
          <div className="shrink-0 border-b border-gray-800/50 px-3 py-2">
            <p className="text-[11px] font-semibold text-text">Boss 消息</p>
            <p className="text-[10px] text-muted">与 Boss 直聘一致：先打招呼，再沟通</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(Object.keys(CHAT_CATEGORY_LABEL) as ChatCategoryFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                    category === key
                      ? 'bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25'
                      : 'text-text-secondary hover:bg-gray-800/50'
                  }`}
                >
                  {CHAT_CATEGORY_LABEL[key]} ({counts[key]})
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredChats.length === 0 ? (
              <p className="p-3 text-center text-[11px] leading-relaxed text-text-secondary">
                {category === 'new_greeting'
                  ? '暂无新招呼，发送招呼后 HR 回复会出现在这里'
                  : category === 'communicating'
                    ? '暂无沟通中的会话'
                    : '发送招呼或同步 Boss 后，会话将出现在这里'}
              </p>
            ) : (
              filteredChats.map((chat) => {
                const active = chat.jobId === selectedChatJobId
                const unread = chat.unread ?? 0
                return (
                  <button
                    key={chat.jobId ?? chat.title}
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    className={`flex w-full gap-2 border-b border-gray-800/25 px-2.5 py-2 text-left transition-all duration-200 ${
                      active
                        ? 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/25'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`truncate text-xs ${active ? 'font-semibold text-cyan-400' : 'font-medium text-text'}`}
                        >
                          {chat.hrName ?? chat.company ?? 'HR'}
                        </span>
                        {unread > 0 && (
                          <span className="h-3.5 min-w-3.5 rounded-full bg-red-500 px-1 text-[8px] font-bold leading-[14px] text-white">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-text-secondary">{chat.title}</p>
                      {chat.category && (
                        <span className="mt-0.5 inline-block text-[9px] text-muted">
                          {CHAT_CATEGORY_LABEL[chat.category]}
                        </span>
                      )}
                      {chat.lastMessage && (
                        <p
                          className={`mt-0.5 truncate text-[9px] ${unread > 0 ? 'text-text' : 'text-muted'}`}
                        >
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selected ? (
            <ChatPaneTransition paneKey={paneKey}>
              <div className="shrink-0 border-b border-gray-800/50 px-4 py-2.5">
                <p className="text-sm font-semibold text-text">
                  {selected.hrName ?? 'HR'} · {selected.company}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {selected.title}
                  {selected.salary ? ` · ${selected.salary}` : ''}
                  {selected.category ? ` · ${CHAT_CATEGORY_LABEL[selected.category]}` : ''}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                {chatLoading ? (
                  <p className="text-center text-xs text-muted">加载消息…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-text-secondary">暂无消息记录</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === 'hr' ? 'justify-start' : 'justify-end'}`}
                      >
                        {m.role === 'hr' && (
                          <div className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800/80 text-[9px] font-medium text-cyan-400">
                            HR
                          </div>
                        )}
                        <div
                          className={`max-w-[82%] rounded-2xl px-2.5 py-1.5 text-xs leading-relaxed ${
                            m.role === 'hr'
                              ? 'rounded-tl-sm bg-gray-800/70 text-text ring-1 ring-gray-700/30'
                              : m.role === 'ai'
                                ? 'rounded-tr-sm border border-amber-500/20 bg-amber-500/10 text-amber-100'
                                : 'rounded-tr-sm bg-cyan-500/90 text-gray-950'
                          }`}
                        >
                          {m.role === 'user' && m.id.startsWith('greeting-') && (
                            <span className="mb-0.5 block text-[9px] opacity-70">我的招呼</span>
                          )}
                          {m.role === 'ai' && (
                            <span className="mb-0.5 flex items-center gap-0.5 text-[9px] opacity-75">
                              <Bot className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-800/50 bg-[#0d1117]/40 px-3 py-2.5">
                {showInspiration && suggestions.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-cyan-400">
                      <Sparkles className="h-3 w-3" />
                      AI 话术推荐
                    </p>
                    <div className="relative space-y-0">
                      {suggestions.map((s, index) => {
                        const active = activeSuggestionId === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setActiveSuggestionId(s.id)
                              onAdoptSuggestion(s.fullText)
                            }}
                            style={{ zIndex: suggestions.length - index }}
                            className={`relative w-full rounded-lg border px-2.5 py-2 text-left transition-all duration-200 ${
                              index > 0 ? '-mt-1' : ''
                            } ${
                              active
                                ? 'border-cyan-400/60 bg-cyan-950/60 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-400/40'
                                : 'border-cyan-500/25 bg-cyan-950/25 shadow-sm shadow-cyan-500/5 hover:border-cyan-400/40 hover:bg-cyan-950/45'
                            }`}
                          >
                            <p className="text-[11px] font-medium text-text">{s.title}</p>
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-text-secondary">{s.preview}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    className="min-h-[2.25rem] flex-1 resize-none rounded-lg border border-gray-800/60 bg-[#0a0e14]/80 px-2.5 py-1.5 text-xs text-text outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
                    rows={2}
                    placeholder="输入回复…"
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    disabled={sending || !draft.trim()}
                    onClick={onSend}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </ChatPaneTransition>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-gray-800/60 bg-[#0d1117]/40">
                <MessageSquare className="h-6 w-6 text-muted" />
              </div>
              <p className="mt-3 text-sm font-medium text-text">选择 HR 联系人</p>
              <p className="mt-1 text-[11px] text-muted">Boss 无「投递简历」，需先发送招呼再沟通</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

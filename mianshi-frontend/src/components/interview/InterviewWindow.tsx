import { useEffect, useRef, useState } from 'react'
import { Send, LayoutGrid, Video, VideoOff, Mic, MicOff, Volume2, Sparkles, User } from 'lucide-react'
import type { Message } from '../../lib/data'
import type { SpeechEngine } from '../../api/client'
import { InterviewAssistPanel } from './InterviewAssistPanel'

type Props = {
  title: string
  messages: Message[]
  interactive?: boolean
  inputValue?: string
  onInputChange?: (value: string) => void
  onSend?: () => void
  sending?: boolean
  candidateVideoRef?: React.RefObject<HTMLVideoElement | null>
  cameraEnabled?: boolean
  cameraLoading?: boolean
  cameraError?: string | null
  onToggleCamera?: () => void
  voiceMode?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  listening?: boolean
  speaking?: boolean
  onToggleListening?: () => void
  aiAssist?: boolean
  onToggleAiAssist?: () => void
  assistSuggestion?: string | null
  assistLoading?: boolean
  onAdoptAssist?: () => void
  onRefreshAssist?: () => void
  onSpeakAssist?: () => void
  layoutMode?: 'candidate' | 'interviewer'
  onToggleLayout?: () => void
  voiceOptions?: { uri: string; label: string; recommended: boolean; category?: string }[]
  selectedVoiceUri?: string
  onVoiceChange?: (uri: string) => void
  onPreviewVoice?: () => void
  speechEngine?: SpeechEngine
  onSpeechEngineChange?: (engine: SpeechEngine) => void
  doubaoConfigured?: boolean
}

export function InterviewWindow({
  title,
  messages,
  interactive = false,
  inputValue = "",
  onInputChange,
  onSend,
  sending = false,
  candidateVideoRef,
  cameraEnabled = false,
  cameraLoading = false,
  cameraError,
  onToggleCamera,
  voiceMode = false,
  onToggleVoice,
  voiceSupported = true,
  listening = false,
  speaking = false,
  onToggleListening,
  aiAssist = false,
  onToggleAiAssist,
  assistSuggestion,
  assistLoading = false,
  onAdoptAssist,
  onRefreshAssist,
  onSpeakAssist,
  layoutMode = "candidate",
  onToggleLayout,
  voiceOptions = [],
  selectedVoiceUri = "",
  onVoiceChange,
  onPreviewVoice,
  speechEngine = "browser",
  onSpeechEngineChange,
  doubaoConfigured = false,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [assistPanelOpen, setAssistPanelOpen] = useState(true)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (aiAssist) setAssistPanelOpen(true)
  }, [aiAssist])

  const videoPanel = (
    <div className="flex flex-col gap-3 p-4 lg:w-72">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-md">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-panel text-brand shadow-lg">
              <User className="h-10 w-10" strokeWidth={1.5} />
            </div>
            {speaking && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white shadow-lg">
                <Volume2 className="h-3.5 w-3.5 animate-pulse" />
              </span>
            )}
          </div>
        </div>
        <div className="relative z-10 flex aspect-video items-end p-3">
          <span className="rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">AI 面试官</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-light to-brand/30 shadow-md">
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          {listening && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white shadow-lg animate-pulse">
              <Mic className="h-4 w-4" />
            </div>
          )}
          {onToggleCamera && (
            <button
              type="button"
              onClick={onToggleCamera}
              disabled={cameraLoading}
              title={cameraEnabled ? "关闭摄像头" : "开启摄像头"}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50"
            >
              {cameraEnabled ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </button>
          )}
        </div>

        {cameraEnabled ? (
          <video ref={candidateVideoRef} autoPlay playsInline muted className="aspect-video w-full scale-x-[-1] object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/80 text-2xl shadow-md">
              🥉
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-3">
          <span className="rounded-md bg-black/30 px-2 py-1 text-xs text-gray-700 backdrop-blur-sm">候选人（我）</span>
        </div>

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <p className="rounded-lg bg-danger/90 px-3 py-1.5 text-xs text-white">{cameraError}</p>
          </div>
        )}
      </div>
    </div>
  )

  const chatPanel = (
    <div className="flex flex-1 flex-col min-w-0">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:max-h-[500px]">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "candidate" ? "flex-row-reverse" : ""} animate-fade-in`}
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
              msg.role === "interviewer" ? "bg-brand text-text" : "bg-gray-200 text-text-secondary"
            }`}>
              {msg.role === "interviewer" ? "AI" : "我"}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "interviewer"
                  ? "bg-bg-subtle text-text"
                  : "bg-brand/15 text-text"
              } ${msg.streaming ? "border-l-2 border-brand animate-pulse" : ""}`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-border bg-bg-subtle/80 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {onToggleCamera && (
              <button
                type="button"
                onClick={onToggleCamera}
                disabled={cameraLoading}
                title={cameraEnabled ? "关闭摄像头" : "开启摄像头"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                  cameraEnabled ? "bg-brand/20 text-brand-dark" : "text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <Video className="h-4 w-4" />
              </button>
            )}
            {voiceSupported && onToggleVoice && (
              <button
                type="button"
                onClick={onToggleVoice}
                title={voiceMode ? "关闭语音模式" : "开启语音模式"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                  voiceMode ? "bg-brand/20 text-brand-dark" : "text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            {onToggleListening && voiceMode && (
              <button
                type="button"
                onClick={onToggleListening}
                disabled={!voiceMode}
                title={listening ? "停止录音" : "开始录音"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                  listening ? "bg-success text-white animate-pulse" : "text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {onToggleAiAssist && (
              <button
                type="button"
                onClick={onToggleAiAssist}
                title={aiAssist ? '关闭右侧 AI 辅助' : '开启右侧 AI 辅助'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                  aiAssist ? "bg-brand/20 text-brand-dark" : "text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>

          {voiceMode && onVoiceChange && (
            <div className="flex items-center gap-2">
              {onSpeechEngineChange && (
                <div className="flex rounded-lg border border-border bg-elevated overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => onSpeechEngineChange("browser")}
                    className={`px-2 py-1.5 transition ${speechEngine === "browser" ? "bg-brand text-text" : "text-text-secondary hover:text-text"}`}
                  >
                    系统音色
                  </button>
                  <button
                    type="button"
                    onClick={() => onSpeechEngineChange("doubao")}
                    className={`px-2 py-1.5 transition ${speechEngine === "doubao" ? "bg-brand text-text" : "text-text-secondary hover:text-text"}`}
                  >
                    豆包音色
                  </button>
                </div>
              )}
              <select
                value={selectedVoiceUri}
                onChange={(e) => onVoiceChange(e.target.value)}
                title="面试官音色"
                className="max-w-[160px] rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs outline-none hover:border-brand/50"
              >
                {speechEngine === "doubao" ? (
                  (["推荐", "明星IP", "角色", "情感", "通用"] as const).map((cat) => {
                    const items = voiceOptions.filter((v) => v.category === cat)
                    if (items.length === 0) return null
                    return (
                      <optgroup key={cat} label={cat === "明星IP" ? "明星 / IP 仿音" : cat}>
                        {items.map((v) => (
                          <option key={v.uri} value={v.uri}>{v.label}</option>
                        ))}
                      </optgroup>
                    )
                  })
                ) : (
                  voiceOptions.map((v) => (
                    <option key={v.uri} value={v.uri}>{v.label}</option>
                  ))
                )}
              </select>
              {onPreviewVoice && (
                <button
                  type="button"
                  onClick={onPreviewVoice}
                  disabled={speaking}
                  title="试听当前音色"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary transition hover:bg-brand/30 disabled:opacity-50"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {!doubaoConfigured && voiceMode && speechEngine === "doubao" && (
            <span className="text-xs text-warning">豆包 TTS 未配置，请设置 TTS_API_KEY</span>
          )}
          {voiceMode && (
            <span className="text-xs text-text-secondary">
              {speaking ? "🔰 面试官提问中" : listening ? "🎙 请说出您的回答" : "等待下一轮"}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 border-t border-border bg-elevated px-4 py-3">
        <textarea
          ref={inputRef}
          rows={3}
          placeholder={voiceMode ? '语音识别结果将显示在此，也可手动输入或编辑' : '请输入您的回答，可先采用 AI 辅助再修改'}
          value={inputValue}
          readOnly={!interactive || sending}
          onChange={(e) => onInputChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sending) {
              e.preventDefault()
              onSend?.()
            }
          }}
          className="max-h-32 min-h-[72px] flex-1 resize-y rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm leading-relaxed outline-none placeholder:text-text-secondary focus:border-brand/30 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!interactive || sending || !inputValue.trim()}
          aria-label="发送回答"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-text shadow-sm transition hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-elevated shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between border-b border-border bg-bg-subtle/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-danger" />
            <span className="h-3 w-3 rounded-full bg-warning" />
            <span className="h-3 w-3 rounded-full bg-success" />
          </div>
          <span className="text-sm font-medium text-text truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={onToggleLayout}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-elevated hover:text-text"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{layoutMode === "candidate" ? "面试者布局" : "对话布局"}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {layoutMode === "candidate" ? (
          <>
            {chatPanel}
            <div className="hidden lg:flex lg:flex-row">
              <div>{videoPanel}</div>
              <InterviewAssistPanel
                open={assistPanelOpen}
                enabled={aiAssist}
                onToggleOpen={() => setAssistPanelOpen((v) => !v)}
                suggestion={assistSuggestion ?? null}
                loading={assistLoading}
                sending={sending}
                onAdopt={() => {
                  onAdoptAssist?.()
                  inputRef.current?.focus()
                }}
                onRefresh={onRefreshAssist}
                onSpeak={onSpeakAssist}
              />
            </div>
          </>
        ) : (
          <>
            <div className="hidden lg:flex lg:flex-row">
              <div>{videoPanel}</div>
              <InterviewAssistPanel
                open={assistPanelOpen}
                enabled={aiAssist}
                onToggleOpen={() => setAssistPanelOpen((v) => !v)}
                suggestion={assistSuggestion ?? null}
                loading={assistLoading}
                sending={sending}
                onAdopt={() => {
                  onAdoptAssist?.()
                  inputRef.current?.focus()
                }}
                onRefresh={onRefreshAssist}
                onSpeak={onSpeakAssist}
              />
            </div>
            {chatPanel}
          </>
        )}
      </div>

      {aiAssist && (
        <div className="border-t border-border bg-bg-subtle/50 lg:hidden [&>div]:!w-full">
          <InterviewAssistPanel
            open={assistPanelOpen}
            enabled
            onToggleOpen={() => setAssistPanelOpen((v) => !v)}
            suggestion={assistSuggestion ?? null}
            loading={assistLoading}
            sending={sending}
            onAdopt={() => {
              onAdoptAssist?.()
              inputRef.current?.focus()
            }}
            onRefresh={onRefreshAssist}
            onSpeak={onSpeakAssist}
          />
        </div>
      )}

      <div className="lg:hidden border-t border-border">{videoPanel}</div>
    </div>
  )
}
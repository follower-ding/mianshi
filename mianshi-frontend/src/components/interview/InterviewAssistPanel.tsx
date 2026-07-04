import { ChevronLeft, ChevronRight, Check, RefreshCw, Sparkles, Volume2 } from 'lucide-react'

type Props = {
  open: boolean
  enabled: boolean
  onToggleOpen: () => void
  suggestion: string | null
  loading: boolean
  sending?: boolean
  onAdopt?: () => void
  onRefresh?: () => void
  onSpeak?: () => void
}

export function InterviewAssistPanel({
  open,
  enabled,
  onToggleOpen,
  suggestion,
  loading,
  sending = false,
  onAdopt,
  onRefresh,
  onSpeak,
}: Props) {
  if (!enabled) return null

  return (
    <div
      className={`relative flex shrink-0 border-l border-border bg-bg-subtle/40 transition-[width] duration-300 ease-out ${
        open ? 'w-[280px]' : 'w-10'
      }`}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        title={open ? '收起 AI 辅助' : '展开 AI 辅助'}
        className="absolute -left-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-elevated text-brand shadow-md transition hover:bg-brand/10"
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="flex h-full min-h-[420px] w-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text">AI 辅助</p>
              <p className="text-[10px] text-muted">参考回答，可编辑后发送</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted animate-pulse">
                <Sparkles className="h-3.5 w-3.5" />
                正在生成详细建议…
              </div>
            )}

            {!loading && suggestion && (
              <div className="rounded-xl border border-brand/20 bg-elevated/80 p-3">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                  {suggestion}
                </p>
              </div>
            )}

            {!loading && !suggestion && (
              <p className="text-xs leading-relaxed text-muted">
                等待面试官提问后，将在此生成结构化参考答案。
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={onAdopt}
              disabled={!suggestion || loading || sending}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-on-brand transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              采用到输入框
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading || sending}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-text-secondary transition hover:bg-bg-subtle disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                换一个
              </button>
              {onSpeak && (
                <button
                  type="button"
                  onClick={onSpeak}
                  disabled={!suggestion || loading}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-text-secondary transition hover:bg-bg-subtle disabled:opacity-50"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  播报
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleOpen}
          title="展开 AI 辅助"
          className="flex w-full cursor-pointer flex-col items-center gap-2 py-4 text-brand"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-medium [writing-mode:vertical-rl]">AI 辅助</span>
        </button>
      )}
    </div>
  )
}

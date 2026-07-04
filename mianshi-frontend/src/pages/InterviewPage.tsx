import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Share2 } from 'lucide-react'
import { InterviewWindow } from '../components/interview/InterviewWindow'
import { InterviewStartOverlay } from '../components/interview/InterviewStartOverlay'
import { ShareReportExperienceModal } from '../components/experiences/ShareReportExperienceModal'
import { api, type Question } from '../api/client'
import { useWebcam } from '../hooks/useWebcam'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useInterviewerSpeech } from '../hooks/useInterviewerSpeech'
import { POSITIONS, shouldShowInterviewComplete, type Message } from '../lib/data'
import { extractInterviewQuestion } from '../lib/interviewQuestion'
import type { InterviewReportPayload } from '../api/client'
import { categoryToSlug } from '../components/question-bank/bankCatalog'

export function InterviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const position = searchParams.get('position') || 'Java 后端开发'
  const experience = searchParams.get('experience') || '未指定'
  const interviewMode = (searchParams.get('mode') as 'quick' | 'standard' | 'deep') || 'standard'
  const questionId = searchParams.get('questionId') || undefined
  const applicationId = searchParams.get('applicationId') || undefined

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [answerCount, setAnswerCount] = useState(0)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [report, setReport] = useState<InterviewReportPayload | null>(null)
  const [mode, setMode] = useState<'ai' | 'demo'>('demo')
  const [lastFeedback, setLastFeedback] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [sharedExperienceId, setSharedExperienceId] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(true)
  const [aiAssist, setAiAssist] = useState(false)
  const [assistSuggestion, setAssistSuggestion] = useState<string | null>(null)
  const [assistLoading, setAssistLoading] = useState(false)
  const [assistVariant, setAssistVariant] = useState(0)
  const [layoutMode, setLayoutMode] = useState<'candidate' | 'interviewer'>('candidate')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [pinnedQuestion, setPinnedQuestion] = useState<Question | null>(null)
  const [sessionPhase, setSessionPhase] = useState<'loading' | 'intro' | 'live'>('loading')

  const lastInterviewerQuestionRef = useRef<string>('')
  const pendingOpeningRef = useRef<string>('')
  const pendingAutoSendRef = useRef(false)
  const handleSendRef = useRef<(text?: string) => Promise<void>>(async () => {})

  const { videoRef, enabled, error, loading: cameraLoading, toggle } = useWebcam()
  const {
    speak,
    previewVoice,
    cancel: cancelSpeak,
    speaking,
    supported: ttsSupported,
    engine: speechEngine,
    selectEngine,
    doubaoConfigured,
    voiceOptions,
    selectedVoiceUri,
    onVoiceChange,
  } = useInterviewerSpeech()

  const speechRec = useSpeechRecognition({
    onResult: (text, isFinal) => {
      setInput(text)
      if (isFinal && text.trim() && voiceMode) {
        pendingAutoSendRef.current = true
        setTimeout(() => {
          if (pendingAutoSendRef.current) {
            pendingAutoSendRef.current = false
            handleSendRef.current(text.trim())
          }
        }, 600)
      }
    },
    onError: (msg) => setVoiceError(msg),
  })

  const fetchAssist = useCallback(
    async (question: string, variant = assistVariant, force = false) => {
      if (!sessionId || !question.trim()) return
      if (!force && !aiAssist) return
      setAssistLoading(true)
      try {
        const q = extractInterviewQuestion(question)
        const result = await api.getAssistSuggestion(sessionId, q, variant)
        setAssistSuggestion(result.suggestion)
        setAssistVariant(variant)
      } catch {
        setAssistSuggestion(null)
      } finally {
        setAssistLoading(false)
      }
    },
    [sessionId, aiAssist, assistVariant],
  )

  const onInterviewerReady = useCallback(
    async (text: string, force = false) => {
      if (!text.trim() || (!force && finished)) return
      lastInterviewerQuestionRef.current = text

      if (aiAssist) {
        setAssistVariant(0)
        fetchAssist(text, 0)
      } else {
        setAssistSuggestion(null)
      }

      if (voiceMode) {
        if (ttsSupported) {
          await speak(text)
        }
        if (!finished && !sending && speechRec.supported) {
          window.setTimeout(() => {
            if (!finished && !sending) speechRec.start()
          }, 400)
        } else if (!speechRec.supported) {
          setVoiceError('当前浏览器不支持语音识别，请手动输入回答')
        }
      }
    },
    [aiAssist, voiceMode, ttsSupported, speak, finished, sending, fetchAssist, speechRec],
  )

  const beginLiveSession = useCallback(async () => {
    const text = pendingOpeningRef.current
    if (!text.trim()) return
    setMessages([
      {
        id: 'opening',
        role: 'interviewer',
        content: text,
      },
    ])
    setSessionPhase('live')
    await onInterviewerReady(text, true)
  }, [onInterviewerReady])

  // Load pinned question context from question bank
  useEffect(() => {
    if (!questionId) return
    api.getQuestion(questionId).then(setPinnedQuestion).catch(() => setPinnedQuestion(null))
  }, [questionId])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setSessionPhase('loading')
      setFinished(false)
      setReportId(null)
      setReport(null)
      setMessages([])
      setScore(0)
      setAnswerCount(0)
      setAssistSuggestion(null)
      setAssistVariant(0)
      pendingOpeningRef.current = ''

      try {
        const status = await api.getInterviewStatus()
        if (!cancelled) setMode(status.llmConfigured ? 'ai' : 'demo')

        const result = await api.startInterview(
          position,
          experience,
          interviewMode,
          questionId,
          applicationId,
        )
        if (cancelled) return

        setSessionId(result.sessionId)
        pendingOpeningRef.current = result.message
        if (!cancelled) {
          setSessionPhase('intro')
        }
      } catch (e) {
        if (!cancelled) {
          setSessionPhase('live')
          setMessages([
            {
              id: 'error',
              role: 'interviewer',
              content: `无法连接后端服务，请确认 API 已启动（${e instanceof Error ? e.message : '未知错误'}）`,
            },
          ])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
      cancelSpeak()
      speechRec.stop()
    }
  }, [position, experience, interviewMode, questionId, applicationId])

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || !sessionId || sending || finished) return

    pendingAutoSendRef.current = false
    speechRec.stop()
    cancelSpeak()

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'candidate',
      content: text,
    }

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAssistSuggestion(null)
    setSending(true)

    const streamMsgId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: streamMsgId, role: 'interviewer', content: '', streaming: true },
    ])

    try {
      let fullReply = ''
      const { finished: isFinished, report: streamReport, reportId: streamReportId } =
        await api.chatInterviewStream(
        sessionId,
        userMsg.content,
        history,
        (delta) => {
          fullReply += delta
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamMsgId ? { ...m, content: fullReply, streaming: true } : m,
            ),
          )
        },
        (meta) => {
          setScore(meta.totalScore)
          setLastFeedback(meta.feedback)
          setAnswerCount((c) => c + 1)
        },
      )

      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamMsgId ? { ...m, content: fullReply, streaming: false } : m,
        ),
      )

      const reallyFinished = shouldShowInterviewComplete(isFinished, fullReply)

      if (reallyFinished) {
        setFinished(true)
        if (streamReport) setReport(streamReport)
        if (streamReportId) setReportId(streamReportId)
        if (voiceMode && ttsSupported && fullReply) {
          await speak(fullReply)
        }
      } else if (fullReply) {
        if (isFinished && !reallyFinished) {
          setFinished(false)
          setReport(null)
        }
        await onInterviewerReady(fullReply, true)
      }
    } catch {
      try {
        const result = await api.chatInterview(sessionId, userMsg.content, history)
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== streamMsgId)
            .concat({
              id: streamMsgId,
              role: 'interviewer',
              content: result.reply,
            }),
        )
        setScore(result.totalScore)
        setLastFeedback(result.feedback)
        setAnswerCount((c) => c + 1)
        const reallyFinished = shouldShowInterviewComplete(result.finished, result.reply)
        if (reallyFinished) {
          setFinished(true)
          if (result.report) setReport(result.report)
          if (result.reportId) setReportId(result.reportId)
          if (voiceMode && ttsSupported) await speak(result.reply)
        } else {
          if (result.finished) {
            setFinished(false)
            setReport(null)
          }
          await onInterviewerReady(result.reply, true)
        }
      } catch (e) {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== streamMsgId)
            .concat({
              id: streamMsgId,
              role: 'interviewer',
              content: `请求失败：${e instanceof Error ? e.message : '未知错误'}`,
            }),
        )
      }
    } finally {
      setSending(false)
    }
  }

  handleSendRef.current = handleSend

  const handleToggleVoice = () => {
    if (voiceMode) {
      speechRec.stop()
      cancelSpeak()
    }
    setVoiceMode((v) => !v)
  }

  const handleAdoptAssist = () => {
    if (!assistSuggestion || sending || finished) return
    pendingAutoSendRef.current = false
    setInput(assistSuggestion)
  }

  const handleRefreshAssist = () => {
    const q = lastInterviewerQuestionRef.current
    if (!q || !sessionId) return
    const nextVariant = assistVariant + 1
    void fetchAssist(q, nextVariant, true)
  }

  const handleSpeakAssist = () => {
    if (assistSuggestion) speak(assistSuggestion)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">沉浸式模拟面试</h1>
          <p className="mt-1 text-sm text-muted">
            当前岗位：{position} · 已回答 {answerCount} 题 ·{' '}
            <span className={mode === 'ai' ? 'text-green-600' : 'text-orange-600'}>
              {mode === 'ai' ? 'AI 模式' : 'Demo 模式（配置 LLM_API_KEY 启用 AI）'}
            </span>
            {voiceMode && (
              <span className="ml-2 text-green-600">
                · 🎤 语音交互
                {speechEngine === 'doubao' && doubaoConfigured ? '（豆包音色）' : '（系统音色）'}
                {speaking ? '（面试官发言中）' : speechRec.listening ? '（聆听中）' : ''}
              </span>
            )}
          </p>
        </div>
        {pinnedQuestion && (
          <div className="w-full rounded-xl border border-brand/25 bg-brand-light/40 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold text-brand">题库面试</span>
              <span className="text-sm text-text-secondary">
                {pinnedQuestion.title} · {pinnedQuestion.category} · {pinnedQuestion.difficulty}
              </span>
              {pinnedQuestion.category && categoryToSlug(pinnedQuestion.category) && (
                <Link
                  to={`/questions/${categoryToSlug(pinnedQuestion.category)}?id=${pinnedQuestion.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  回到本题刷题
                </Link>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-brand/15 px-4 py-2 text-sm">
            实时得分：<span className="font-bold text-brand-dark">{score}</span>
          </div>
          {sessionPhase === 'live' &&
            voiceMode &&
            messages.some((m) => m.role === 'interviewer' && m.content.trim()) && (
            <button
              type="button"
              onClick={() => {
                const q =
                  lastInterviewerQuestionRef.current ||
                  [...messages].reverse().find((m) => m.role === 'interviewer')?.content ||
                  ''
                if (q) void speak(q)
              }}
              disabled={speaking}
              className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition hover:bg-brand/20 disabled:opacity-50"
            >
              {speaking ? '播放中…' : '🔊 重听提问'}
            </button>
          )}
          <select
            defaultValue={position}
            onChange={(e) => {
              const exp = searchParams.get('experience') ?? ''
              const q = new URLSearchParams({ position: e.target.value })
              if (exp) q.set('experience', exp)
              navigate(`/interview?${q.toString()}`)
            }}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(voiceError || (!speechRec.supported && voiceMode)) && (
        <div className="mb-4 rounded-xl bg-orange-50 px-4 py-2 text-sm text-orange-700">
          {voiceError ??
            '当前浏览器不支持语音识别，请使用 Chrome 或 Edge，或切换为文字模式。'}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-elevated">
          <div className="text-center">
            <p className="text-sm font-medium text-text">正在连接 AI 面试官…</p>
            <p className="mt-1 text-xs text-muted">请稍候，即将进入沉浸式面试</p>
          </div>
        </div>
      ) : sessionPhase === 'live' ? (
        <InterviewWindow
          title={`沉浸式模拟面试 - ${position}`}
          messages={messages}
          interactive={!finished}
          inputValue={input}
          onInputChange={setInput}
          onSend={() => handleSend()}
          sending={sending}
          candidateVideoRef={videoRef}
          cameraEnabled={enabled}
          cameraLoading={cameraLoading}
          cameraError={error}
          onToggleCamera={toggle}
          voiceMode={voiceMode}
          onToggleVoice={handleToggleVoice}
          voiceSupported={speechRec.supported && ttsSupported}
          listening={speechRec.listening}
          speaking={speaking}
          onToggleListening={speechRec.toggle}
          aiAssist={aiAssist}
          onToggleAiAssist={() => {
            setAiAssist((v) => {
              const next = !v
              if (next && lastInterviewerQuestionRef.current && sessionId) {
                setAssistVariant(0)
                void fetchAssist(lastInterviewerQuestionRef.current, 0, true)
              }
              if (!next) {
                setAssistSuggestion(null)
                setAssistVariant(0)
              }
              return next
            })
          }}
          assistSuggestion={assistSuggestion}
          assistLoading={assistLoading}
          onAdoptAssist={handleAdoptAssist}
          onRefreshAssist={handleRefreshAssist}
          onSpeakAssist={handleSpeakAssist}
          layoutMode={layoutMode}
          onToggleLayout={() =>
            setLayoutMode((m) => (m === 'candidate' ? 'interviewer' : 'candidate'))
          }
          voiceOptions={voiceOptions}
          selectedVoiceUri={selectedVoiceUri}
          onVoiceChange={onVoiceChange}
          onPreviewVoice={() => previewVoice()}
          speechEngine={speechEngine}
          onSpeechEngineChange={selectEngine}
          doubaoConfigured={doubaoConfigured}
        />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-elevated">
          <p className="text-sm text-muted">面试准备中…</p>
        </div>
      )}

      {sessionPhase === 'intro' && (
        <InterviewStartOverlay
          position={position}
          experience={experience}
          mode={interviewMode}
          onComplete={beginLiveSession}
        />
      )}

      {lastFeedback && !finished && (
        <p className="mt-4 text-center text-sm text-muted">💡 {lastFeedback}</p>
      )}

      {finished && report && (
        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-light p-6">
          <h2 className="text-center text-xl font-bold">🎉 面试完成！</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <p className="text-muted">
              总分 <span className="font-bold text-brand-dark">{score}</span> 分
            </p>
            {report.overallRating && (
              <span className="rounded-full bg-white/80 px-3 py-0.5 text-sm font-medium text-text">
                综合评级：{report.overallRating}
              </span>
            )}
          </div>
          {report.summary && (
            <p className="mt-4 text-sm leading-relaxed text-gray-700">{report.summary}</p>
          )}
          {(report.strengths?.length || report.improvements?.length) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {report.strengths && report.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700">优势</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {report.strengths.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.improvements && report.improvements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-700">待改进</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {report.improvements.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {reportId && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to={`/reports/${reportId}`}
                className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-text hover:bg-brand-dark"
              >
                查看完整复盘报告
              </Link>
              {sharedExperienceId ? (
                <Link
                  to={`/experiences/${sharedExperienceId}`}
                  className="rounded-xl border border-brand/40 bg-white/80 px-6 py-2.5 text-sm font-medium text-brand-dark hover:bg-white"
                >
                  <Share2 className="mr-1 inline h-4 w-4" />
                  已分享 · 查看面经
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="rounded-xl border border-brand/40 bg-white/80 px-6 py-2.5 text-sm font-medium text-brand-dark hover:bg-white"
                >
                  <Share2 className="mr-1 inline h-4 w-4" />
                  分享到面经社区
                </button>
              )}
              {pinnedQuestion?.category && categoryToSlug(pinnedQuestion.category) && (
                <Link
                  to={`/questions/${categoryToSlug(pinnedQuestion.category)}?id=${pinnedQuestion.id}`}
                  className="rounded-xl border border-brand/30 bg-brand-light px-6 py-2.5 text-sm font-medium text-brand hover:bg-brand-light/70"
                >
                  <BookOpen className="mr-1 inline h-4 w-4" />
                  回到本题继续刷
                </Link>
              )}
              <Link
                to="/questions"
                className="rounded-xl border border-gray-300/60 bg-white/60 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-white"
              >
                去题库刷题
              </Link>
            </div>
          )}
        </div>
      )}

      {reportId && (
        <ShareReportExperienceModal
          reportId={reportId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onShared={(experienceId) => {
            setSharedExperienceId(experienceId)
            navigate(`/experiences/${experienceId}`)
          }}
        />
      )}
    </div>
  )
}

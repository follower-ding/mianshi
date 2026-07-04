import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Monitor, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

export type BossBindWizardProps = {
  onConnectId?: (connectId: string) => void
  onComplete?: (bossName?: string) => void
  onError?: (message: string) => void
}

export function BossBindWizard({ onConnectId, onComplete, onError }: BossBindWizardProps) {
  const [phase, setPhase] = useState<'starting' | 'waiting' | 'success' | 'failed'>('starting')
  const [connectId, setConnectId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [loggedInPending, setLoggedInPending] = useState(false)
  const [bossName, setBossName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completingRef = useRef(false)
  const connectIdRef = useRef<string | null>(null)
  const beginInFlightRef = useRef(false)

  const stopConnect = useCallback(async (id: string | null) => {
    if (!id) return
    try {
      await api.cancelBossConnect(id)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    connectIdRef.current = connectId
  }, [connectId])

  const finishSuccess = useCallback(
    async (id: string, name?: string) => {
      if (completingRef.current) return
      completingRef.current = true
      setBossName(name ?? 'Boss 用户')
      try {
        const res = await api.completeBossConnect(id)
        setPhase('success')
        onComplete?.(res.bossName ?? name)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Boss 绑定失败'
        setError(msg)
        setPhase('failed')
        onError?.(msg)
        completingRef.current = false
      }
    },
    [onComplete, onError],
  )

  const pollOnce = useCallback(
    async (id: string) => {
      const s = await api.getBossConnectStatus(id)
      setLoggedInPending(Boolean(s.loggedInPending))
      if (s.loggedInPending) setPreviewImage(null)
      else if (s.qrImageBase64) setPreviewImage(s.qrImageBase64)
      if (s.status === 'success') {
        if (pollRef.current) clearInterval(pollRef.current)
        await finishSuccess(id, s.bossName)
      } else if (s.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
        setError(s.error ?? 'Boss 登录失败')
        setPhase('failed')
        onError?.(s.error ?? 'Boss 登录失败')
      } else if (s.status === 'expired') {
        if (pollRef.current) clearInterval(pollRef.current)
        setError('连接已过期，请重新开始')
        setPhase('failed')
      }
    },
    [finishSuccess, onError],
  )

  const startPoll = useCallback(
    (id: string) => {
      if (pollRef.current) clearInterval(pollRef.current)
      void pollOnce(id).catch(() => {})
      pollRef.current = setInterval(() => void pollOnce(id).catch(() => {}), 1000)
    },
    [pollOnce],
  )

  const beginConnect = useCallback(async () => {
    if (beginInFlightRef.current) return
    beginInFlightRef.current = true
    if (pollRef.current) clearInterval(pollRef.current)
    await stopConnect(connectIdRef.current)
    setPhase('starting')
    setError(null)
    setPreviewImage(null)
    setLoggedInPending(false)
    completingRef.current = false
    setConnectId(null)
    connectIdRef.current = null
    try {
      const res = await api.startBossConnect()
      setConnectId(res.connectId)
      connectIdRef.current = res.connectId
      onConnectId?.(res.connectId)
      setPhase('waiting')
      startPoll(res.connectId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Boss 连接启动失败'
      setError(msg)
      setPhase('failed')
      onError?.(msg)
    } finally {
      beginInFlightRef.current = false
    }
  }, [startPoll, onError, onConnectId, stopConnect])

  useEffect(() => {
    void beginConnect()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSyncStatus = async () => {
    if (!connectId) return
    setError(null)
    try {
      const s = await api.syncBossConnect(connectId)
      setLoggedInPending(Boolean(s.loggedInPending))
      if (s.loggedInPending) setPreviewImage(null)
      else if (s.qrImageBase64) setPreviewImage(s.qrImageBase64)
      if (s.status === 'success') {
        if (pollRef.current) clearInterval(pollRef.current)
        await finishSuccess(connectId, s.bossName)
      } else if (s.status === 'failed') {
        setError(s.error ?? 'Boss 登录失败')
        setPhase('failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步登录状态失败')
    }
  }

  return (
    <div className="space-y-3">
      {phase === 'starting' && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          正在打开 Chrome 登录窗口…
        </p>
      )}

      {phase === 'waiting' && (
        <div className="rounded-lg border border-border bg-white p-3 space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-brand-light/30 px-3 py-2">
            <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-sm text-text-secondary">
              请在弹出的 Chrome 窗口用 Boss App 扫码；也可扫描下方同步二维码。
            </p>
          </div>
          {loggedInPending ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
              <p className="mt-2 text-sm text-text-secondary">检测到 Chrome 已登录，正在同步会话…</p>
              <p className="mt-1 text-xs text-muted">若长时间无响应，请点击下方「刷新状态」</p>
            </div>
          ) : previewImage ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={previewImage}
                alt="Boss 登录二维码"
                className="max-h-56 rounded border border-border"
              />
              <p className="text-xs text-muted">登录成功后将自动保存到系统并关闭窗口</p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
              <p className="mt-2 text-xs text-muted">加载登录页预览…</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              onClick={() => void handleSyncStatus()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              我已完成扫码，刷新状态
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted hover:underline"
              onClick={() => void beginConnect()}
            >
              重新打开登录窗口
            </button>
          </div>
        </div>
      )}

      {phase === 'success' && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Boss 已连接：{bossName ?? '已就绪'}
        </p>
      )}

      {phase === 'failed' && (
        <div className="space-y-2">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="button" className="text-sm text-brand hover:underline" onClick={() => void beginConnect()}>
            重新开始
          </button>
        </div>
      )}
    </div>
  )
}

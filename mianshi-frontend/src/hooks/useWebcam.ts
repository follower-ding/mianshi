import { useCallback, useEffect, useRef, useState } from 'react'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setEnabled(false)
  }, [])

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前浏览器不支持摄像头')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setEnabled(true)
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? '摄像头权限被拒绝，请在浏览器设置中允许访问'
          : e instanceof Error
            ? e.message
            : '无法开启摄像头'
      setError(msg)
      stop()
    } finally {
      setLoading(false)
    }
  }, [stop])

  const toggle = useCallback(async () => {
    if (enabled) {
      stop()
    } else {
      await start()
    }
  }, [enabled, start, stop])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { videoRef, enabled, error, loading, start, stop, toggle }
}

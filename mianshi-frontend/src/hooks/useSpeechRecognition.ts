import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  lang?: string
  continuous?: boolean
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (message: string) => void
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(options: Options = {}) {
  const { lang = 'zh-CN', continuous = true, onResult, onError } = options
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)

  onResultRef.current = onResult
  onErrorRef.current = onError

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()))
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onErrorRef.current?.('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
      return
    }

    recognitionRef.current?.stop()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') {
        setListening(false)
        return
      }
      onErrorRef.current?.(`语音识别错误：${e.error}`)
      setListening(false)
    }
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) final += text
        else interim += text
      }
      const combined = final || interim
      setTranscript(combined)
      onResultRef.current?.(combined, Boolean(final))
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [lang, continuous])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return { listening, supported, transcript, start, stop, toggle, setTranscript }
}

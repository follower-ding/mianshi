import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type DoubaoVoice, type SpeechEngine } from '../api/client'
import { useSpeechSynthesis, type VoiceOption } from './useSpeechSynthesis'

const PREFS_KEY = 'mianshi-speech-prefs'

type SpeechPrefs = {
  engine: SpeechEngine
  doubaoVoiceId: string
  browserVoiceUri: string
}

function loadPrefs(): Partial<SpeechPrefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<SpeechPrefs>
  } catch {
    return {}
  }
}

function savePrefs(prefs: SpeechPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.play().catch(() => {
      URL.revokeObjectURL(url)
      resolve()
    })
  })
}

export function useInterviewerSpeech() {
  const browser = useSpeechSynthesis()
  const [doubaoConfigured, setDoubaoConfigured] = useState(false)
  const [doubaoVoices, setDoubaoVoices] = useState<DoubaoVoice[]>([])
  const [engine, setEngine] = useState<SpeechEngine>(() => loadPrefs().engine ?? 'browser')
  const [doubaoVoiceId, setDoubaoVoiceId] = useState(
    () => loadPrefs().doubaoVoiceId ?? 'zh_female_vv_uranus_bigtts',
  )
  const [doubaoSpeaking, setDoubaoSpeaking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    api
      .getTtsStatus()
      .then((status) => {
        setDoubaoConfigured(status.configured)
        if (status.configured && !loadPrefs().engine) {
          setEngine('doubao')
        }
      })
      .catch(() => setDoubaoConfigured(false))

    api
      .getTtsVoices()
      .then((res) => setDoubaoVoices(res.voices))
      .catch(() => setDoubaoVoices([]))
  }, [])

  useEffect(() => {
    savePrefs({
      engine,
      doubaoVoiceId,
      browserVoiceUri: browser.selectedVoiceUri,
    })
  }, [engine, doubaoVoiceId, browser.selectedVoiceUri])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    browser.cancel()
    setDoubaoSpeaking(false)
  }, [browser])

  const speakDoubao = useCallback(
    async (text: string, speakerId?: string) => {
      if (!text.trim()) return

      cancel()
      const speaker = speakerId ?? doubaoVoiceId
      const voice = doubaoVoices.find((v) => v.id === speaker)
      const controller = new AbortController()
      abortRef.current = controller
      setDoubaoSpeaking(true)

      try {
        const blob = await api.synthesizeSpeech(
          text,
          speaker,
          voice?.resourceId,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          await playBlob(blob)
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setDoubaoSpeaking(false)
      }
    },
    [cancel, doubaoVoiceId, doubaoVoices],
  )

  const speak = useCallback(
    async (text: string) => {
      if (engine === 'doubao' && doubaoConfigured) {
        try {
          await speakDoubao(text)
          return
        } catch {
          /* 豆包失败时回退系统音色 */
        }
      }
      await browser.speak(text)
    },
    [engine, doubaoConfigured, speakDoubao, browser],
  )

  const previewVoice = useCallback(() => {
    const sample = '你好，我是你的 AI 面试官，接下来我们开始模拟面试。'
    if (engine === 'doubao' && doubaoConfigured) {
      speakDoubao(sample)
    } else {
      browser.previewVoice()
    }
  }, [engine, doubaoConfigured, speakDoubao, browser])

  const selectEngine = useCallback(
    (next: SpeechEngine) => {
      cancel()
      if (next === 'doubao' && !doubaoConfigured) return
      setEngine(next)
    },
    [cancel, doubaoConfigured],
  )

  const selectDoubaoVoice = useCallback(
    (id: string) => {
      cancel()
      setDoubaoVoiceId(id)
    },
    [cancel],
  )

  const speaking = engine === 'doubao' ? doubaoSpeaking : browser.speaking

  const voiceOptions: VoiceOption[] =
    engine === 'doubao'
      ? doubaoVoices.map((v) => ({
          uri: v.id,
          label: v.recommended ? `${v.label}（推荐）` : v.label,
          recommended: Boolean(v.recommended),
          category: v.category,
        }))
      : browser.voices

  const selectedVoiceUri = engine === 'doubao' ? doubaoVoiceId : browser.selectedVoiceUri

  const onVoiceChange = useCallback(
    (uri: string) => {
      if (engine === 'doubao') selectDoubaoVoice(uri)
      else browser.selectVoice(uri)
    },
    [engine, selectDoubaoVoice, browser],
  )

  return {
    speak,
    previewVoice,
    cancel,
    speaking,
    supported: browser.supported || doubaoConfigured,
    engine,
    selectEngine,
    doubaoConfigured,
    doubaoVoices,
    voiceOptions,
    selectedVoiceUri,
    onVoiceChange,
    browserEngine: browser,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

const VOICE_STORAGE_KEY = 'mianshi-interviewer-voice-uri'

export type VoiceOption = {
  uri: string
  label: string
  recommended: boolean
  category?: string
}

const VOICE_RANK_PATTERNS: RegExp[] = [
  /xiaoxiao.*natural/i,
  /xiaoxiao.*neural/i,
  /xiaoyi.*neural/i,
  /yunxi.*neural/i,
  /xiaoxuan.*neural/i,
  /natural/i,
  /neural/i,
  /online/i,
  /xiaoxiao/i,
  /xiaoyi/i,
  /huihui/i,
  /yaoyao/i,
  /kangkang/i,
  /yunxi/i,
]

function scoreVoice(voice: SpeechSynthesisVoice): number {
  let score = 0
  const name = voice.name

  if (voice.lang === 'zh-CN' || voice.lang.startsWith('zh-CN')) score += 20
  else if (voice.lang.startsWith('zh')) score += 10

  if (voice.localService) score += 3

  for (let i = 0; i < VOICE_RANK_PATTERNS.length; i++) {
    if (VOICE_RANK_PATTERNS[i].test(name)) {
      score += (VOICE_RANK_PATTERNS.length - i) * 4
      break
    }
  }

  if (/natural|neural|online/i.test(name)) score += 8
  if (/xiaoxiao|xiaoyi|huihui|yaoyao/i.test(name)) score += 2

  return score
}

function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  const name = voice.name
  let short = name

  const msMatch = name.match(/Microsoft\s+(\S+)/i)
  if (msMatch) {
    const id = msMatch[1]
    const persona: Record<string, string> = {
      Xiaoxiao: '晓晓',
      Xiaoyi: '晓伊',
      Xiaoxuan: '晓萱',
      Huihui: '慧慧',
      Yaoyao: '瑶瑶',
      Yunxi: '云希',
      Yunjian: '云健',
      Kangkang: '康康',
    }
    const cn = persona[id] ?? id
    if (/natural|neural|online/i.test(name)) {
      short = `${cn} · 自然声线`
    } else if (/Desktop/i.test(name)) {
      short = `${cn} · 标准声线`
    } else {
      short = cn
    }
  } else if (/Google/i.test(name)) {
    short = name.replace(/Google\s+/i, 'Google · ')
  } else {
    short = name.split(' - ')[0].slice(0, 24)
  }

  return short
}

export function getChineseVoices(): VoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []

  const zhVoices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('zh'))
  if (zhVoices.length === 0) return []

  const sorted = [...zhVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a))
  const topScore = scoreVoice(sorted[0])

  return sorted.map((v) => {
    const recommended = scoreVoice(v) >= topScore - 1
    return {
      uri: v.voiceURI,
      label: recommended ? `${formatVoiceLabel(v)}（推荐）` : formatVoiceLabel(v),
      recommended,
    }
  })
}

function findVoice(uri: string | null): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  if (uri) {
    const matched = voices.find((v) => v.voiceURI === uri)
    if (matched) return matched
  }
  const zhVoices = voices.filter((v) => v.lang.startsWith('zh'))
  if (zhVoices.length === 0) return null
  return zhVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

function getSpeechRate(voice: SpeechSynthesisVoice | null): number {
  if (!voice) return 0.95
  if (/natural|neural|online/i.test(voice.name)) return 0.98
  return 0.92
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(VOICE_STORAGE_KEY) ?? ''
  })
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const resolveRef = useRef<(() => void) | null>(null)
  const selectedVoiceUriRef = useRef(selectedVoiceUri)

  selectedVoiceUriRef.current = selectedVoiceUri

  const loadVoices = useCallback(() => {
    const list = getChineseVoices()
    setVoices(list)

    if (list.length === 0) return

    const saved = selectedVoiceUriRef.current
    const savedValid = saved && list.some((v) => v.uri === saved)
    if (!savedValid) {
      const best = list.find((v) => v.recommended) ?? list[0]
      setSelectedVoiceUri(best.uri)
      localStorage.setItem(VOICE_STORAGE_KEY, best.uri)
    }
  }, [])

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
    setSupported(ok)
    if (!ok) return

    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      speechSynthesis.onvoiceschanged = null
    }
  }, [loadVoices])

  const selectVoice = useCallback((uri: string) => {
    setSelectedVoiceUri(uri)
    localStorage.setItem(VOICE_STORAGE_KEY, uri)
  }, [])

  const cancel = useCallback(() => {
    speechSynthesis.cancel()
    setSpeaking(false)
    resolveRef.current?.()
    resolveRef.current = null
  }, [])

  const speak = useCallback(
    (text: string, voiceUri?: string): Promise<void> => {
      if (!text.trim() || !supported) return Promise.resolve()

      cancel()

      return new Promise((resolve) => {
        const uri = voiceUri ?? selectedVoiceUriRef.current
        const voice = findVoice(uri)

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = voice?.lang ?? 'zh-CN'
        utterance.rate = getSpeechRate(voice)
        utterance.pitch = 1

        if (voice) utterance.voice = voice

        utterance.onstart = () => setSpeaking(true)
        utterance.onend = () => {
          setSpeaking(false)
          resolveRef.current = null
          resolve()
        }
        utterance.onerror = () => {
          setSpeaking(false)
          resolveRef.current = null
          resolve()
        }

        utteranceRef.current = utterance
        resolveRef.current = resolve
        speechSynthesis.speak(utterance)
      })
    },
    [supported, cancel],
  )

  const previewVoice = useCallback(
    (uri?: string) => {
      speak('你好，我是你的 AI 面试官，接下来我们开始模拟面试。', uri)
    },
    [speak],
  )

  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  return {
    speak,
    previewVoice,
    cancel,
    speaking,
    supported,
    voices,
    selectedVoiceUri,
    selectVoice,
  }
}

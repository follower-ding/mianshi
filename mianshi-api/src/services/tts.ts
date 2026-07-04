import { findDoubaoVoice } from '../data/tts-voices.js'

const TTS_API_KEY = process.env.TTS_API_KEY || process.env.VOLC_TTS_API_KEY
const TTS_API_BASE = process.env.TTS_API_BASE ?? 'openspeech.bytedance.com'
const TTS_ENDPOINT = `https://${TTS_API_BASE}/api/v3/tts/unidirectional/sse`
const DEFAULT_RESOURCE_ID = process.env.TTS_RESOURCE_ID ?? 'seed-tts-2.0'

export function isTtsConfigured(): boolean {
  return Boolean(TTS_API_KEY)
}

export function getTtsInfo() {
  return {
    configured: isTtsConfigured(),
    provider: 'doubao',
    apiBase: TTS_API_BASE,
  }
}

export async function synthesizeSpeech(
  text: string,
  speaker: string,
  resourceId?: string,
): Promise<Buffer> {
  if (!TTS_API_KEY) {
    throw new Error('TTS_API_KEY is not configured')
  }

  const voice = findDoubaoVoice(speaker)
  const resolvedResourceId = resourceId ?? voice?.resourceId ?? DEFAULT_RESOURCE_ID

  const body = {
    user: { uid: 'mianshi_user' },
    req_params: {
      text: text.trim(),
      speaker,
      sample_rate: 24000,
      audio_params: {
        format: 'mp3',
        speech_rate: 0,
        loudness_rate: 0,
        bit_rate: 64000,
      },
      additions: JSON.stringify({
        post_process: { pitch: 0 },
        disable_markdown_filter: true,
      }),
    },
  }

  const res = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': TTS_API_KEY,
      'X-Api-Resource-Id': resolvedResourceId,
      'X-Api-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`TTS request failed (${res.status}): ${errText}`)
  }

  const audioChunks: Buffer[] = []
  const raw = await res.text()

  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const payload = JSON.parse(line.slice(5).trim()) as {
        code?: number
        message?: string
        data?: string
      }
      const code = payload.code ?? 0
      if (code !== 0 && code !== 20000000) {
        throw new Error(payload.message ?? `TTS error code ${code}`)
      }
      if (payload.data) {
        audioChunks.push(Buffer.from(payload.data, 'base64'))
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('TTS error')) throw e
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('TTS returned no audio data')
  }

  return Buffer.concat(audioChunks)
}

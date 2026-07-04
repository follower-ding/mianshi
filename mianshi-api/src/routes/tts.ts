import { Hono } from 'hono'
import { z } from 'zod'
import { DOUBAO_VOICES } from '../data/tts-voices.js'
import { getTtsInfo, isTtsConfigured, synthesizeSpeech } from '../services/tts.js'
import { authMiddleware, type AuthVariables } from '../middleware/auth.js'

export const ttsRoutes = new Hono<{ Variables: AuthVariables }>()

const VALID_VOICES = new Set(DOUBAO_VOICES.map((v) => v.id))

const synthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  speaker: z.string().min(1).refine((s) => VALID_VOICES.has(s), {
    message: `Invalid speaker ID. Allowed: ${[...VALID_VOICES].slice(0, 5).join(', ')}...`,
  }),
  resourceId: z.string().optional(),
})

// Simple in-memory rate limiter: max 20 requests per IP per minute
const ttsRateMap = new Map<string, number[]>()
const TTS_RATE_LIMIT = 20
const TTS_RATE_WINDOW_MS = 60_000

function checkTtsRate(ip: string): boolean {
  const now = Date.now()
  const timestamps = ttsRateMap.get(ip)?.filter((t) => now - t < TTS_RATE_WINDOW_MS) ?? []
  if (timestamps.length >= TTS_RATE_LIMIT) return false
  timestamps.push(now)
  ttsRateMap.set(ip, timestamps)
  return true
}

// Periodically clean up expired rate entries
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of ttsRateMap) {
    const fresh = timestamps.filter((t) => now - t < TTS_RATE_WINDOW_MS)
    if (fresh.length === 0) ttsRateMap.delete(ip)
    else ttsRateMap.set(ip, fresh)
  }
}, 120_000)

ttsRoutes.get('/status', (c) => {
  return c.json(getTtsInfo())
})

ttsRoutes.get('/voices', (c) => {
  return c.json({
    voices: DOUBAO_VOICES,
    configured: isTtsConfigured(),
  })
})

ttsRoutes.post('/synthesize', authMiddleware, async (c) => {
  if (!isTtsConfigured()) {
    return c.json({ error: 'TTS_API_KEY 未配置，请在 mianshi-api/.env 中设置' }, 503)
  }

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  if (!checkTtsRate(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429)
  }

  const body = synthesizeSchema.parse(await c.req.json())

  try {
    const audio = await synthesizeSpeech(body.text, body.speaker, body.resourceId)
    return new Response(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : 'TTS synthesis failed' },
      502,
    )
  }
})

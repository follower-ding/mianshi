import { createHash } from 'node:crypto'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import OpenAI from 'openai'
import { isPgEnabled } from '../db/client.js'
import {
  getActivePromptVariants,
  getLlmCache,
  incrementMetricCounter,
  setLlmCache,
} from './store.js'

const apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY
const baseURL = process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1'
const model = process.env.LLM_MODEL ?? 'deepseek-chat'
const CACHE_TTL_MS = Number(process.env.LLM_CACHE_TTL_MS ?? 3600_000)

const memoryCache = new Map<string, { response: string; expiresAt: number; variant: string }>()
const stats = { hits: 0, misses: 0, errors: 0, variantUsage: {} as Record<string, number> }

function getClient() {
  if (!apiKey) throw new Error('LLM_API_KEY is not configured')
  return new OpenAI({ apiKey, baseURL })
}

export function isLlmConfigured(): boolean {
  return Boolean(apiKey)
}

export function getLlmInfo() {
  const provider = baseURL.includes('deepseek')
    ? 'deepseek'
    : baseURL.includes('openai')
      ? 'openai'
      : 'custom'
  return {
    provider,
    model,
    baseURL,
    configured: isLlmConfigured(),
    gateway: { cacheEnabled: true, abTesting: true },
  }
}

function hashMessages(messages: ChatCompletionMessageParam[], json?: boolean) {
  return createHash('sha256')
    .update(JSON.stringify({ messages, json, model }))
    .digest('hex')
}

async function pickPromptVariant() {
  const variants = await getActivePromptVariants()
  const total = variants.reduce((s, v) => s + v.weight, 0)
  let roll = Math.random() * total
  for (const v of variants) {
    roll -= v.weight
    if (roll <= 0) return v
  }
  return variants[0]
}

function applyVariantSuffix(
  messages: ChatCompletionMessageParam[],
  suffix: string,
): ChatCompletionMessageParam[] {
  if (!suffix) return messages
  return messages.map((m, i) =>
    i === 0 && m.role === 'system'
      ? { ...m, content: `${m.content}\n${suffix}` }
      : m,
  )
}

async function readCache(key: string) {
  const mem = memoryCache.get(key)
  if (mem && mem.expiresAt > Date.now()) {
    stats.hits++
    stats.variantUsage[mem.variant] = (stats.variantUsage[mem.variant] ?? 0) + 1
    return mem.response
  }
  if (isPgEnabled()) {
    const cached = await getLlmCache(key)
    if (cached) {
      stats.hits++
      stats.variantUsage[cached.prompt_variant] = (stats.variantUsage[cached.prompt_variant] ?? 0) + 1
      memoryCache.set(key, {
        response: cached.response,
        expiresAt: Date.now() + CACHE_TTL_MS,
        variant: cached.prompt_variant,
      })
      return cached.response
    }
  }
  stats.misses++
  return null
}

async function writeCache(key: string, response: string, variant: string) {
  memoryCache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS, variant })
  if (isPgEnabled()) {
    await setLlmCache(key, response, variant, CACHE_TTL_MS)
  }
}

export async function gatewayCompleteChat(
  messages: ChatCompletionMessageParam[],
  options?: { json?: boolean; maxTokens?: number; skipCache?: boolean },
) {
  const variant = await pickPromptVariant()
  const enriched = applyVariantSuffix(messages, variant.suffix)
  const cacheKey = hashMessages(enriched, options?.json)

  if (!options?.skipCache) {
    const cached = await readCache(cacheKey)
    if (cached) {
      await incrementMetricCounter('llm.cache_hit')
      return cached
    }
    await incrementMetricCounter('llm.cache_miss')
  }

  const client = getClient()
  const response = await client.chat.completions.create({
    model,
    messages: enriched,
    max_tokens: options?.maxTokens ?? 800,
    ...(options?.json ? { response_format: { type: 'json_object' as const } } : {}),
  })
  const text = response.choices[0]?.message?.content?.trim() ?? ''
  stats.variantUsage[variant.name] = (stats.variantUsage[variant.name] ?? 0) + 1

  if (text && !options?.skipCache) {
    await writeCache(cacheKey, text, variant.name)
  }
  await incrementMetricCounter('llm.request')
  return text
}

export async function* gatewayStreamChat(messages: ChatCompletionMessageParam[]) {
  const variant = await pickPromptVariant()
  const enriched = applyVariantSuffix(messages, variant.suffix)
  const client = getClient()
  const stream = await client.chat.completions.create({
    model,
    messages: enriched,
    max_tokens: 800,
    stream: true,
  })

  stats.variantUsage[variant.name] = (stats.variantUsage[variant.name] ?? 0) + 1
  await incrementMetricCounter('llm.stream')

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export async function tryGatewayCompleteChat(
  messages: ChatCompletionMessageParam[],
  options?: { json?: boolean; maxTokens?: number; skipCache?: boolean },
): Promise<string | null> {
  try {
    return await gatewayCompleteChat(messages, options)
  } catch (error) {
    stats.errors++
    const msg = error instanceof Error ? error.message : String(error)
    console.warn('[LLM Gateway] request failed:', msg)
    return null
  }
}

export type LlmProbeResult = {
  configured: boolean
  reachable: boolean | null
  latencyMs?: number
  error?: string
}

/** 短超时探测 LLM 是否可连通（配置存在 ≠ 调用成功） */
export async function probeLlmReachable(timeoutMs = 8000): Promise<LlmProbeResult> {
  if (!isLlmConfigured()) {
    return { configured: false, reachable: null }
  }
  const start = Date.now()
  try {
    const raw = await Promise.race([
      tryGatewayCompleteChat(
        [{ role: 'user', content: 'Reply JSON only: {"ok":true}' }],
        { json: true, maxTokens: 24, skipCache: true },
      ),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('LLM probe timeout')), timeoutMs),
      ),
    ])
    const latencyMs = Date.now() - start
    if (raw) return { configured: true, reachable: true, latencyMs }
    return { configured: true, reachable: false, latencyMs, error: 'empty response' }
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export function getGatewayStats() {
  const total = stats.hits + stats.misses
  return {
    hits: stats.hits,
    misses: stats.misses,
    errors: stats.errors,
    hitRate: total > 0 ? Math.round((stats.hits / total) * 1000) / 10 : 0,
    variantUsage: stats.variantUsage,
    memoryCacheSize: memoryCache.size,
  }
}

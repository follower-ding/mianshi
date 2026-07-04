/**
 * Boss 直聘防封策略 — 模拟真人节奏，检测风控后熔断暂停。
 *
 * 原则：
 * 1. 浏览器态操作优先（Cookie 含 wt2），避免 Node 裸请求
 * 2. 低频 + 随机间隔 + 每日上限
 * 3. 命中「环境异常」等风控信号立即熔断，冷却后再试
 */

const ANTI_BOT_PATTERNS = [/环境存在异常/, /环境异常/, /访问过于频繁/, /操作频繁/, /验证码/, /captcha/i]

/** 内存熔断（重启 API 后重置；生产可改 Redis） */
const circuitBreakers = new Map<
  string,
  { until: number; reason: string; hits: number }
>()

export type BossSafetyConfig = {
  /** 单次批量打招呼最多连续条数，之后需冷却 */
  maxGreetBurst: number
  /** 两次打招呼之间最小间隔 ms */
  greetDelayMinMs: number
  /** 两次打招呼之间最大间隔 ms */
  greetDelayMaxMs: number
  /** 批量会话冷却 ms（打完一轮 burst 后） */
  greetBurstCooldownMs: number
  /** 两次 API 抓取请求之间最小间隔 ms */
  crawlDelayMinMs: number
  crawlDelayMaxMs: number
  /** 风控熔断冷却 ms（默认 6 小时） */
  circuitCooldownMs: number
  /** 仅在此小时段内自动执行（本地时间，含头含尾） */
  activeHourStart: number
  activeHourEnd: number
}

export const DEFAULT_BOSS_SAFETY: BossSafetyConfig = {
  maxGreetBurst: 5,
  greetDelayMinMs: 8_000,
  greetDelayMaxMs: 18_000,
  greetBurstCooldownMs: 120_000,
  crawlDelayMinMs: 1_200,
  crawlDelayMaxMs: 2_500,
  circuitCooldownMs: 6 * 3600_000,
  activeHourStart: 9,
  activeHourEnd: 21,
}

/** 保守默认上限（新用户 / 未显式调高时） */
export const SAFE_DAILY_LIMITS = {
  dailyApplyLimit: 8,
  dailyRecommendLimit: 8,
  maxJobsAutoCrawl: 20,
  maxJobsManualCrawl: 30,
  maxManualCrawlsPerDay: 3,
}

export function isAntiBotError(message: string): boolean {
  return ANTI_BOT_PATTERNS.some((re) => re.test(message))
}

export function getCircuitBreaker(userId: string): { paused: boolean; reason?: string; until?: Date } {
  const cb = circuitBreakers.get(userId)
  if (!cb) return { paused: false }
  if (Date.now() < cb.until) {
    return { paused: true, reason: cb.reason, until: new Date(cb.until) }
  }
  circuitBreakers.delete(userId)
  return { paused: false }
}

export function tripCircuitBreaker(userId: string, reason: string, cooldownMs?: number) {
  const cfg = DEFAULT_BOSS_SAFETY
  const prev = circuitBreakers.get(userId)
  const hits = (prev?.hits ?? 0) + 1
  const extra = Math.min(hits * 3600_000, 12 * 3600_000)
  const until = Date.now() + (cooldownMs ?? cfg.circuitCooldownMs) + extra
  circuitBreakers.set(userId, { until, reason, hits })
  console.warn(`[BossSafety] circuit open user=${userId} until=${new Date(until).toISOString()} reason=${reason}`)
}

export function clearCircuitBreaker(userId: string) {
  circuitBreakers.delete(userId)
}

export function isWithinActiveHours(now = new Date(), cfg = DEFAULT_BOSS_SAFETY): boolean {
  const h = now.getHours()
  return h >= cfg.activeHourStart && h <= cfg.activeHourEnd
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs + 1))
  return new Promise((r) => setTimeout(r, ms))
}

export async function greetThrottle(
  indexInBurst: number,
  cfg = DEFAULT_BOSS_SAFETY,
): Promise<void> {
  if (indexInBurst > 0 && indexInBurst % cfg.maxGreetBurst === 0) {
    await randomDelay(cfg.greetBurstCooldownMs, cfg.greetBurstCooldownMs + 60_000)
    return
  }
  if (indexInBurst > 0) {
    await randomDelay(cfg.greetDelayMinMs, cfg.greetDelayMaxMs)
  }
}

export async function crawlThrottle(cfg = DEFAULT_BOSS_SAFETY): Promise<void> {
  await randomDelay(cfg.crawlDelayMinMs, cfg.crawlDelayMaxMs)
}

export function assertBossOperationAllowed(userId: string, opts?: { allowOffHours?: boolean }): {
  ok: boolean
  message?: string
} {
  const cb = getCircuitBreaker(userId)
  if (cb.paused) {
    return {
      ok: false,
      message: `Boss 操作已暂停至 ${cb.until?.toLocaleString('zh-CN')}（${cb.reason}）。请重新绑定或稍后再试，避免账号风控。`,
    }
  }
  if (!opts?.allowOffHours && !isWithinActiveHours()) {
    return {
      ok: false,
      message: `非活跃时段（建议 ${DEFAULT_BOSS_SAFETY.activeHourStart}:00–${DEFAULT_BOSS_SAFETY.activeHourEnd}:00）已暂停自动操作，可手动执行。`,
    }
  }
  return { ok: true }
}

export function clampToSafeLimits(pref: {
  dailyApplyLimit: number
  dailyRecommendLimit?: number
  maxJobsAutoCrawl?: number
  maxJobsManualCrawl?: number
  maxManualCrawlsPerDay?: number
}) {
  return {
    dailyApplyLimit: Math.min(pref.dailyApplyLimit, 30),
    dailyRecommendLimit: Math.min(pref.dailyRecommendLimit ?? 10, 15),
    maxJobsAutoCrawl: Math.min(pref.maxJobsAutoCrawl ?? 30, 50),
    maxJobsManualCrawl: Math.min(pref.maxJobsManualCrawl ?? 50, 80),
    maxManualCrawlsPerDay: Math.min(pref.maxManualCrawlsPerDay ?? 10, 10),
  }
}

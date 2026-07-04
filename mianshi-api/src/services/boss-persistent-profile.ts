import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 与 Python Worker BOSS_PROFILE_ROOT 对齐 */
export function getBossProfileRoot(): string {
  return (
    process.env.BOSS_PROFILE_ROOT ??
    join(__dirname, '../../../mianshi-worker/storage/profiles')
  )
}

export function getBossProfileDir(userId: string): string {
  return join(getBossProfileRoot(), `user_${userId}`)
}

/**
 * Node 侧：扫码成功后用 launchPersistentContext 初始化 Profile（Worker 未启动时的降级）
 */
export async function initPersistentProfileLocal(
  userId: string,
  cookieHeader: string,
): Promise<string> {
  const userDataDir = getBossProfileDir(userId)
  mkdirSync(userDataDir, { recursive: true })

  const { chromium } = await import('playwright')
  const headless = process.env.BOSS_CONNECT_HEADLESS !== 'false'
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  })

  try {
    const cookies = cookieHeader
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const eq = p.indexOf('=')
        if (eq <= 0) return null
        return {
          name: p.slice(0, eq).trim(),
          value: p.slice(eq + 1).trim(),
          domain: '.zhipin.com',
          path: '/',
        }
      })
      .filter(Boolean) as { name: string; value: string; domain: string; path: string }[]

    if (cookies.length) await context.addCookies(cookies)

    const page = context.pages()[0] ?? (await context.newPage())
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    await page.goto('https://www.zhipin.com', { waitUntil: 'domcontentloaded', timeout: 60000 })
  } finally {
    await context.close()
  }

  return userDataDir
}

export async function initPersistentProfile(
  userId: string,
  cookieHeader: string,
): Promise<string> {
  const { seedProfileViaWorker, isWorkerEnabled } = await import('./worker-client.js')

  if (isWorkerEnabled()) {
    try {
      return await seedProfileViaWorker(userId, cookieHeader)
    } catch (e) {
      console.warn('[boss-profile] Worker seed failed, fallback to local:', e)
    }
  }

  return initPersistentProfileLocal(userId, cookieHeader)
}

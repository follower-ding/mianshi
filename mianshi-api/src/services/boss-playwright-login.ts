import {
  createBossConnectSession,
  getBossConnectSession,
  markBossConnectConsumed,
  peekBossConnectCookies,
  updateBossConnectSession,
} from './boss-connect-store.js'
import { testBossSession } from './boss-client.js'
import { saveBossSession, updateBossSessionProfile } from './boss-session-store.js'
import { initPersistentProfile } from './boss-persistent-profile.js'
import { upsertJobPreference } from './job-preferences-store.js'
import {
  cancelDrissionLogin,
  checkDrissionAvailable,
  refreshDrissionLogin,
  runDrissionBossLogin,
  syncDrissionLoginStatus,
  getDrissionLoginMeta,
} from './boss-drission-login.js'

const BOSS_LOGIN_URL = 'https://www.zhipin.com/web/user/?ka=header-login'

const BOSS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let playwrightAvailable: boolean | null = null

export async function checkPlaywrightAvailable(): Promise<boolean> {
  if (playwrightAvailable !== null) return playwrightAvailable
  try {
    const pw = await import('playwright')
    try {
      const { chromium } = pw
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
      await browser.close()
      playwrightAvailable = true
    } catch {
      playwrightAvailable = false
    }
  } catch {
    playwrightAvailable = false
  }
  return playwrightAvailable
}

type ActiveBrowserInstance = {
  connectId: string
  browser: import('playwright').Browser
  context: import('playwright').BrowserContext
  page: import('playwright').Page
}

const activeBrowsers = new Map<string, ActiveBrowserInstance>()

/** 防止并发 runRealBossLogin 互相 closeAll 导致空白僵尸窗口 */
let loginJobConnectId: string | null = null

async function closeBrowser(connectId: string) {
  const inst = activeBrowsers.get(connectId)
  if (!inst) return
  activeBrowsers.delete(connectId)
  await inst.browser.close().catch(() => {})
}

async function closeAllBossBrowsers() {
  const ids = [...activeBrowsers.keys()]
  await Promise.all(ids.map((id) => closeBrowser(id)))
}

/** 在 context 级注入，确保每个页面加载前抹除自动化指纹 */
async function injectStealthScripts(context: import('playwright').BrowserContext) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    })
  })
}

function pageAlive(page: import('playwright').Page): boolean {
  try {
    return !page.isClosed()
  } catch {
    return false
  }
}

/** 截取登录区域；不点击「APP扫码」文字（会导致白屏） */
async function captureLoginPreview(page: import('playwright').Page): Promise<string | undefined> {
  if (!pageAlive(page)) return undefined

  const panelSelectors = [
    '.sign-form',
    '.login-container',
    '.login-wrap',
    '[class*="sign-wrapper"]',
    '[class*="login-box"]',
    'main',
  ]
  for (const sel of panelSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.count()) {
        const buf = await el.screenshot({ type: 'png', timeout: 10_000 })
        return `data:image/png;base64,${buf.toString('base64')}`
      }
    } catch {
      /* next */
    }
  }

  try {
    const buf = await page.screenshot({ type: 'png', fullPage: false, timeout: 10_000 })
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

/** 点击登录框右上角图标切换二维码（勿点文字标签） */
async function trySwitchToQrMode(page: import('playwright').Page): Promise<boolean> {
  if (!pageAlive(page)) return false
  const form = page.locator('[class*="sign-form"], .sign-form, [class*="login-form"]').first()
  if (!(await form.count())) return false
  const box = await form.boundingBox()
  if (!box) return false
  try {
    await page.mouse.click(box.x + box.width - 36, box.y + 36)
    await page.waitForTimeout(3000)
    return (await page.locator('canvas').count()) > 0
  } catch {
    return false
  }
}

async function captureQrImage(page: import('playwright').Page): Promise<string | undefined> {
  if (!pageAlive(page)) return undefined

  await trySwitchToQrMode(page)

  if (await page.locator('canvas').count() > 0) {
    try {
      const buf = await page.locator('canvas').first().screenshot({ timeout: 10_000 })
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      /* fall through */
    }
  }

  return captureLoginPreview(page)
}

async function tryCaptureLoginFromContext(
  context: import('playwright').BrowserContext,
  connectId: string,
): Promise<boolean | 'closed'> {
  try {
    const cookies = await context.cookies(['https://www.zhipin.com', 'https://login.zhipin.com'])
    const cookieHeader = cookies.map((co) => `${co.name}=${co.value}`).join('; ')
    const hasAuth = cookies.some(
      (co) =>
        co.name === 'wt2' ||
        co.name === 'zp_token' ||
        co.name === '__zp_stoken__' ||
        co.name === 'geek_zp_token',
    )
    if (!hasAuth || cookieHeader.length < 30) return false
    const check = await testBossSession(cookieHeader)
    if (!check.valid) return false
    await updateBossConnectSession(connectId, {
      status: 'success',
      cookieHeader,
      bossName: check.name,
      bossUid: check.uid,
    })
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/closed|disposed|destroyed/i.test(msg)) return 'closed'
    return false
  }
}

async function pollLoginCookies(
  context: import('playwright').BrowserContext,
  connectId: string,
  deadline: number,
  onRefresh?: () => Promise<void>,
) {
  let lastRefresh = Date.now()
  while (Date.now() < deadline) {
    if (!activeBrowsers.has(connectId)) return false

    const captured = await tryCaptureLoginFromContext(context, connectId)
    if (captured === true) return true
    if (captured === 'closed') return false

    if (onRefresh && Date.now() - lastRefresh > 30_000) {
      lastRefresh = Date.now()
      await onRefresh().catch(() => {})
    }

    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

async function publishPreviewToSession(page: import('playwright').Page, connectId: string): Promise<boolean> {
  const img = await captureQrImage(page)
  if (!img) return false
  await updateBossConnectSession(connectId, {
    qrImageBase64: img,
    status: 'waiting_scan',
    error: undefined,
  })
  return true
}

async function navigateToBossLogin(page: import('playwright').Page): Promise<void> {
  const loginSelectors =
    '.sign-form, [class*="sign-form"], [class*="login-wrap"], [class*="login-box"], #wrap, body'

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await page.goto(BOSS_LOGIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
        referer: 'https://www.zhipin.com/',
      })
      if (res && res.status() >= 400) {
        throw new Error(`HTTP ${res.status()}`)
      }
      await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {})
      await page.waitForSelector(loginSelectors, { timeout: 12_000 }).catch(() => {})

      const url = page.url()
      const onBossLogin =
        url.includes('login.zhipin.com') ||
        (url.includes('zhipin.com') && !url.startsWith('about:'))

      if (onBossLogin && !isBlankLoginPage(page)) {
        console.log('[boss-connect] login page ready:', url, await page.title())
        return
      }
      throw new Error(`unexpected url: ${url}`)
    } catch (e) {
      console.warn('[boss-connect] goto attempt failed:', attempt + 1, e)
    }
    await page.waitForTimeout(1500)
  }

  throw new Error('Boss 登录页加载失败，请检查网络或稍后重试')
}

function isBlankLoginPage(page: import('playwright').Page): boolean {
  try {
    const url = page.url()
    return url === 'about:blank' || url.startsWith('about:')
  } catch {
    return true
  }
}

type LaunchOptions = {
  headless: boolean
}

/**
 * 启动隔离浏览器（launch + newContext + newPage）。
 * newPage 后立即 goto，避免用户长时间看到 about:blank。
 */
export async function launchRealBossBrowser(
  connectId: string,
  options: LaunchOptions = { headless: false },
): Promise<import('playwright').Page> {
  const { chromium } = await import('playwright')

  await closeBrowser(connectId)

  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
  ]

  // 优先 Playwright 自带 Chromium（headed 下比 channel:chrome 更少空白页问题）
  const channels: (string | undefined)[] = [
    process.env.BOSS_CONNECT_CHANNEL,
    undefined,
    'chrome',
    'msedge',
  ].filter((c, i, a) => c === undefined || a.indexOf(c) === i)

  let browser: import('playwright').Browser | undefined
  let context: import('playwright').BrowserContext | undefined

  for (const channel of channels) {
    try {
      browser = await chromium.launch({
        headless: options.headless,
        ...(channel ? { channel } : {}),
        ignoreDefaultArgs: ['--enable-automation'],
        args: launchArgs,
      })
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: BOSS_USER_AGENT,
        locale: 'zh-CN',
        ignoreHTTPSErrors: true,
      })
      break
    } catch (e) {
      console.warn('[boss-connect] launch channel failed:', channel ?? 'chromium', e)
      await browser?.close().catch(() => {})
      browser = undefined
      context = undefined
    }
  }

  if (!browser || !context) {
    throw new Error('无法启动 Chrome。请安装 Google Chrome 或 Microsoft Edge')
  }

  await injectStealthScripts(context)

  for (const extra of context.pages()) {
    await extra.close().catch(() => {})
  }

  const page = await context.newPage()

  // 第一动作即导航，避免窗口停在 about:blank
  await navigateToBossLogin(page)
  if (!options.headless) {
    await page.bringToFront()
  }

  activeBrowsers.set(connectId, { connectId, browser, context, page })
  return page
}

async function openBossLoginPage(
  connectId: string,
): Promise<{ page: import('playwright').Page; context: import('playwright').BrowserContext; headed: boolean }> {
  const tryHeaded = process.env.BOSS_CONNECT_HEADED === 'true'

  if (tryHeaded) {
    try {
      const page = await launchRealBossBrowser(connectId, { headless: false })
      if (!isBlankLoginPage(page)) {
        return { page, context: activeBrowsers.get(connectId)!.context, headed: true }
      }
      console.warn('[boss-connect] headed page still blank, fallback to headless')
      await closeBrowser(connectId)
    } catch (e) {
      console.warn('[boss-connect] headed launch failed, fallback to headless:', e)
      await closeBrowser(connectId)
    }
  }

  const page = await launchRealBossBrowser(connectId, { headless: true })
  if (isBlankLoginPage(page)) {
    throw new Error('Boss 登录页无法加载')
  }
  return { page, context: activeBrowsers.get(connectId)!.context, headed: false }
}

/** 真实登录：优先 DrissionPage 子进程，失败则 Playwright headless 兜底 */
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function runRealBossLogin(connectId: string) {
  if (loginJobConnectId && loginJobConnectId !== connectId) {
    console.warn('[boss-connect] skip duplicate job, active:', loginJobConnectId)
    return
  }
  loginJobConnectId = connectId

  try {
    if (await checkDrissionAvailable()) {
      console.log('[boss-connect] using DrissionPage subprocess')
      const res = await runDrissionBossLogin(connectId)
      if (res.ok) {
        await sleep(2500)
        await syncDrissionLoginStatus(connectId)
        const s = await getBossConnectSession(connectId)
        if (s?.status !== 'failed') return
        console.warn('[boss-connect] DrissionPage subprocess failed, fallback playwright:', s.error)
        await updateBossConnectSession(connectId, { status: 'waiting_scan', error: undefined })
      } else {
        console.warn('[boss-connect] DrissionPage start failed:', res.message)
      }
    }

    if (activeBrowsers.size > 0) {
      await closeAllBossBrowsers()
    }

    const { page, context, headed } = await openBossLoginPage(connectId)
    console.log('[boss-connect] fallback playwright mode:', headed ? 'headed' : 'headless-qr')

    await updateBossConnectSession(connectId, { status: 'waiting_scan', error: undefined })

    await publishPreviewToSession(page, connectId)

    if (await tryCaptureLoginFromContext(context, connectId) === true) {
      await closeBrowser(connectId)
      return
    }

    const deadline = Date.now() + 5 * 60 * 1000
    const ok = await pollLoginCookies(context, connectId, deadline, async () => {
      if (!pageAlive(page)) return
      if (page.url() === 'about:blank') {
        await navigateToBossLogin(page).catch(() => {})
      }
      await publishPreviewToSession(page, connectId)
    })

    if (!ok) {
      const s = await getBossConnectSession(connectId)
      if (s?.status === 'waiting_scan') {
        await updateBossConnectSession(connectId, {
          status: 'failed',
          error: '扫码登录超时。请在弹出窗口或弹窗内二维码完成 Boss App 扫码',
        })
      }
    }
    await closeBrowser(connectId)
  } catch (e) {
    await updateBossConnectSession(connectId, {
      status: 'failed',
      error: e instanceof Error ? e.message : 'Boss 登录启动失败',
    })
    await closeBrowser(connectId)
  } finally {
    if (loginJobConnectId === connectId) loginJobConnectId = null
  }
}

export async function startBossConnectLogin(userId?: string, _requestOrigin?: string) {
  const session = await createBossConnectSession(userId)

  await updateBossConnectSession(session.id, { status: 'waiting_scan', error: undefined })

  const base = {
    connectId: session.id,
    bossLoginUrl: BOSS_LOGIN_URL,
  }

  if (!(await checkPlaywrightAvailable()) && !(await checkDrissionAvailable())) {
    return {
      ...base,
      mode: 'browser' as const,
      browserLaunched: false,
      message: 'Boss 登录未就绪',
      installHint: 'mianshi-worker: pip install DrissionPage；或 mianshi-api: npx playwright install chromium',
    }
  }

  void runRealBossLogin(session.id)
  return {
    ...base,
    mode: 'browser' as const,
    browserLaunched: true,
    message: '已启动 Chrome 登录（DrissionPage），请用 Boss App 扫码',
  }
}

export async function refreshBossConnectQr(connectId: string) {
  await closeAllBossBrowsers()
  await cancelDrissionLogin(connectId)
  const s = await getBossConnectSession(connectId)
  if (!s) return { ok: false, message: '连接已过期' }
  await updateBossConnectSession(connectId, { status: 'waiting_scan', qrImageBase64: undefined, error: undefined })

  if (await checkDrissionAvailable()) {
    const res = await refreshDrissionLogin(connectId)
    return { ok: res.ok, message: res.message }
  }

  if (!(await checkPlaywrightAvailable())) {
    return { ok: false, message: 'Playwright 未就绪' }
  }

  void runRealBossLogin(connectId)
  return { ok: true, message: '正在重新打开登录窗口…' }
}

export async function getBossConnectStatus(connectId: string) {
  await syncDrissionLoginStatus(connectId)

  const s = await getBossConnectSession(connectId)
  if (!s) return { status: 'expired' as const }

  const drissionMeta = getDrissionLoginMeta(connectId)

  return {
    status: s.status,
    qrImageBase64: s.qrImageBase64,
    loginUrl: s.loginUrl ?? BOSS_LOGIN_URL,
    bossName: s.bossName,
    error: s.error,
    inProgress: s.status === 'waiting_scan' || s.status === 'pending',
    loggedInPending: drissionMeta.loggedInPending,
    playwright: playwrightAvailable ?? false,
    hasPreview: Boolean(s.qrImageBase64),
  }
}

export async function cancelBossConnect(connectId: string) {
  await closeBrowser(connectId)
  await cancelDrissionLogin(connectId)
  await updateBossConnectSession(connectId, { status: 'expired' })
}

export async function completeBossConnectForUser(connectId: string, userId: string) {
  const peek = await peekBossConnectCookies(connectId, userId)
  if (!peek) {
    return { ok: false as const, message: 'Boss 连接未就绪或已过期，请重新绑定' }
  }
  const check = await testBossSession(peek.cookieHeader)
  if (!check.valid) {
    return { ok: false as const, message: check.message ?? 'Boss 登录态无效，请重新绑定' }
  }
  await saveBossSession(userId, peek.cookieHeader, {
    bossUid: check.uid,
    bossName: check.name,
    status: 'active',
  })
  try {
    const profileDir = await initPersistentProfile(userId, peek.cookieHeader)
    await updateBossSessionProfile(userId, profileDir)
  } catch (e) {
    console.warn('[completeBossConnect] profile init failed:', e)
  }
  await upsertJobPreference(userId, {})
  const { purgeDemoMatchesForUser } = await import('./job-matches-store.js')
  try {
    const purged = await purgeDemoMatchesForUser(userId)
    if (purged.matches + purged.applications + purged.chats > 0) {
      console.log(`[completeBossConnect] purged demo data for ${userId}:`, purged)
    }
  } catch (e) {
    console.warn('[completeBossConnect] purge demo failed:', e)
  }
  await markBossConnectConsumed(connectId, userId)
  return { ok: true as const, bossName: check.name, message: 'Boss 绑定成功' }
}

import type { JobPosting } from '../types/entities.js'

const BOSS_ORIGIN = 'https://www.zhipin.com'

export type BossUserInfo = {
  uid?: string
  name?: string
  valid: boolean
  message?: string
}

export type BossApplyResult = {
  ok: boolean
  status: 'sent' | 'failed'
  message: string
  securityId?: string
}

export type BossChatCategory = 'new_greeting' | 'communicating'

export type BossChatItem = {
  jobId?: string
  company?: string
  title?: string
  lastMessage?: string
  unread?: number
  hrName?: string
  salary?: string
  updatedAt?: string
  /** Boss 消息分类：新招呼 / 仅沟通 */
  category?: BossChatCategory
  relationType?: number
}

export type BossChatMessageItem = {
  id: string
  role: 'hr' | 'user' | 'ai'
  content: string
  sentAt: string
  intent?: string
  aiSuggested?: boolean
}

function resolveChatCategory(relationType: number, unread: number): BossChatCategory {
  // Boss 常见 relationType：6=新招呼，5/1/3=沟通中（不同版本可能略有差异）
  if (relationType === 6 || relationType === 2) return 'new_greeting'
  if ([5, 1, 3, 4].includes(relationType)) return 'communicating'
  return unread > 0 ? 'new_greeting' : 'communicating'
}

function mapGeekFriendItem(raw: Record<string, unknown>): BossChatItem | null {
  const jobId = String(raw.encryptJobId ?? raw.jobId ?? '')
  if (!jobId) return null
  const lastInfo = raw.lastMessageInfo as Record<string, unknown> | undefined
  const relationType = Number(raw.relationType ?? raw.friendSource ?? 0)
  const unread = Number(raw.unreadMsgCount ?? raw.unreadCount ?? 0)
  const ts = Number(raw.updateTime ?? lastInfo?.time ?? Date.now())
  return {
    jobId,
    company: String(raw.brandName ?? raw.companyName ?? ''),
    title: String(raw.jobName ?? raw.title ?? ''),
    hrName: String(raw.name ?? raw.bossName ?? 'HR'),
    lastMessage: String(lastInfo?.msg ?? lastInfo?.body ?? raw.lastMsg ?? raw.lastMessage ?? ''),
    unread,
    salary: String(raw.salaryDesc ?? raw.salary ?? ''),
    updatedAt: new Date(ts).toISOString(),
    relationType,
    category: resolveChatCategory(relationType, unread),
  }
}

function mapChatListItem(raw: Record<string, unknown>): BossChatItem | null {
  const jobId = String(raw.jobId ?? raw.encryptJobId ?? '')
  if (!jobId) return null
  const relationType = Number(raw.relationType ?? 0)
  const unread = Number(raw.unreadCount ?? 0)
  return {
    jobId,
    company: String(raw.companyName ?? raw.brandName ?? ''),
    title: String(raw.jobName ?? raw.title ?? ''),
    hrName: String(raw.bossName ?? raw.name ?? 'HR'),
    lastMessage: String(raw.lastMsg ?? raw.lastMessage ?? ''),
    unread,
    relationType,
    category: resolveChatCategory(relationType, unread),
  }
}

export function normalizeCookieHeader(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as { cookie?: string }
      if (obj.cookie) return obj.cookie.trim()
    } catch {
      /* fall through */
    }
  }
  return trimmed.replace(/^cookie:\s*/i, '')
}

/** Boss 登录态关键 Cookie（HttpOnly，书签复制常缺失 wt2） */
export function hasBossAuthCookie(cookieHeader: string): boolean {
  const c = normalizeCookieHeader(cookieHeader)
  return /\bwt2=/.test(c) || /\b__zp_stoken__=/.test(c) || /\bgeek_zp_token=/.test(c)
}

export function isRealBossCookie(cookieHeader: string): boolean {
  const c = normalizeCookieHeader(cookieHeader)
  return Boolean(c) && hasBossAuthCookie(c)
}

export function mapBossApiError(message: string): string {
  if (/环境存在异常|环境异常/.test(message)) {
    return 'Boss 检测到服务端请求（环境异常）：请用 Chrome 登录 Boss 后复制完整 Cookie（须含 wt2），或使用 Drission 扫码重新绑定'
  }
  if (/未登录|登录/.test(message)) {
    return 'Boss 登录已失效，请重新绑定'
  }
  return message
}

function bossRequestHeaders(cookie: string, referer?: string): Record<string, string> {
  return {
    Cookie: cookie,
    Referer: referer ?? `${BOSS_ORIGIN}/web/geek/jobs`,
    Origin: BOSS_ORIGIN,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  }
}

export async function bossFetch(
  path: string,
  cookieHeader: string,
  init?: RequestInit & { form?: Record<string, string>; referer?: string },
) {
  const cookie = normalizeCookieHeader(cookieHeader)
  const url = path.startsWith('http') ? path : `${BOSS_ORIGIN}${path}`
  const headers: Record<string, string> = {
    ...bossRequestHeaders(cookie, init?.referer),
    ...(init?.headers as Record<string, string>),
  }

  let body = init?.body
  if (init?.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(init.form).toString()
  }

  const res = await fetch(url, { ...init, headers, body })
  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    json = null
  }
  return { res, text, json }
}

export async function testBossSession(cookieHeader: string): Promise<BossUserInfo> {
  const cookie = normalizeCookieHeader(cookieHeader)
  if (!cookie || cookie.length < 10) {
    return { valid: false, message: 'Cookie 为空或过短' }
  }

  if (!hasBossAuthCookie(cookie)) {
    return { valid: false, message: 'Cookie 缺少 wt2，请用 Drission 扫码重新绑定 Boss' }
  }

  const endpoints = [
    '/wapi/zpuser/wap/getUserInfo.json',
    '/wapi/zpgeek/common/data/getUserInfo.json',
  ]

  try {
    for (const path of endpoints) {
      const { json, text } = await bossFetch(path, cookie)
      if (json && json.code === 0) {
        const zpData = json.zpData as Record<string, unknown> | undefined
        if (zpData) {
          return {
            valid: true,
            uid: String(zpData?.userId ?? zpData?.encryptUserId ?? ''),
            name: String(zpData?.name ?? zpData?.showName ?? 'Boss 用户'),
            message: '已连接',
          }
        }
      }
      if (json?.code === 7) {
        return { valid: false, message: '未登录或会话失效' }
      }
      if (json?.message && path === endpoints[endpoints.length - 1]) {
        return { valid: false, message: mapBossApiError(String(json.message)) }
      }
      if (text.includes('登录') || text.includes('login')) {
        return { valid: false, message: 'Cookie 已失效，请重新登录 Boss 后绑定' }
      }
    }
    return { valid: false, message: '无法验证 Boss 登录态' }
  } catch (e) {
    return { valid: false, message: e instanceof Error ? e.message : '网络错误' }
  }
}

export async function fetchBossJobDetailHtml(cookieHeader: string, externalId: string): Promise<string> {
  const { text } = await bossFetch(`/job_detail/${externalId}.html`, cookieHeader)
  return text
}

/** 优先 JSON 详情接口，失败再解析 HTML */
export async function fetchBossJobMeta(
  cookieHeader: string,
  externalId: string,
): Promise<Record<string, string>> {
  const referer = `${BOSS_ORIGIN}/job_detail/${externalId}.html`
  const endpoints: Array<{ path: string; method?: string; form?: Record<string, string> }> = [
    { path: `/wapi/zpgeek/job/detail.json?jobId=${encodeURIComponent(externalId)}`, method: 'GET' },
    {
      path: '/wapi/zpgeek/job/detail.json',
      method: 'POST',
      form: { jobId: externalId, securityId: '', lid: '' },
    },
    {
      path: '/wapi/zpgeek/job/card.json',
      method: 'POST',
      form: { jobId: externalId, securityId: '', lid: '' },
    },
  ]

  for (const ep of endpoints) {
    try {
      const { json } = await bossFetch(ep.path, cookieHeader, {
        method: ep.method ?? 'GET',
        form: ep.form,
        referer,
      })
      if (json?.code === 0) {
        const meta = extractMetaFromBossJson(json as Record<string, unknown>, externalId)
        if (meta.securityId) return meta
      }
    } catch {
      /* try next */
    }
  }

  const html = await fetchBossJobDetailHtml(cookieHeader, externalId)
  return parseBossMetaFromHtml(html)
}

function extractMetaFromBossJson(json: Record<string, unknown>, externalId: string): Record<string, string> {
  const zp = (json.zpData ?? json) as Record<string, unknown>
  const jobInfo = (zp.jobInfo ?? zp.job ?? zp) as Record<string, unknown>
  const meta: Record<string, string> = {
    jobId: String(jobInfo.encryptJobId ?? jobInfo.jobId ?? externalId),
  }
  const securityId = String(
    jobInfo.securityId ?? zp.securityId ?? json.securityId ?? '',
  )
  const lid = String(jobInfo.lid ?? zp.lid ?? '')
  if (securityId && securityId !== 'undefined') meta.securityId = securityId
  if (lid && lid !== 'undefined') meta.lid = lid
  return meta
}

export function parseBossMetaFromHtml(html: string): Record<string, string> {
  const meta: Record<string, string> = {}
  const patterns: [string, RegExp][] = [
    ['securityId', /"securityId"\s*:\s*"([^"]+)"/],
    ['securityId', /'securityId'\s*:\s*'([^']+)'/],
    ['securityId', /securityId\\":\\"([^"\\]+)/],
    ['jobId', /"encryptJobId"\s*:\s*"([^"]+)"/],
    ['jobId', /"jobId"\s*:\s*"([^"]+)"/],
    ['lid', /"lid"\s*:\s*"([^"]+)"/],
  ]
  for (const [key, re] of patterns) {
    if (meta[key]) continue
    const m = html.match(re)
    if (m?.[1]) meta[key] = m[1]
  }
  return meta
}

export async function sendBossGreeting(
  cookieHeader: string,
  job: JobPosting,
  greeting: string,
  bossMeta?: Record<string, string>,
): Promise<BossApplyResult> {
  const cookie = normalizeCookieHeader(cookieHeader)

  if (!hasBossAuthCookie(cookie)) {
    return {
      ok: false,
      status: 'failed',
      message:
        'Cookie 缺少 wt2，无法调用 Boss 打招呼接口。请重新绑定（Chrome 复制完整 Cookie 或 Drission 扫码）',
    }
  }

  if (!job.externalId) {
    return { ok: false, status: 'failed', message: '缺少 Boss 岗位 ID' }
  }

  if (job.externalId.startsWith('demo-') || job.jd?.includes('演示数据')) {
    return { ok: false, status: 'failed', message: '无效岗位数据，请重新抓取后打招呼' }
  }

  let meta = bossMeta ?? {}
  if (!meta.securityId) {
    meta = { ...meta, ...(await fetchBossJobMeta(cookie, job.externalId)) }
  }

  const jobId = meta.jobId ?? job.externalId
  const securityId = meta.securityId
  if (!securityId) {
    return {
      ok: false,
      status: 'failed',
      message:
        '无法解析 Boss securityId，请重新抓取该岗位后再打招呼',
    }
  }

  const { json } = await bossFetch('/wapi/zpgeek/friend/add.json', cookie, {
    method: 'POST',
    referer: `${BOSS_ORIGIN}/job_detail/${job.externalId}.html`,
    form: {
      jobId,
      securityId,
      lid: meta.lid ?? '',
      greet: greeting.slice(0, 500),
    },
  })

  if (json?.code === 0) {
    return { ok: true, status: 'sent', message: 'Boss 打招呼已发送', securityId }
  }

  const msg = mapBossApiError(String(json?.message ?? json?.zpData ?? 'Boss 接口返回失败'))
  if (/已沟通|已发送|重复/.test(msg)) {
    return { ok: true, status: 'sent', message: msg, securityId }
  }
  return { ok: false, status: 'failed', message: msg, securityId }
}

export async function sendBossChatReply(
  cookieHeader: string,
  encryptJobId: string,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  if (!hasBossAuthCookie(normalizeCookieHeader(cookieHeader))) {
    return { ok: false, message: 'Cookie 无效，请重新绑定 Boss' }
  }
  try {
    const { json } = await bossFetch('/wapi/zpgeek/chat/send.json', cookieHeader, {
      method: 'POST',
      form: {
        jobId: encryptJobId,
        message: message.slice(0, 500),
      },
    })
    if (json?.code === 0) return { ok: true, message: '回复已发送' }
    return { ok: false, message: String(json?.message ?? '发送失败') }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '网络错误' }
  }
}

export async function fetchBossChatList(cookieHeader: string): Promise<{
  items: BossChatItem[]
  error?: string
}> {
  if (!hasBossAuthCookie(cookieHeader)) {
    return {
      items: [],
      error: 'Cookie 缺少 wt2，无法拉取 Boss 会话。请重新绑定',
    }
  }

  const merged = new Map<string, BossChatItem>()
  let lastError: string | undefined

  try {
    for (let page = 1; page <= 3; page++) {
      const { json } = await bossFetch(
        `/wapi/zprelation/friend/getGeekFriendList.json?page=${page}&pageSize=50`,
        cookieHeader,
        { method: 'GET', referer: `${BOSS_ORIGIN}/web/geek/chat` },
      )
      if (!json || json.code !== 0) {
        lastError = mapBossApiError(String(json?.message ?? '会话列表拉取失败'))
        break
      }
      const list = (json.zpData as Record<string, unknown>)?.result as unknown[] | undefined
      if (!Array.isArray(list) || list.length === 0) break
      for (const raw of list) {
        const item = mapGeekFriendItem(raw as Record<string, unknown>)
        if (item?.jobId) merged.set(item.jobId, item)
      }
      if (list.length < 50) break
    }
  } catch {
    /* fallback below */
  }

  if (merged.size === 0) {
    try {
      const { json } = await bossFetch('/wapi/zpgeek/chat/geek/chatList.json', cookieHeader, {
        method: 'GET',
        referer: `${BOSS_ORIGIN}/web/geek/chat`,
      })
      if (json && json.code === 0) {
        const list = (json.zpData as Record<string, unknown>)?.result as unknown[] | undefined
        if (Array.isArray(list)) {
          for (const raw of list) {
            const item = mapChatListItem(raw as Record<string, unknown>)
            if (item?.jobId) merged.set(item.jobId, item)
          }
        }
      } else if (json?.message) {
        lastError = mapBossApiError(String(json.message))
      }
    } catch {
      /* keep partial */
    }
  }

  return {
    items: [...merged.values()].slice(0, 100),
    error: merged.size === 0 ? lastError : undefined,
  }
}

export async function fetchBossChatMessages(
  cookieHeader: string,
  encryptJobId: string,
): Promise<BossChatMessageItem[]> {
  if (!hasBossAuthCookie(normalizeCookieHeader(cookieHeader))) {
    return []
  }
  try {
    const { json } = await bossFetch(
      `/wapi/zpgeek/chat/geek/historyMsg.json?jobId=${encodeURIComponent(encryptJobId)}`,
      cookieHeader,
      { method: 'GET' },
    )
    if (!json || json.code !== 0) return []
    const list = (json.zpData as Record<string, unknown>)?.messages as unknown[] | undefined
    if (!Array.isArray(list)) return []
    return list.map((raw, i) => {
      const item = raw as Record<string, unknown>
      const fromHr = item.fromUserType === 1 || item.msgFrom === 'boss'
      return {
        id: String(item.mid ?? item.msgId ?? i),
        role: fromHr ? 'hr' : 'user',
        content: String(item.body ?? item.text ?? ''),
        sentAt: new Date(Number(item.time ?? item.timestamp ?? Date.now())).toISOString(),
      } satisfies BossChatMessageItem
    })
  } catch {
    return []
  }
}

export async function fetchBossJobListWithSession(
  cookieHeader: string,
  query: string,
  cityCode: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!hasBossAuthCookie(normalizeCookieHeader(cookieHeader))) {
    return { ok: false, message: 'Cookie 无效' }
  }
  try {
    const { json } = await bossFetch('/wapi/zpgeek/search/joblist.json', cookieHeader, {
      method: 'POST',
      form: {
        scene: '1',
        query,
        city: cityCode,
        page: '1',
        pageSize: '30',
      },
    })
    if (json?.code === 0) return { ok: true }
    return { ok: false, message: String(json?.message ?? '抓取失败') }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '网络错误' }
  }
}

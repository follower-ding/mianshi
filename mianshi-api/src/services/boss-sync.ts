import { getBossSession } from './boss-session-store.js'
import { fetchBossChatList, isRealBossCookie, sendBossGreeting } from './boss-client.js'
import { getJobPosting, listJobApplications, updateJobApplication, updateJobBossMeta } from './jobs-store.js'
import { isAntiBotError, tripCircuitBreaker, assertBossOperationAllowed } from './boss-safety.js'
import { isPgEnabled } from '../db/client.js'
import { isWorkerEnabled, sendGreetViaWorker } from './worker-client.js'

export async function applyViaBossSession(
  userId: string,
  jobId: string,
  greeting: string,
  applicationId: string,
) {
  const session = await getBossSession(userId)
  if (!session || session.status !== 'active') {
    await updateJobApplication(applicationId, {
      bossApplyStatus: 'failed',
      bossApplyError: '未绑定 Boss 登录态，请先绑定',
    })
    return { ok: false, inApp: false, message: '未绑定 Boss' }
  }

  const job = await getJobPosting(jobId)
  if (!job) {
    await updateJobApplication(applicationId, { bossApplyStatus: 'failed', bossApplyError: '岗位不存在' })
    return { ok: false, inApp: false, message: '岗位不存在' }
  }

  const guard = assertBossOperationAllowed(userId, { allowOffHours: true })
  if (!guard.ok) {
    await updateJobApplication(applicationId, {
      bossApplyStatus: 'failed',
      bossApplyError: guard.message ?? 'Boss 操作已暂停',
    })
    return { ok: false, inApp: false, message: guard.message ?? 'Boss 操作已暂停' }
  }

  if (!isRealBossCookie(session.cookieHeader)) {
    await updateJobApplication(applicationId, {
      bossApplyStatus: 'failed',
      bossApplyError: 'Boss 未登录，请先绑定',
    })
    return { ok: false, inApp: false, message: 'Boss 未登录，请先绑定' }
  }

  await updateJobApplication(applicationId, { bossApplyStatus: 'sending' })

  let result: Awaited<ReturnType<typeof sendBossGreeting>> | null = null
  const canUseBrowser = isWorkerEnabled() && Boolean(session.profileDir) && job.externalId

  if (canUseBrowser) {
    try {
      const browserResult = await sendGreetViaWorker({
        userId,
        jobExternalId: job.externalId!,
        greeting,
        securityId: job.bossMeta?.securityId,
        lid: job.bossMeta?.lid,
      })
      result = {
        ok: browserResult.ok,
        status: browserResult.ok ? 'sent' : 'failed',
        message: browserResult.message,
        securityId: browserResult.securityId,
      }
      if (!browserResult.ok && isAntiBotError(browserResult.message)) {
        tripCircuitBreaker(userId, browserResult.message)
      }
    } catch (e) {
      console.warn('[boss-sync] browser greet failed, fallback to API:', e)
    }
  }

  if (!result?.ok) {
    const apiResult = await sendBossGreeting(session.cookieHeader, job, greeting, job.bossMeta)
    result = apiResult
  }

  if (result.ok) {
    if (result.securityId) {
      await updateJobBossMeta(jobId, {
        securityId: result.securityId,
        jobId: job.externalId ?? jobId,
      })
    }
    await updateJobApplication(applicationId, {
      bossApplyStatus: 'sent',
      bossApplyError: '',
      bossSyncedAt: new Date().toISOString(),
      status: 'applied',
    })
    return { ok: true, inApp: true, message: result.message }
  }

  await updateJobApplication(applicationId, {
    bossApplyStatus: 'failed',
    bossApplyError: result.message,
    bossSyncedAt: new Date().toISOString(),
  })
  if (isAntiBotError(result.message)) tripCircuitBreaker(userId, result.message)
  return { ok: false, inApp: true, message: result.message }
}

export async function syncUserBossApplications(userId: string) {
  if (!isPgEnabled()) return { synced: 0, updated: 0 }

  const session = await getBossSession(userId)
  if (!session) return { synced: 0, updated: 0, message: '未绑定 Boss' }

  const apps = await listJobApplications(userId)
  const chats = (await fetchBossChatList(session.cookieHeader)).items
  let updated = 0

  for (const app of apps) {
    const job = await getJobPosting(app.jobId)
    if (!job?.externalId) continue

    const chat = chats.find(
      (c) =>
        c.jobId === job.externalId ||
        (c.company && job.company.includes(c.company)) ||
        (c.title && job.title.includes(c.title)),
    )

    if (chat?.lastMessage) {
      const isReply = chat.lastMessage.length > 0 && !chat.lastMessage.includes('您好')
      await updateJobApplication(app.id, {
        bossReplySnippet: chat.lastMessage.slice(0, 200),
        bossSyncedAt: new Date().toISOString(),
        status: isReply ? 'viewed' : app.status,
        bossApplyStatus: app.bossApplyStatus === 'failed' ? app.bossApplyStatus : 'sent',
      })
      updated++
    }
  }

  return { synced: apps.length, updated, message: updated > 0 ? '已同步 Boss 沟通状态' : '暂无新消息' }
}

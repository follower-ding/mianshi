import { Hono } from 'hono'
import { lookupResumeShareByToken } from '../services/resume-share-store.js'

export const publicResumeRoutes = new Hono()

function isExpiredAt(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

/** 公开只读简历（无需登录） */
publicResumeRoutes.get('/r/:token', async (c) => {
  const share = await lookupResumeShareByToken(c.req.param('token'))
  if (!share) return c.json({ error: '链接无效', code: 'SHARE_NOT_FOUND' }, 404)
  if (isExpiredAt(share.expiresAt)) {
    return c.json(
      { error: '链接已过期', code: 'SHARE_EXPIRED', expiresAt: share.expiresAt ?? null },
      410,
    )
  }

  return c.json({
    title: share.title,
    templateId: share.templateId,
    content: share.content,
    layoutConfig: share.layoutConfig,
    sharedAt: share.createdAt,
    expiresAt: share.expiresAt ?? null,
  })
})

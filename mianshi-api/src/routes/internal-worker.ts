import { Hono } from 'hono'
import { runBossAgentForUser } from '../services/boss-agent-pipeline.js'
import { listUsersWithBossSession } from '../services/boss-session-store.js'

export const internalWorkerRoutes = new Hono()

// Verify WORKER_INTERNAL_KEY is set once at module load
const WORKER_KEY = process.env.WORKER_INTERNAL_KEY
if (!WORKER_KEY) {
  if (process.env.WORKER_ENABLED === 'true') {
    console.error(
      '[Security] WORKER_ENABLED=true but WORKER_INTERNAL_KEY is not set!\n' +
        '  Internal worker endpoints are UNPROTECTED. Set WORKER_INTERNAL_KEY in mianshi-api/.env\n' +
        '  Generate: node -e "console.log(require(\'crypto\').randomBytes(24).toString(\'hex\'))"',
    )
  } else {
    console.warn(
      '[Security] WORKER_INTERNAL_KEY is not set. Internal worker endpoints are disabled.',
    )
  }
}

function verifyWorkerKey(c: { req: { header: (n: string) => string | undefined } }) {
  if (!WORKER_KEY) return false
  return c.req.header('x-worker-key') === WORKER_KEY
}

/** Worker 定时任务回调：单用户完整 Agent Pipeline */
internalWorkerRoutes.post('/boss-agent/:userId', async (c) => {
  if (!verifyWorkerKey(c)) return c.json({ error: 'Unauthorized' }, 401)
  const userId = c.req.param('userId')
  try {
    const result = await runBossAgentForUser(userId)
    return c.json({ ok: true, userId, ...result })
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : 'agent failed' }, 500)
  }
})

/** 列出可打工用户（调试） */
internalWorkerRoutes.get('/boss-users', async (c) => {
  if (!verifyWorkerKey(c)) return c.json({ error: 'Unauthorized' }, 401)
  const users = await listUsersWithBossSession()
  return c.json({ users })
})

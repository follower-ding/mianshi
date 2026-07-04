import 'dotenv/config'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { getLlmInfo } from './services/llm.js'
import { getTtsInfo } from './services/tts.js'
import { isPgEnabled } from './db/client.js'
import { listUsersWithBossSession } from './services/boss-session-store.js'
import { listAllJobPreferences } from './services/job-preferences-store.js'

const app = createApp()

const port = Number(process.env.PORT ?? 8788)

async function bootstrap() {
  serve({ fetch: app.fetch, port }, () => {
    const llm = getLlmInfo()
    const tts = getTtsInfo()
    console.log(`mianshi-api listening on http://localhost:${port}`)
    console.log(`Database: ${isPgEnabled() ? 'PostgreSQL' : 'JSON file'}`)
    console.log(`LLM mode: ${llm.configured ? llm.provider : 'demo (no API key)'}`)
    console.log(`TTS mode: ${tts.configured ? 'doubao' : 'browser only (no TTS_API_KEY)'}`)
    if (isPgEnabled() && process.env.VERCEL !== '1') {
      const hours = Number(process.env.BOSS_CRAWL_INTERVAL_HOURS ?? 24)
      const ms = hours * 3600_000
      const runScheduled = async () => {
        const prefs = await listAllJobPreferences()
        const userIds = new Set([
          ...prefs.map((p) => p.userId),
          ...(await listUsersWithBossSession()),
        ])
        for (const uid of userIds) {
          try {
            const { runBossAgentForUser } = await import('./services/boss-agent-pipeline.js')
            await runBossAgentForUser(uid, { trigger: 'scheduled' })
            console.log(`[BossAgent] scheduled done for user ${uid}`)
          } catch (e) {
            console.error(`[BossAgent] failed for user ${uid}:`, e)
          }
        }
      }
      setTimeout(() => runScheduled().catch(console.error), 60_000)
      setInterval(() => runScheduled().catch(console.error), ms)
      console.log(`Boss crawl + sync scheduler: every ${hours}h`)
    }
  })
}

export default app

if (process.env.VERCEL !== '1') {
  bootstrap().catch((err) => {
    console.error('[Bootstrap]', err)
    process.exit(1)
  })
}

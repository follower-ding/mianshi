import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import { healthRoutes } from './routes/health.js'
import { questionRoutes } from './routes/questions.js'
import { experienceRoutes } from './routes/experiences.js'
import { interviewRoutes } from './routes/interview.js'
import { reportRoutes } from './routes/reports.js'
import { ttsRoutes } from './routes/tts.js'
import { metricsRoutes } from './routes/metrics.js'
import { authRoutes } from './routes/auth.js'
import { adminRoutes } from './routes/admin.js'
import { practiceRoutes } from './routes/practice.js'
import { quizRoutes } from './routes/quiz.js'
import { smartImportRoutes } from './routes/smart-import.js'
import { profileRoutes } from './routes/profile.js'
import { pathRoutes } from './routes/paths.js'
import { jobRoutes } from './routes/jobs.js'
import { applicationRoutes } from './routes/applications.js'
import { bossRoutes } from './routes/boss.js'
import { internalWorkerRoutes } from './routes/internal-worker.js'
import { resumeRoutes } from './routes/resume.js'
import { publicResumeRoutes } from './routes/public-resume.js'
import { getLlmInfo, probeLlmReachable } from './services/llm.js'
import { isResumeAiDemoMode } from './services/resume-optimize.js'
import { getTtsInfo } from './services/tts.js'
import { purgeExpiredSessions, purgeExpiredLlmCache } from './services/store.js'
import { uploadRoutes } from './routes/uploads.js'
import { diagramRoutes } from './routes/diagrams.js'
import { initDatabase } from './db/init.js'
import { isPgEnabled } from './db/client.js'

let initPromise: Promise<void> | null = null

export async function ensureAppReady() {
  if (!initPromise) {
    initPromise = (async () => {
      if (process.env.VERCEL === '1' && !isPgEnabled()) {
        throw new Error(
          'DATABASE_URL is required on Vercel. Create a free Neon PostgreSQL database and set DATABASE_URL in Vercel env.',
        )
      }
      await initDatabase()
      await purgeExpiredSessions()
      if (isPgEnabled()) await purgeExpiredLlmCache()
    })().catch((err) => {
      initPromise = null
      throw err
    })
  }
  await initPromise
}

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost:5174'
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveCorsOrigin(origin: string | undefined, allowed: string[]): string | undefined {
  if (!origin) return allowed[0]
  if (allowed.includes(origin)) return origin
  if (process.env.ALLOW_NETLIFY_PREVIEWS === '1' && /\.netlify\.app$/i.test(origin)) {
    return origin
  }
  if (process.env.ALLOW_VERCEL_PREVIEWS === '1' && /\.vercel\.app$/i.test(origin)) {
    return origin
  }
  return undefined
}

export function createApp() {
  const app = new Hono()
  const corsOrigins = parseCorsOrigins()

  app.use('*', async (c, next) => {
    await ensureAppReady()
    await next()
  })

  app.use(
    '*',
    cors({
      origin: (origin) => resolveCorsOrigin(origin, corsOrigins),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  app.route('/api/uploads', uploadRoutes)
  app.route('/api/diagrams', diagramRoutes)
  app.route('/api', healthRoutes)
  app.route('/api/auth', authRoutes)
  app.route('/api/admin', adminRoutes)
  app.route('/api/practice', practiceRoutes)
  app.route('/api/quiz', quizRoutes)
  app.route('/api/import', smartImportRoutes)
  app.route('/api/profile', profileRoutes)
  app.route('/api/paths', pathRoutes)
  app.route('/api/jobs', jobRoutes)
  app.route('/api/applications', applicationRoutes)
  app.route('/api/boss', bossRoutes)
  app.route('/api/resumes', resumeRoutes)
  app.route('/api/public', publicResumeRoutes)
  app.route('/api/internal/worker', internalWorkerRoutes)
  app.route('/api/questions', questionRoutes)
  app.route('/api/experiences', experienceRoutes)
  app.route('/api/interview', interviewRoutes)
  app.route('/api/tts', ttsRoutes)
  app.route('/api/reports', reportRoutes)
  app.route('/api/metrics', metricsRoutes)

  app.get('/api/info', async (c) => {
    const base = {
      llm: getLlmInfo(),
      resumeAi: { demoMode: isResumeAiDemoMode() },
      tts: getTtsInfo(),
      database: isPgEnabled() ? 'postgresql' : 'json',
    }
    if (c.req.query('probe') !== '1') return c.json(base)
    const probe = await probeLlmReachable()
    return c.json({ ...base, llmProbe: probe })
  })

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(
        {
          error: '校验未通过',
          issues: err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        400,
      )
    }
    console.error('[API]', err)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  })

  return app
}

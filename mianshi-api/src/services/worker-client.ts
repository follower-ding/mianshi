const WORKER_URL = (process.env.WORKER_URL ?? 'http://localhost:8790').replace(/\/$/, '')

const WORKER_INTERNAL_KEY = process.env.WORKER_INTERNAL_KEY ?? ''



export function isWorkerEnabled(): boolean {
  if (process.env.WORKER_ENABLED === 'false') return false
  return process.env.WORKER_ENABLED === 'true' || Boolean(process.env.WORKER_URL)
}



async function workerPost<T>(path: string, body: unknown): Promise<T> {

  const res = await fetch(`${WORKER_URL}${path}`, {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      ...(WORKER_INTERNAL_KEY ? { 'X-Worker-Key': WORKER_INTERNAL_KEY } : {}),

    },

    body: JSON.stringify(body),

    signal: AbortSignal.timeout(180_000),

  })

  if (!res.ok) {

    const err = await res.json().catch(() => ({ detail: res.statusText }))

    throw new Error((err as { detail?: string; message?: string }).detail ?? (err as { message?: string }).message ?? 'Worker request failed')

  }

  return res.json() as Promise<T>

}



export async function seedProfileViaWorker(userId: string, cookieHeader: string): Promise<string> {

  const data = await workerPost<{ profile_dir: string }>('/internal/profile/seed', {

    user_id: userId,

    cookie_header: cookieHeader,

  })

  return data.profile_dir

}



export type WorkerGreetResult = {

  ok: boolean

  message: string

  securityId?: string

  channel?: string

}



export async function sendGreetViaWorker(opts: {

  userId: string

  jobExternalId: string

  greeting: string

  securityId?: string

  lid?: string

}): Promise<WorkerGreetResult> {

  return workerPost<WorkerGreetResult>('/internal/boss/greet', {

    user_id: opts.userId,

    job_external_id: opts.jobExternalId,

    greeting: opts.greeting,

    security_id: opts.securityId,

    lid: opts.lid,

  })

}



export async function crawlBossViaWorker(

  userId: string,

  pref: import('../types/entities.js').JobPreference,

  maxJobs: number,

): Promise<import('./boss-crawler.js').BossCrawlItem[]> {

  const { buildSearchQueries } = await import('./boss-crawler.js')

  const { resolveBossCityCode } = await import('./boss-cities.js')

  const queries = buildSearchQueries(pref).slice(0, 3)

  const all: import('./boss-crawler.js').BossCrawlItem[] = []

  const seen = new Set<string>()



  for (const { query, city } of queries) {

    const data = await workerPost<{ jobs: import('./boss-crawler.js').BossCrawlItem[] }>(

      '/internal/boss/crawl',

      {

        user_id: userId,

        query,

        city_code: resolveBossCityCode(city),

        city_name: city,

        max_jobs: Math.min(maxJobs, 30),

      },

    )

    for (const job of data.jobs ?? []) {

      if (!job.externalId || seen.has(job.externalId)) continue

      seen.add(job.externalId)

      all.push(job)

      if (all.length >= maxJobs) break

    }

    if (all.length >= maxJobs) break

  }

  return all

}



export async function pingWorkerHealth(): Promise<boolean> {

  try {

    const res = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(3000) })

    return res.ok

  } catch {

    return false

  }

}


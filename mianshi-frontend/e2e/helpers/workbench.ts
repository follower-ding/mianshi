import { expect } from '@playwright/test'

export const API = 'http://localhost:8788/api'

export type JobSummary = {
  id: string
  title: string
  company: string
}

export async function loginAsAdmin(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@mianshi.local', password: 'admin123456' },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.token as string
}

export async function findUnappliedJob(
  request: import('@playwright/test').APIRequestContext,
  token: string,
): Promise<JobSummary | null> {
  const headers = { Authorization: `Bearer ${token}` }

  const [recRes, matchRes, appRes] = await Promise.all([
    request.get(`${API}/jobs/recommendations`, { headers }),
    request.get(`${API}/jobs/matches?tier=S,A,B,C`, { headers }),
    request.get(`${API}/applications`, { headers }),
  ])

  const recBody = await recRes.json()
  const matchBody = await matchRes.json()
  const appBody = await appRes.json()

  const appliedIds = new Set<string>(
    (appBody.items as { jobId: string }[]).map((a) => a.jobId),
  )

  const candidates = [
    ...(recBody.items as { job?: JobSummary }[]),
    ...(matchBody.items as { job?: JobSummary }[]),
  ]

  for (const item of candidates) {
    const job = item.job
    if (job?.id && job.title && !appliedIds.has(job.id)) {
      return job
    }
  }
  return null
}

export async function seedWorkbenchSession(request: import('@playwright/test').APIRequestContext) {
  const status = await request.get(`${API}/auth/status`)
  const { enabled } = await status.json()
  if (!enabled) return null

  const token = await loginAsAdmin(request)
  const unappliedJob = await findUnappliedJob(request, token)

  return { token, unappliedJob }
}

export async function dismissBossBindModalIfOpen(page: import('@playwright/test').Page) {
  const dismiss = page.getByRole('button', { name: '稍后再绑' })
  try {
    await dismiss.waitFor({ state: 'visible', timeout: 10_000 })
    await dismiss.click()
    await dismiss.waitFor({ state: 'hidden', timeout: 5_000 })
  } catch {
    /* modal did not appear */
  }
}

export async function openJobsPage(
  page: import('@playwright/test').Page,
  token: string,
) {
  await page.addInitScript((t) => localStorage.setItem('mianshi_token', t), token)
  await page.goto('/jobs', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /职位浏览/ })).toBeVisible({ timeout: 15_000 })
  await dismissBossBindModalIfOpen(page)
}

export function trackToggleLocator(page: import('@playwright/test').Page) {
  return page.locator('div.inline-flex.rounded-lg.border')
}

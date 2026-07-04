import { test, expect } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8788/api'
const FRONT = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174'

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${FRONT}/login`)
  await page.getByPlaceholder('邮箱').fill('demo@mianshi.dev')
  await page.getByPlaceholder('密码').fill('demo123456')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/(resume|profile|quick)/, { timeout: 15_000 })
}

test.describe('resume public share', () => {
  test('create share link and open public page', async ({ page, request }) => {
    await login(page)
    await page.goto(`${FRONT}/resume/mine`)
    await page.getByRole('button', { name: /新建空白/ }).click()
    await page.waitForURL(/\/resume\/edit/, { timeout: 15_000 })

    const token = await page.evaluate(async () => localStorage.getItem('mianshi_token'))
    expect(token).toBeTruthy()

    const url = new URL(page.url())
    const resumeId = url.searchParams.get('id')
    expect(resumeId).toBeTruthy()

    const shareRes = await request.post(`${API}/resumes/${resumeId}/share`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    expect(shareRes.ok()).toBeTruthy()
    const { share } = (await shareRes.json()) as { share: { token: string } }
    expect(share.token).toBeTruthy()

    const publicRes = await request.get(`${API}/public/r/${share.token}`)
    expect(publicRes.ok()).toBeTruthy()

    await page.goto(`${FRONT}/r/${share.token}`)
    await expect(page.getByText('公开只读')).toBeVisible({ timeout: 10_000 })
  })
})

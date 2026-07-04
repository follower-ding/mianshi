import { test, expect } from '@playwright/test'

const pageLoad = { waitUntil: 'domcontentloaded' as const }

async function loginAsAdmin(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) {
  const status = await request.get('http://localhost:8788/api/auth/status')
  const body = await status.json()
  test.skip(!body.enabled, 'Auth requires PostgreSQL')

  await page.goto('/login', pageLoad)
  await page.getByPlaceholder('邮箱').fill('admin@mianshi.local')
  await page.getByPlaceholder('密码').fill('admin123456')
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/(jobs)?$/, { waitUntil: 'domcontentloaded', timeout: 45_000 })
}

test.describe('resume crud', () => {
  test('create blank resume from mine page', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/mine', pageLoad)
    await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /新建空白/ }).click()
    await page.waitForURL(/\/resume\/edit/, { timeout: 15000 })
    await expect(page.locator('#resume-print-root')).toBeVisible()
  })

  test('delete resume from card menu', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/mine', pageLoad)
    await page.getByRole('button', { name: /新建空白/ }).click()
    await page.waitForURL(/\/resume\/edit/)

    await page.goto('/resume/mine', pageLoad)
    const card = page.locator('article.group').first()
    await expect(card).toBeVisible({ timeout: 15000 })

    page.once('dialog', (d) => d.accept())
    await card.getByTestId('resume-card-menu').click()
    await page.getByRole('button', { name: '删除' }).click()

    await expect(page.getByText(/已删除简历/)).toBeVisible({ timeout: 10000 })
  })
})

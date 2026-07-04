import { test, expect } from '@playwright/test'

const pageLoad = { waitUntil: 'domcontentloaded' as const }

test('login page renders', async ({ page }) => {
  await page.goto('/login', pageLoad)
  await expect(page.getByRole('heading', { name: /登录 iume/ })).toBeVisible()
})

test('admin login when postgres enabled', async ({ page, request }) => {
  const status = await request.get('http://localhost:8788/api/auth/status')
  const body = await status.json()
  test.skip(!body.enabled, 'Auth requires PostgreSQL')

  await page.goto('/login', pageLoad)
  await page.getByPlaceholder('邮箱').fill('admin@mianshi.local')
  await page.getByPlaceholder('密码').fill('admin123456')
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/(jobs)?$/)
  await page.goto('/admin')
  await expect(page.getByText('运营后台')).toBeVisible()
})

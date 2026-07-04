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

test.describe('resume extended modules', () => {
  test('honors section renders in preview', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/edit', pageLoad)
    await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: '荣誉奖项' }).last().click()
    await page.getByRole('button', { name: '添加荣誉' }).click()

    const honorCard = page.locator('.rounded-lg.border.border-border\\/60').filter({ hasText: '奖项名称' }).first()
    await honorCard.locator('input').first().fill('年度优秀员工')

    await expect(page.locator('#resume-print-root')).toContainText('年度优秀员工', { timeout: 10000 })
    await expect(page.locator('#resume-print-root')).toContainText('荣誉奖项')
  })
})

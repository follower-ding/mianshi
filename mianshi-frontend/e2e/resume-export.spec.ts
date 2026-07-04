import { test, expect } from '@playwright/test'

const pageLoad = { waitUntil: 'domcontentloaded' as const }

async function loginAsAdmin(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const status = await request.get('http://localhost:8788/api/auth/status')
  const body = await status.json()
  test.skip(!body.enabled, 'Auth requires PostgreSQL')

  await page.goto('/login', pageLoad)
  await page.getByPlaceholder('邮箱').fill('admin@mianshi.local')
  await page.getByPlaceholder('密码').fill('admin123456')
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/(jobs)?$/, { waitUntil: 'domcontentloaded', timeout: 45_000 })
}

test.describe('resume export', () => {
  test('PNG export triggers download without module or color errors', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/edit', pageLoad)
    await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })

    await page.getByRole('button', { name: /导出/ }).click()
    await page.getByRole('button', { name: 'PNG 图片' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.png$/i)

    await expect(page.getByText(/Failed to fetch|oklab|oklch|unsupported color|动态导入/i)).toHaveCount(0)
  })

  test('JPG export triggers download', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/edit', pageLoad)
    await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })

    await page.getByRole('button', { name: /导出/ }).click()
    await page.getByRole('button', { name: 'JPG 图片' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.jpe?g$/i)
  })

  test('PDF export opens without color or module errors', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/edit', pageLoad)
    await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /导出/ }).click()
    await page.getByRole('button', { name: /PDF/ }).click()

    await expect(page.getByText(/Failed to fetch|oklab|oklch|unsupported color|动态导入/i)).toHaveCount(0)
  })
})

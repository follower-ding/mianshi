import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pageLoad = { waitUntil: 'domcontentloaded' as const }
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

test.describe('resume import wizard', () => {
  test('paste text → parse compare → apply navigates to edit', async ({ page, request }) => {
    test.setTimeout(90_000)
    await loginAsAdmin(page, request)

    await page.goto('/resume/optimize', pageLoad)
    await expect(page.getByText('导入并智能识别简历')).toBeVisible({ timeout: 15000 })

    const sampleText =
      '张三 软件工程师 上海 13800138000 zhangsan@example.com\n' +
      '5年Java开发经验，熟悉Spring Boot、MySQL、Redis。\n' +
      '字节跳动高级后端工程师2022至今负责推荐系统。\n' +
      '清华大学计算机本科2016-2020。技能：Java Spring MySQL Redis Kafka。'

    await page.locator('textarea').first().fill(sampleText)
    await page.getByRole('button', { name: /下一步：确认原文/ }).click()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /开始智能识别/ }).click()

    await expect(page.getByText('智能识别结果 — 确认后应用')).toBeVisible({ timeout: 20000 })
    await page.getByRole('button', { name: /确认应用并进入排版/ }).click()

    await page.waitForURL(/\/resume\/edit/, { timeout: 60_000 })
    await expect(page.locator('#resume-print-root')).toBeVisible()
  })

  test('upload txt extracts text without auto parse', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/resume/optimize', pageLoad)
    await expect(page.getByText('导入并智能识别简历')).toBeVisible({ timeout: 15000 })

    const txtPath = path.join(__dirname, '../../mianshi-api/fixtures/resume/sample-resume.txt')
    const fileInput = page.locator('#resume-import-upload')
    await fileInput.setInputFiles(txtPath)

    await expect(page.getByRole('status').filter({ hasText: /已提取/ })).toBeVisible({ timeout: 20000 })
    const textarea = page.locator('textarea').first()
    await expect(textarea).not.toHaveValue('')
    const value = await textarea.inputValue()
    expect(value.trim().length).toBeGreaterThanOrEqual(30)
  })
})

import { test, expect } from '@playwright/test'

const pageLoad = { waitUntil: 'domcontentloaded' as const }

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('http://localhost:8788/api/health')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.ok).toBe(true)
})

test('home page loads', async ({ page }) => {
  await page.goto('/', pageLoad)
  await expect(page.getByText('iume')).toBeVisible()
})

test('question bank hub loads', async ({ page }) => {
  await page.goto('/questions', pageLoad)
  await expect(page.getByRole('heading', { name: '选择你的刷题方向' })).toBeVisible()
})

test('question bank practice page loads', async ({ page }) => {
  await page.goto('/questions/java', pageLoad)
  await expect(page.getByRole('heading', { name: 'Java 后端' })).toBeVisible()
})

test('legacy category query redirects to bank slug', async ({ page }) => {
  await page.goto('/questions?category=Java', pageLoad)
  await expect(page).toHaveURL(/\/questions\/java/)
})

test('quick interview entry works', async ({ page }) => {
  await page.goto('/quick', pageLoad)
  await expect(page.getByRole('heading', { name: '快速面试' })).toBeVisible()
  await page.getByText('5 分钟快问快答').click()
  await expect(page).toHaveURL(/interview\?mode=quick/)
})

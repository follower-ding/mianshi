import { test, expect } from '@playwright/test'
import {
  API,
  findUnappliedJob,
  openJobsPage,
  seedWorkbenchSession,
  trackToggleLocator,
  type JobSummary,
} from './helpers/workbench'

test('jobs workbench keeps JD and chat on separate tracks', async ({ page, request }) => {
  test.setTimeout(60_000)

  const session = await seedWorkbenchSession(request)
  test.skip(!session, 'Auth requires PostgreSQL')

  await openJobsPage(page, session!.token)

  await expect(page.getByText('HR 联系人')).not.toBeVisible()

  await page.getByRole('button', { name: /今日推荐/ }).click()
  const firstJob = page.locator('aside ul button').first()
  await expect(firstJob).toBeVisible({ timeout: 15_000 })
  await firstJob.click()

  await expect(page.getByText('选择左侧岗位')).not.toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('HR 联系人')).not.toBeVisible()

  const trackToggle = trackToggleLocator(page)
  await trackToggle.getByRole('button', { name: /全部对话/ }).click()
  await expect(page.getByText('HR 联系人')).toBeVisible()
  await expect(page.getByText('字节跳动')).toBeVisible()

  await page.getByRole('button', { name: /刘女士/ }).click()
  await expect(
    page.locator('div.max-w-\\[82\\%\\]').getByText('想了解一下贵公司对后端工程师有什么其他要求呢？'),
  ).toBeVisible({ timeout: 15_000 })

  await trackToggle.getByRole('button', { name: /职位浏览/ }).click()
  await expect(page.getByText('HR 联系人')).not.toBeVisible()
})

test('apply sync and send reply completes delivery chain', async ({ page, request }) => {
  test.setTimeout(90_000)

  const session = await seedWorkbenchSession(request)
  test.skip(!session, 'Auth requires PostgreSQL')

  let targetJob: JobSummary | null =
    session!.unappliedJob ?? (await findUnappliedJob(request, session!.token))

  page.on('dialog', (dialog) => dialog.accept())

  await openJobsPage(page, session!.token)

  if (targetJob) {
    await page.getByRole('button', { name: /今日推荐/ }).click()
    const jobCard = page.locator('aside ul button').filter({ hasText: targetJob.title }).first()
    await expect(jobCard).toBeVisible({ timeout: 15_000 })
    await jobCard.click()
    await page.getByRole('button', { name: '一键投递', exact: true }).click()
    await expect(page.getByRole('button', { name: /我的投递/ })).toBeVisible()
  } else {
    const appsRes = await request.get(`${API}/applications`, {
      headers: { Authorization: `Bearer ${session!.token}` },
    })
    const appsBody = await appsRes.json()
    const firstApp = appsBody.items?.[0] as { job?: JobSummary } | undefined
    test.skip(!firstApp?.job?.title, 'No applications available for delivery chain test')
    targetJob = firstApp!.job!
    await page.getByRole('button', { name: /我的投递/ }).click()
    await page.locator('aside ul button').filter({ hasText: targetJob.title }).first().click()
  }

  await expect(
    page.locator('aside ul button').filter({ hasText: targetJob!.title }).first(),
  ).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: '消息托管', exact: true }).click()

  const trackToggle = trackToggleLocator(page)
  await trackToggle.getByRole('button', { name: /全部对话/ }).click()
  await page.getByRole('button', { name: /刘女士/ }).click()

  const reply = `E2E回复-${Date.now()}`
  const textarea = page.getByPlaceholder('输入回复…')
  await textarea.fill(reply)
  await textarea.locator('..').getByRole('button').click()

  await expect(page.locator('.bg-cyan-500\\/90').filter({ hasText: reply })).toBeVisible({
    timeout: 15_000,
  })

  await trackToggle.getByRole('button', { name: /职位浏览/ }).click()
  await page.getByRole('button', { name: /我的投递/ }).click()
  await expect(
    page.locator('aside ul button').filter({ hasText: targetJob!.title }).first(),
  ).toBeVisible()
  await page
    .locator('section.border-l')
    .getByRole('button', { name: /全部对话|查看对话/ })
    .click()

  await expect(page.getByText('HR 联系人')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.bg-cyan-500\\/90').filter({ hasText: reply })).toBeVisible()
})

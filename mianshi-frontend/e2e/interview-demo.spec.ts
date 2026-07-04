import { test, expect } from '@playwright/test'

const pageLoad = { waitUntil: 'domcontentloaded' as const }

const SAMPLE_ANSWER =
  '我在项目中系统实践了 JVM 垃圾回收与性能调优，熟悉 G1、CMS 及 GC 日志分析；' +
  'MySQL 使用联合索引与执行计划优化慢查询；Redis 做缓存与分布式锁；' +
  'Spring Boot 微服务落地，具备高并发场景下的稳定性治理经验。'

test.describe('interview demo flow', () => {
  test('quick mode completes with report summary', async ({ page, request }) => {
    test.setTimeout(120_000)

    const status = await request.get('http://localhost:8788/api/interview/status')
    expect(status.ok()).toBeTruthy()

    await page.goto(
      '/interview?mode=quick&position=Java%20后端开发&experience=1-3%E5%B9%B4',
      pageLoad,
    )

    await expect(page.getByText('正在连接 AI 面试官')).toBeHidden({ timeout: 45_000 })
    await expect(page.getByPlaceholder(/请输入您的回答|语音识别/)).toBeVisible({ timeout: 30_000 })

    const voiceToggle = page.getByTitle(/关闭语音模式|开启语音模式/)
    if (await voiceToggle.isVisible()) {
      const title = await voiceToggle.getAttribute('title')
      if (title?.includes('关闭')) await voiceToggle.click()
    }

    const input = page.getByPlaceholder(/请输入您的回答|语音识别/)
    const sendBtn = page.getByRole('button', { name: '发送回答' })
    const completeHeading = page.getByRole('heading', { name: /面试完成/ })

    for (let i = 0; i < 8; i++) {
      if (await completeHeading.isVisible()) break

      await input.fill(`${SAMPLE_ANSWER} 第 ${i + 1} 轮：结合线上 GC 与慢 SQL 治理案例展开。`)
      await expect(sendBtn).toBeEnabled()
      await sendBtn.click()

      await expect
        .poll(
          async () => {
            if (await completeHeading.isVisible()) return 'done'
            const pulsing = await page.locator('.animate-pulse').count()
            if (pulsing === 0 && !(await sendBtn.isDisabled())) return 'ready'
            if (pulsing === 0 && (await page.getByText(/下一个问题|追问|面试结束/).count()) > 0) {
              return 'ready'
            }
            return 'wait'
          },
          { timeout: 90_000, intervals: [500, 1000, 2000] },
        )
        .not.toBe('wait')

      if (await completeHeading.isVisible()) break
    }

    await expect(completeHeading).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('综合评级').first()).toBeVisible()
  })
})

/**
 * 完整用户旅程：注册 → 全功能遍历 → 截图证据
 * 运行：npx playwright test --config playwright.report.config.ts
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = 'http://localhost:8788/api'
const REPORT_DIR = path.resolve(__dirname, '../../docs/user-journey-report/screenshots')
const pageLoad = { waitUntil: 'domcontentloaded' as const }

const SAMPLE_ANSWER =
  '我在项目中系统实践了 JVM 垃圾回收与性能调优，熟悉 G1、CMS 及 GC 日志分析；' +
  'MySQL 使用联合索引与执行计划优化慢查询；Redis 做缓存与分布式锁。'

const journeyLog: { step: number; title: string; file: string; url: string; note?: string }[] = []
let stepCounter = 0

async function snap(page: Page, title: string, note?: string) {
  stepCounter += 1
  const slug = String(stepCounter).padStart(2, '0') + '-' + title.replace(/[^\w\u4e00-\u9fff]+/g, '-').slice(0, 40)
  const file = `${slug}.png`
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  await page.screenshot({ path: path.join(REPORT_DIR, file), fullPage: true })
  journeyLog.push({ step: stepCounter, title, file, url: page.url(), note })
}

async function dismissBossBindModalIfOpen(page: Page) {
  const dismiss = page.getByRole('button', { name: '稍后再绑' })
  try {
    await dismiss.waitFor({ state: 'visible', timeout: 8_000 })
    await dismiss.click()
    await dismiss.waitFor({ state: 'hidden', timeout: 5_000 })
  } catch {
    /* modal did not appear */
  }
}

test.describe('完整用户旅程报告', () => {
  test('从注册到全功能使用', async ({ page, request }) => {
    test.setTimeout(300_000)

    const statusRes = await request.get(`${API}/auth/status`)
    const authStatus = await statusRes.json()
    expect(authStatus.enabled, '需要 PostgreSQL 才能注册').toBe(true)

    const ts = Date.now()
    const email = `e2e-user-${ts}@mianshi.test`
    const password = 'Test123456'
    const name = `测试用户${ts}`

    // ── 1. 首页 ──
    await page.goto('/', pageLoad)
    await expect(page.getByRole('heading', { name: /代码与表达/ })).toBeVisible({ timeout: 15_000 })
    await snap(page, '首页-未登录')

    // ── 2. 注册 ──
    await page.goto('/register', pageLoad)
    await expect(page.getByRole('heading', { name: '注册账号' })).toBeVisible()
    await snap(page, '注册页-空表单')

    await page.getByPlaceholder('如何称呼你').fill(name)
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('设置登录密码').fill(password)
    await snap(page, '注册页-填写完成')
    await page.getByRole('button', { name: /注册并进入首页/ }).click()
    await page.waitForURL(/\/(jobs)?$/, { timeout: 30_000 })
    await dismissBossBindModalIfOpen(page)
    await snap(page, '注册成功-进入首页', `账号: ${email}`)

    // ── 3. 个人资料 ──
    await page.goto('/profile', pageLoad)
    await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '个人资料页')

    // ── 4. 快速面试入口 ──
    await page.goto('/quick', pageLoad)
    await expect(page.getByRole('heading', { name: '快速面试' })).toBeVisible()
    await snap(page, '快速面试-选择页')
    await page.getByText('5 分钟快问快答').click()
    await expect(page).toHaveURL(/interview\?mode=quick/)
    await snap(page, '快速面试-配置页')

    // ── 5. 模拟面试（demo 模式） ──
    await page.goto('/interview?mode=quick&position=Java%20后端开发&experience=1-3%E5%B9%B4', pageLoad)
    await expect(page.getByText('正在连接 AI 面试官')).toBeHidden({ timeout: 45_000 })
    await expect(page.getByPlaceholder(/请输入您的回答|语音识别/)).toBeVisible({ timeout: 30_000 })
    await snap(page, '模拟面试-首题')

    const voiceToggle = page.getByTitle(/关闭语音模式|开启语音模式/)
    if (await voiceToggle.isVisible()) {
      const title = await voiceToggle.getAttribute('title')
      if (title?.includes('关闭')) await voiceToggle.click()
    }

    const input = page.getByPlaceholder(/请输入您的回答|语音识别/)
    const sendBtn = page.getByRole('button', { name: '发送回答' })
    const completeHeading = page.getByRole('heading', { name: /面试完成/ })

    for (let i = 0; i < 6; i++) {
      if (await completeHeading.isVisible()) break
      await input.fill(`${SAMPLE_ANSWER} 第 ${i + 1} 轮回答。`)
      await sendBtn.click()
      await expect
        .poll(
          async () => {
            if (await completeHeading.isVisible()) return 'done'
            const pulsing = await page.locator('.animate-pulse').count()
            if (pulsing === 0 && !(await sendBtn.isDisabled())) return 'ready'
            return 'wait'
          },
          { timeout: 90_000, intervals: [500, 1000, 2000] },
        )
        .not.toBe('wait')
      if (await completeHeading.isVisible()) break
    }

    await expect(completeHeading).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('综合评级').first()).toBeVisible()
    await snap(page, '模拟面试-完成报告')

    // ── 6. 面试报告列表 ──
    await page.goto('/reports', pageLoad)
    await expect(page.getByRole('heading', { name: '面试记录' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '面试报告列表')

    const firstReport = page.locator('a[href*="/reports/"]').first()
    if (await firstReport.isVisible()) {
      await firstReport.click()
      await page.waitForURL(/\/reports\//)
      await snap(page, '面试报告详情')
    }

    // ── 7. 题库中心 ──
    await page.goto('/questions', pageLoad)
    await expect(page.getByRole('heading', { name: '选择你的刷题方向' })).toBeVisible()
    await snap(page, '题库中心-方向选择')

    await page.goto('/questions/java', pageLoad)
    await expect(page.getByRole('heading', { name: 'Java 后端' })).toBeVisible()
    await snap(page, '题库-Java后端')

    // ── 8. 学习路线 ──
    await page.goto('/paths', pageLoad)
    await expect(page.getByRole('heading', { name: '刷题路线' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '学习路线')

    // ── 9. 面经社区 ──
    await page.goto('/experiences', pageLoad)
    await expect(page.getByRole('heading', { name: '面经社区' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '面经列表')

    const firstExp = page.locator('a[href*="/experiences/"]').first()
    if (await firstExp.isVisible()) {
      await firstExp.click()
      await page.waitForURL(/\/experiences\//)
      await snap(page, '面经详情')
    }

    // ── 10. 简历 - 我的简历 ──
    await page.goto('/resume/mine', pageLoad)
    await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '简历-我的简历')

    await page.getByRole('button', { name: /新建空白/ }).click()
    await page.waitForURL(/\/resume\/edit/, { timeout: 15_000 })
    await expect(page.locator('#resume-print-root')).toBeVisible()
    await snap(page, '简历-编辑页-新建空白')

    // ── 11. 简历模板 ──
    await page.goto('/resume/templates', pageLoad)
    await expect(page.getByRole('heading', { name: '模板画廊' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '简历-模板库')

    // ── 12. AI 生成简历 ──
    await page.goto('/resume/generate', pageLoad)
    await expect(page.getByRole('heading', { name: 'AI 快速生成简历' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '简历-AI生成')

    // ── 13. 简历优化 ──
    await page.goto('/resume/optimize', pageLoad)
    await expect(page.getByText('导入并智能识别简历')).toBeVisible({ timeout: 15_000 })
    await snap(page, '简历-优化建议')

    // ── 14. 简历导出 ──
    await page.goto('/resume/edit', pageLoad)
    await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /导出/ }).click()
    await snap(page, '简历-导出菜单')

    // ── 15. 简历分享 ──
    const token = await page.evaluate(() => localStorage.getItem('mianshi_token'))
    const resumeId = new URL(page.url()).searchParams.get('id')
    if (token && resumeId) {
      const shareRes = await request.post(`${API}/resumes/${resumeId}/share`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (shareRes.ok()) {
        const { share } = (await shareRes.json()) as { share: { token: string } }
        await page.goto(`/r/${share.token}`, pageLoad)
        await expect(page.getByText('公开只读')).toBeVisible({ timeout: 10_000 })
        await snap(page, '简历-公开分享页')
      }
    }

    // ── 16. 智能投递工作台 ──
    await page.goto('/jobs', pageLoad)
    await expect(page.getByRole('button', { name: /职位浏览/ })).toBeVisible({ timeout: 15_000 })
    await dismissBossBindModalIfOpen(page)
    await snap(page, '投递工作台-职位浏览')

    await page.getByRole('button', { name: /今日推荐/ }).click()
    const firstJob = page.locator('aside ul button').first()
    if (await firstJob.isVisible()) {
      await firstJob.click()
      await snap(page, '投递工作台-岗位详情')
    }

    const trackToggle = page.locator('div.inline-flex.rounded-lg.border')
    await trackToggle.getByRole('button', { name: /全部对话/ }).click()
    if (await page.getByText('HR 联系人').isVisible()) {
      await snap(page, '投递工作台-消息对话')
    }

    // ── 17. 邀请页 ──
    await page.goto('/invite', pageLoad)
    await expect(page.getByRole('heading', { name: '邀请有礼' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '邀请好友页')

    // ── 18. 帮助页 ──
    await page.goto('/resume/help', pageLoad)
    await expect(page.getByRole('heading', { name: '简历模块使用帮助' })).toBeVisible({ timeout: 15_000 })
    await snap(page, '简历帮助页')

    // ── 19. 退出再登录验证 ──
    await page.goto('/', pageLoad)
    await page.locator('header .relative > button').click()
    await page.getByRole('button', { name: '退出登录' }).click()
    await page.waitForURL(/\/(login)?$/, { timeout: 15_000 })
    await snap(page, '退出登录')

    await page.goto('/login', pageLoad)
    await page.getByPlaceholder('邮箱').fill(email)
    await page.getByPlaceholder('密码').fill(password)
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/(jobs)?$/, { timeout: 30_000 })
    await dismissBossBindModalIfOpen(page)
    await snap(page, '重新登录成功', `验证账号 ${email} 可再次登录`)

    // 写入旅程日志
    const logPath = path.resolve(REPORT_DIR, '../journey-log.json')
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.writeFileSync(
      logPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          testUser: { email, name },
          totalSteps: journeyLog.length,
          steps: journeyLog,
        },
        null,
        2,
      ),
    )
  })
})

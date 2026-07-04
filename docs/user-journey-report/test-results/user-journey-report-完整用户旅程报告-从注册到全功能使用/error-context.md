# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-journey-report.spec.ts >> 完整用户旅程报告 >> 从注册到全功能使用
- Location: e2e\user-journey-report.spec.ts:43:3

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "wait"

Call Log:
- Timeout 90000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "Offer僧" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]: i
        - generic [ref=e9]: Offer僧
      - navigation [ref=e10]:
        - link "首页" [ref=e11] [cursor=pointer]:
          - /url: /
        - link "快速面试" [ref=e12] [cursor=pointer]:
          - /url: /quick
        - link "简历工作台" [ref=e13] [cursor=pointer]:
          - /url: /resume/mine
        - link "智能投递" [ref=e14] [cursor=pointer]:
          - /url: /jobs
        - link "面试题库" [ref=e15] [cursor=pointer]:
          - /url: /questions
        - link "真实面经" [ref=e16] [cursor=pointer]:
          - /url: /experiences
      - generic [ref=e17]:
        - generic [ref=e18]:
          - img [ref=e19]
          - searchbox "搜索题目" [ref=e22]
        - button "测试用户1783163391216" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: 测
          - generic [ref=e26]: 测试用户1783163391216
          - img [ref=e27]
  - main [ref=e29]:
    - generic [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - heading "沉浸式模拟面试" [level=1] [ref=e33]
          - paragraph [ref=e34]: 当前岗位：Java 后端开发 · 已回答 1 题 · AI 模式
        - generic [ref=e35]:
          - generic [ref=e36]: 实时得分：1
          - combobox [ref=e37]:
            - option "Java 后端开发" [selected]
            - option "C++ 后端开发"
            - option "Go 后端开发"
            - option "Python 后端开发"
            - option "前端开发"
            - option "算法工程师"
            - option "产品经理"
            - option "测试开发"
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e45]: 沉浸式模拟面试 - Java 后端开发
          - button "面试者布局" [ref=e46]:
            - img [ref=e47]
            - generic [ref=e52]: 面试者布局
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - generic [ref=e56]:
                - generic [ref=e57]: AI
                - generic [ref=e58]: 你好！欢迎参加 Java 后端开发 模拟面试（1-3年）。我是 AI 面试官，准备好了吗？ 第一个问题：对比 OSI 七层和 TCP/IP 四层模型及各层协议。
              - generic [ref=e59]:
                - generic [ref=e60]: 我
                - generic [ref=e61]: 我在项目中系统实践了 JVM 垃圾回收与性能调优，熟悉 G1、CMS 及 GC 日志分析；MySQL 使用联合索引与执行计划优化慢查询；Redis 做缓存与分布式锁。 第 1 轮回答。
              - generic [ref=e62]:
                - generic [ref=e63]: AI
                - generic [ref=e64]: 回答不足，关键要点：四层模型、七层模型。 追问：DNS 解析过程？
            - generic [ref=e67]:
              - button "开启摄像头" [ref=e68]:
                - img [ref=e69]
              - button "开启语音模式" [ref=e72]:
                - img [ref=e73]
              - button "开启右侧 AI 辅助" [ref=e76]:
                - img [ref=e77]
            - generic [ref=e80]:
              - textbox "请输入您的回答，可先采用 AI 辅助再修改" [ref=e81]
              - button "发送回答" [disabled] [ref=e82]:
                - img [ref=e83]
          - generic [ref=e88]:
            - generic [ref=e89]:
              - img [ref=e93]
              - generic [ref=e97]: AI 面试官
            - generic [ref=e98]:
              - button "开启摄像头" [ref=e100]:
                - img [ref=e101]
              - generic [ref=e105]: 🥉
              - generic:
                - generic: 候选人（我）
      - paragraph [ref=e106]: 💡 回答不足，关键要点：四层模型、七层模型。
  - complementary [ref=e107]:
    - button "反馈" [ref=e108] [cursor=pointer]:
      - img [ref=e109]
    - button "笔记" [ref=e111] [cursor=pointer]:
      - img [ref=e112]
    - button "讨论" [ref=e114] [cursor=pointer]:
      - img [ref=e115]
    - button "iume · 回到顶部" [ref=e117] [cursor=pointer]:
      - img [ref=e118]
```

# Test source

```ts
  17  |   'MySQL 使用联合索引与执行计划优化慢查询；Redis 做缓存与分布式锁。'
  18  | 
  19  | const journeyLog: { step: number; title: string; file: string; url: string; note?: string }[] = []
  20  | let stepCounter = 0
  21  | 
  22  | async function snap(page: Page, title: string, note?: string) {
  23  |   stepCounter += 1
  24  |   const slug = String(stepCounter).padStart(2, '0') + '-' + title.replace(/[^\w\u4e00-\u9fff]+/g, '-').slice(0, 40)
  25  |   const file = `${slug}.png`
  26  |   fs.mkdirSync(REPORT_DIR, { recursive: true })
  27  |   await page.screenshot({ path: path.join(REPORT_DIR, file), fullPage: true })
  28  |   journeyLog.push({ step: stepCounter, title, file, url: page.url(), note })
  29  | }
  30  | 
  31  | async function dismissBossBindModalIfOpen(page: Page) {
  32  |   const dismiss = page.getByRole('button', { name: '稍后再绑' })
  33  |   try {
  34  |     await dismiss.waitFor({ state: 'visible', timeout: 8_000 })
  35  |     await dismiss.click()
  36  |     await dismiss.waitFor({ state: 'hidden', timeout: 5_000 })
  37  |   } catch {
  38  |     /* modal did not appear */
  39  |   }
  40  | }
  41  | 
  42  | test.describe('完整用户旅程报告', () => {
  43  |   test('从注册到全功能使用', async ({ page, request }) => {
  44  |     test.setTimeout(300_000)
  45  | 
  46  |     const statusRes = await request.get(`${API}/auth/status`)
  47  |     const authStatus = await statusRes.json()
  48  |     expect(authStatus.enabled, '需要 PostgreSQL 才能注册').toBe(true)
  49  | 
  50  |     const ts = Date.now()
  51  |     const email = `e2e-user-${ts}@mianshi.test`
  52  |     const password = 'Test123456'
  53  |     const name = `测试用户${ts}`
  54  | 
  55  |     // ── 1. 首页 ──
  56  |     await page.goto('/', pageLoad)
  57  |     await expect(page.getByRole('heading', { name: /代码与表达/ })).toBeVisible({ timeout: 15_000 })
  58  |     await snap(page, '首页-未登录')
  59  | 
  60  |     // ── 2. 注册 ──
  61  |     await page.goto('/register', pageLoad)
  62  |     await expect(page.getByRole('heading', { name: '注册账号' })).toBeVisible()
  63  |     await snap(page, '注册页-空表单')
  64  | 
  65  |     await page.getByPlaceholder('如何称呼你').fill(name)
  66  |     await page.getByPlaceholder('you@example.com').fill(email)
  67  |     await page.getByPlaceholder('设置登录密码').fill(password)
  68  |     await snap(page, '注册页-填写完成')
  69  |     await page.getByRole('button', { name: /注册并进入首页/ }).click()
  70  |     await page.waitForURL(/\/(jobs)?$/, { timeout: 30_000 })
  71  |     await dismissBossBindModalIfOpen(page)
  72  |     await snap(page, '注册成功-进入首页', `账号: ${email}`)
  73  | 
  74  |     // ── 3. 个人资料 ──
  75  |     await page.goto('/profile', pageLoad)
  76  |     await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible({ timeout: 15_000 })
  77  |     await snap(page, '个人资料页')
  78  | 
  79  |     // ── 4. 快速面试入口 ──
  80  |     await page.goto('/quick', pageLoad)
  81  |     await expect(page.getByRole('heading', { name: '快速面试' })).toBeVisible()
  82  |     await snap(page, '快速面试-选择页')
  83  |     await page.getByText('5 分钟快问快答').click()
  84  |     await expect(page).toHaveURL(/interview\?mode=quick/)
  85  |     await snap(page, '快速面试-配置页')
  86  | 
  87  |     // ── 5. 模拟面试（demo 模式） ──
  88  |     await page.goto('/interview?mode=quick&position=Java%20后端开发&experience=1-3%E5%B9%B4', pageLoad)
  89  |     await expect(page.getByText('正在连接 AI 面试官')).toBeHidden({ timeout: 45_000 })
  90  |     await expect(page.getByPlaceholder(/请输入您的回答|语音识别/)).toBeVisible({ timeout: 30_000 })
  91  |     await snap(page, '模拟面试-首题')
  92  | 
  93  |     const voiceToggle = page.getByTitle(/关闭语音模式|开启语音模式/)
  94  |     if (await voiceToggle.isVisible()) {
  95  |       const title = await voiceToggle.getAttribute('title')
  96  |       if (title?.includes('关闭')) await voiceToggle.click()
  97  |     }
  98  | 
  99  |     const input = page.getByPlaceholder(/请输入您的回答|语音识别/)
  100 |     const sendBtn = page.getByRole('button', { name: '发送回答' })
  101 |     const completeHeading = page.getByRole('heading', { name: /面试完成/ })
  102 | 
  103 |     for (let i = 0; i < 6; i++) {
  104 |       if (await completeHeading.isVisible()) break
  105 |       await input.fill(`${SAMPLE_ANSWER} 第 ${i + 1} 轮回答。`)
  106 |       await sendBtn.click()
  107 |       await expect
  108 |         .poll(
  109 |           async () => {
  110 |             if (await completeHeading.isVisible()) return 'done'
  111 |             const pulsing = await page.locator('.animate-pulse').count()
  112 |             if (pulsing === 0 && !(await sendBtn.isDisabled())) return 'ready'
  113 |             return 'wait'
  114 |           },
  115 |           { timeout: 90_000, intervals: [500, 1000, 2000] },
  116 |         )
> 117 |         .not.toBe('wait')
      |              ^ Error: expect(received).not.toBe(expected) // Object.is equality
  118 |       if (await completeHeading.isVisible()) break
  119 |     }
  120 | 
  121 |     await expect(completeHeading).toBeVisible({ timeout: 15_000 })
  122 |     await expect(page.getByText('综合评级').first()).toBeVisible()
  123 |     await snap(page, '模拟面试-完成报告')
  124 | 
  125 |     // ── 6. 面试报告列表 ──
  126 |     await page.goto('/reports', pageLoad)
  127 |     await expect(page.getByRole('heading', { name: '面试记录' })).toBeVisible({ timeout: 15_000 })
  128 |     await snap(page, '面试报告列表')
  129 | 
  130 |     const firstReport = page.locator('a[href*="/reports/"]').first()
  131 |     if (await firstReport.isVisible()) {
  132 |       await firstReport.click()
  133 |       await page.waitForURL(/\/reports\//)
  134 |       await snap(page, '面试报告详情')
  135 |     }
  136 | 
  137 |     // ── 7. 题库中心 ──
  138 |     await page.goto('/questions', pageLoad)
  139 |     await expect(page.getByRole('heading', { name: '选择你的刷题方向' })).toBeVisible()
  140 |     await snap(page, '题库中心-方向选择')
  141 | 
  142 |     await page.goto('/questions/java', pageLoad)
  143 |     await expect(page.getByRole('heading', { name: 'Java 后端' })).toBeVisible()
  144 |     await snap(page, '题库-Java后端')
  145 | 
  146 |     // ── 8. 学习路线 ──
  147 |     await page.goto('/paths', pageLoad)
  148 |     await expect(page.getByRole('heading', { name: '刷题路线' })).toBeVisible({ timeout: 15_000 })
  149 |     await snap(page, '学习路线')
  150 | 
  151 |     // ── 9. 面经社区 ──
  152 |     await page.goto('/experiences', pageLoad)
  153 |     await expect(page.getByRole('heading', { name: '面经社区' })).toBeVisible({ timeout: 15_000 })
  154 |     await snap(page, '面经列表')
  155 | 
  156 |     const firstExp = page.locator('a[href*="/experiences/"]').first()
  157 |     if (await firstExp.isVisible()) {
  158 |       await firstExp.click()
  159 |       await page.waitForURL(/\/experiences\//)
  160 |       await snap(page, '面经详情')
  161 |     }
  162 | 
  163 |     // ── 10. 简历 - 我的简历 ──
  164 |     await page.goto('/resume/mine', pageLoad)
  165 |     await expect(page.getByRole('heading', { name: '我的简历' })).toBeVisible({ timeout: 15_000 })
  166 |     await snap(page, '简历-我的简历')
  167 | 
  168 |     await page.getByRole('button', { name: /新建空白/ }).click()
  169 |     await page.waitForURL(/\/resume\/edit/, { timeout: 15_000 })
  170 |     await expect(page.locator('#resume-print-root')).toBeVisible()
  171 |     await snap(page, '简历-编辑页-新建空白')
  172 | 
  173 |     // ── 11. 简历模板 ──
  174 |     await page.goto('/resume/templates', pageLoad)
  175 |     await expect(page.getByRole('heading', { name: '模板画廊' })).toBeVisible({ timeout: 15_000 })
  176 |     await snap(page, '简历-模板库')
  177 | 
  178 |     // ── 12. AI 生成简历 ──
  179 |     await page.goto('/resume/generate', pageLoad)
  180 |     await expect(page.getByRole('heading', { name: 'AI 快速生成简历' })).toBeVisible({ timeout: 15_000 })
  181 |     await snap(page, '简历-AI生成')
  182 | 
  183 |     // ── 13. 简历优化 ──
  184 |     await page.goto('/resume/optimize', pageLoad)
  185 |     await expect(page.getByText('导入并智能识别简历')).toBeVisible({ timeout: 15_000 })
  186 |     await snap(page, '简历-优化建议')
  187 | 
  188 |     // ── 14. 简历导出 ──
  189 |     await page.goto('/resume/edit', pageLoad)
  190 |     await expect(page.locator('#resume-print-root')).toBeVisible({ timeout: 15_000 })
  191 |     await page.getByRole('button', { name: /导出/ }).click()
  192 |     await snap(page, '简历-导出菜单')
  193 | 
  194 |     // ── 15. 简历分享 ──
  195 |     const token = await page.evaluate(() => localStorage.getItem('mianshi_token'))
  196 |     const resumeId = new URL(page.url()).searchParams.get('id')
  197 |     if (token && resumeId) {
  198 |       const shareRes = await request.post(`${API}/resumes/${resumeId}/share`, {
  199 |         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  200 |       })
  201 |       if (shareRes.ok()) {
  202 |         const { share } = (await shareRes.json()) as { share: { token: string } }
  203 |         await page.goto(`/r/${share.token}`, pageLoad)
  204 |         await expect(page.getByText('公开只读')).toBeVisible({ timeout: 10_000 })
  205 |         await snap(page, '简历-公开分享页')
  206 |       }
  207 |     }
  208 | 
  209 |     // ── 16. 智能投递工作台 ──
  210 |     await page.goto('/jobs', pageLoad)
  211 |     await expect(page.getByRole('button', { name: /职位浏览/ })).toBeVisible({ timeout: 15_000 })
  212 |     await dismissBossBindModalIfOpen(page)
  213 |     await snap(page, '投递工作台-职位浏览')
  214 | 
  215 |     await page.getByRole('button', { name: /今日推荐/ }).click()
  216 |     const firstJob = page.locator('aside ul button').first()
  217 |     if (await firstJob.isVisible()) {
```
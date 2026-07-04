import { defineConfig, devices } from '@playwright/test'

/** 用户旅程报告专用配置：录屏 + 截图 + 不自动启动 webServer（复用已有 dev） */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'user-journey-report.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  outputDir: '../docs/user-journey-report/test-results',
  reporter: [['list'], ['json', { outputFile: '../docs/user-journey-report/results.json' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    navigationTimeout: 45_000,
    ...devices['Desktop Chrome'],
  },
})

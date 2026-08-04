import { defineConfig, devices } from '@playwright/test'

const preview = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4318'

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.pw.ts',
  outputDir: './test-results/playwright',
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4318',
    url: 'http://127.0.0.1:4318',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: preview,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-zh-TW', use: { viewport: { width: 390, height: 844 } } },
    { name: 'mobile-en-US', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet-zh-TW', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'tablet-en-US', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-zh-TW', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-en-US', use: { viewport: { width: 1440, height: 900 } } },
  ],
})

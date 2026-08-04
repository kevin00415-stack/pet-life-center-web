import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const evidenceRoot = path.resolve('docs/evidence/i18n-visual-gate')
const isEnglish = (testInfo: TestInfo) => testInfo.project.name.endsWith('en-US')
const locale = (testInfo: TestInfo) => isEnglish(testInfo) ? 'en-US' : 'zh-TW'

async function assertVisualSafety(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const root = document.documentElement
    const overflow = root.scrollWidth - root.clientWidth
    const clipped: string[] = []
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('button, a, label, h1, h2, h3, p, summary'))) {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      if (box.width > 0 && box.height > 0 && style.overflow === 'hidden' && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2)) {
        clipped.push((element.innerText || element.getAttribute('aria-label') || element.tagName).trim().slice(0, 80))
      }
    }
    return { overflow, clipped: clipped.slice(0, 10) }
  })
  expect(result.overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(1)
  expect(result.clipped, `${label}: clipped controls/text`).toEqual([])
  return result
}

async function capture(page: Page, testInfo: TestInfo, order: string, label: string, fullPage = false) {
  await assertVisualSafety(page, label)
  await mkdir(evidenceRoot, { recursive: true })
  const file = path.join(evidenceRoot, `${testInfo.project.name}-${order}-${label}.png`)
  await page.screenshot({ path: file, fullPage, animations: 'disabled' })
  return file
}

async function createPet(page: Page, testInfo: TestInfo) {
  const create = page.locator('.first-pet-onboarding').getByRole('button')
  if (await create.count()) {
    await create.click()
    await expect(page.locator('.pet-editor')).toBeVisible()
    await page.locator('input[name="name"]').fill(isEnglish(testInfo) ? 'Guardian Test Pet' : '守護測試毛孩')
    await page.locator('select[name="species"]').selectOption({ index: 0 })
    await capture(page, testInfo, '02', 'pet-editor')
    await page.locator('.pet-editor button.save-reminder').click()
    await expect(page.locator('.island-hero')).toBeVisible()
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((language) => localStorage.setItem('maohai-app-locale', language), locale(testInfo))
})

test('deployed website, reload, language persistence, and responsive layout', async ({ page }, testInfo) => {
  await page.goto('/website')
  await expect(page).toHaveURL(/\/website$/)
  await expect(page.locator('html')).toHaveAttribute('lang', locale(testInfo))
  await capture(page, testInfo, '01', 'website', true)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', locale(testInfo))
  await assertVisualSafety(page, 'website after reload')
})

test('app priority screens remain usable and responsive', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', locale(testInfo))
  await createPet(page, testInfo)
  await capture(page, testInfo, '03', 'care-home')

  await page.locator('.more').click()
  await expect(page.locator('.settings-page')).toBeVisible()
  await capture(page, testInfo, '04', 'settings')
  await page.locator('.settings-page .timeline-header > button').click()

  const nav = page.locator('.bottom-nav')
  await expect(nav).toBeVisible()
  const navButtons = nav.getByRole('button')
  await expect(navButtons).toHaveCount(5)
  await navButtons.nth(1).click()
  await capture(page, testInfo, '05', 'memories')
  await navButtons.nth(3).click()
  await capture(page, testInfo, '06', 'health-timeline')
  await navButtons.nth(2).click()
  await capture(page, testInfo, '07', 'community')
  await navButtons.nth(4).click()
  await capture(page, testInfo, '08', 'reminder-center')
  await navButtons.nth(0).click()

  for (const [selector, order, label] of [
    ['.senior-action', '09', 'senior-care'],
    ['.event-action', '10', 'event-center'],
    ['.visual-comparison-action', '11', 'visual-comparison'],
  ] as const) {
    await page.locator(selector).click()
    await capture(page, testInfo, order, label)
    const back = page.locator('.senior-care-container, .event-center-container, .visual-comparison-container').getByRole('button').first()
    await back.evaluate((button: HTMLButtonElement) => button.click())
    await expect(page.locator('.senior-action')).toBeVisible()
  }

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', locale(testInfo))
  await expect(page.locator('.island-hero')).toBeVisible()
  await assertVisualSafety(page, 'app after reload')
})

test.afterAll(async () => {
  await mkdir(evidenceRoot, { recursive: true })
  await writeFile(path.join(evidenceRoot, 'README.txt'), 'Generated by Playwright against commit 92ee47d4113b5a00a4ecc4b47420b3d966664cd1.\n', 'utf8')
})

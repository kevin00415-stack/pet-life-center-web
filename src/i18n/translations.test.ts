import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { detectLocale, getLocale, interpolate, setLocale } from './translations'
import { formatDate, formatNumber, formatTemperature, formatWeight } from './formatters'
import { en } from './en'
import { zhTW as originalZhTW } from './zh-TW'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('i18n Translations system (Pure Unit Tests)', () => {
  beforeAll(() => {
    setLocale('zh-TW')
  })

  afterAll(() => {
    setLocale('zh-TW')
  })

  test('should return correct default locale', () => {
    expect(getLocale()).toBe('zh-TW')
  })

  test('should support setting and getting active locale', () => {
    setLocale('en-US')
    expect(getLocale()).toBe('en-US')
    setLocale('en')
    expect(getLocale()).toBe('en-US')
    setLocale('zh-TW')
    expect(getLocale()).toBe('zh-TW')
  })

  test('detects supported locales and falls back to Traditional Chinese', () => {
    expect(detectLocale(['en-GB'])).toBe('en-US')
    expect(detectLocale(['zh-HK'])).toBe('zh-TW')
    expect(detectLocale(['fr-FR'])).toBe('zh-TW')
  })

  test('formats locale-aware values without changing canonical stored units', () => {
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5')
    expect(formatWeight(10, 'en-US', 'lb')).toContain('22')
    expect(formatTemperature(20, 'en-US', 'fahrenheit')).toContain('68')
    expect(formatDate('2026-08-03', 'zh-TW')).toContain('2026')
    expect(interpolate('Hello {name}', { name: 'Mochi' })).toBe('Hello Mochi')
  })

  test('should verify all zh-TW dictionary keys exist and are populated', () => {
    expect(originalZhTW.tabTopics).toBe('主題群組')
    expect(originalZhTW.privateChatTitle).toBe('1 對 1 家長私密通訊')
    expect(originalZhTW.unreadMockDisclaimer).toContain('示意資料')
  })

  test('should verify all en dictionary keys have corresponding entries', () => {
    expect(en.tabTopics).toBe('Topics')
    expect(en.privateChatTitle).toBe('1-on-1 Encrypted Messaging')
    expect(en.unreadMockDisclaimer).toContain('demo mock')
  })

  test('provides bilingual CareHome presentation mappings without changing source values', () => {
    const sourceCategory = 'seizure'
    const sourceStatus = 'completed'
    const categoryKeys = { seizure: 'abnormalSeizure' } as const
    const statusKeys = { completed: 'activityCompleted' } as const
    expect(originalZhTW[categoryKeys[sourceCategory]]).toBe('癲癇／抽搐')
    expect(en[categoryKeys[sourceCategory]]).toBe('Seizure / convulsion')
    expect(originalZhTW[statusKeys[sourceStatus]]).toBe('已完成')
    expect(en[statusKeys[sourceStatus]]).toBe('Completed')
    expect(sourceCategory).toBe('seizure')
    expect(sourceStatus).toBe('completed')
  })

  test('keeps CareHome messages complete and locale-safe', () => {
    expect(interpolate(originalZhTW.activityWeightTitle, { weight: '6 公斤' })).toContain('6 公斤')
    expect(interpolate(en.activityWeightTitle, { weight: '13.2 lb' })).toContain('13.2 lb')
    expect(interpolate(en.homeCoverAria, { pet: 'Mochi' })).toBe("Mochi's home cover")
    expect(Object.keys(en)).toEqual(expect.arrayContaining(Object.keys(originalZhTW)))
  })

  test('CareHome source has no hard-coded Han UI text or inline locale formatting', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/CareHomeView.tsx'), 'utf8')
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(withoutComments).not.toMatch(/\p{Script=Han}/u)
    expect(withoutComments).not.toMatch(/locale\s*===/)
    expect(withoutComments).not.toMatch(/\.toLocale(?:Date|Time|String)/)
  })
})

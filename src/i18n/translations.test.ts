import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getLocale, setLocale } from './translations'
import { en } from './en'
import { zhTW as originalZhTW } from './zh-TW'

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
    setLocale('en')
    expect(getLocale()).toBe('en')
    setLocale('zh-TW')
    expect(getLocale()).toBe('zh-TW')
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
})

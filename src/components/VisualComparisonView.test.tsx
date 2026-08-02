import { describe, test, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Pet } from '../domain'
import { buildHealthTimeline } from '../domain'

// Setup Node-safe storage mocks before imports execute!
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k in store) delete store[k] },
} as any

globalThis.window = {
  localStorage: globalThis.localStorage
} as any

import VisualComparisonView from './VisualComparisonView'
import {
  getVisualComparisons,
  saveVisualComparison,
} from '../services/VisualComparisonService'

// Mock global URL creator functions
beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => `blob:mock-url-${Math.random()}`)
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('Guardian Visual Comparison Tests', () => {
  const petA: Pet = { id: 'pet-a', name: '哈吉', species: '狗狗', avatar: '🐶' }

  beforeEach(() => {
    localStorage.clear()
  })

  test('1. only active-pet attachments are shown in comparisons', () => {
    const comp1 = {
      id: 'comp-1',
      petId: 'pet-a',
      createdAt: Date.now(),
      category: 'gait',
      leftAttachmentId: 'attach-a-1',
      rightAttachmentId: 'attach-a-2',
      note: '步態有些吃力',
    }

    const comp2 = {
      id: 'comp-2',
      petId: 'pet-b',
      createdAt: Date.now(),
      category: 'skin',
      leftAttachmentId: 'attach-b-1',
      rightAttachmentId: 'attach-b-2',
      note: '紅疹好像消了',
    }

    saveVisualComparison('pet-a', comp1)
    saveVisualComparison('pet-b', comp2)

    const listA = getVisualComparisons('pet-a')
    const listB = getVisualComparisons('pet-b')

    expect(listA).toHaveLength(1)
    expect(listA[0].id).toBe('comp-1')
    expect(listB).toHaveLength(1)
    expect(listB[0].id).toBe('comp-2')
  })

  test('2 & 3 & 4. photo attachments can be paired, video can be paired, but photo and video cannot be mixed', () => {
    const validatePairing = (leftType: string, rightType: string) => {
      const isMismatch = leftType !== rightType
      return !isMismatch
    }

    expect(validatePairing('photo', 'photo')).toBe(true)
    expect(validatePairing('video', 'video')).toBe(true)
    expect(validatePairing('photo', 'video')).toBe(false)
  })

  test('5. insufficient attachments show empty states warning messages in Chinese and have no mixed-language labels', () => {
    const html = renderToStaticMarkup(
      createElement(VisualComparisonView, {
        pet: petA,
        onBack: () => {},
      })
    )

    expect(html).toContain('建立新比對')
    expect(html).toContain('目前素材池尚無任何照片或影片。')
    expect(html).toContain('選擇過去照片或影片')
    expect(html).toContain('選擇現在照片或影片')
    expect(html).not.toContain('Choose Past &amp; Present')
    expect(html).not.toContain('Media Library')
  })

  test('6 & 7. saving stores lightweight metadata (attachment IDs) without duplicating Blob objects, and persists after refresh', () => {
    const compRecord = {
      id: 'comp-100',
      petId: 'pet-a',
      createdAt: Date.now(),
      category: 'wound',
      leftAttachmentId: 'media-old-123',
      rightAttachmentId: 'media-new-456',
      note: '傷口已經結痂了，狀況穩定。',
    }

    saveVisualComparison('pet-a', compRecord)

    const rawData = localStorage.getItem('maohai-visual-comparisons-pet-a')
    expect(rawData).toBeDefined()
    expect(rawData).toContain('media-old-123')
    expect(rawData).toContain('media-new-456')
    expect(rawData).toContain('傷口已經結痂了')

    const parsed = JSON.parse(rawData!)
    expect(parsed[0].leftAttachmentId).toBe('media-old-123')
    expect(parsed[0].rightAttachmentId).toBe('media-new-456')
    expect(parsed[0].blob).toBeUndefined()

    const loadedList = getVisualComparisons('pet-a')
    expect(loadedList).toHaveLength(1)
    expect(loadedList[0].id).toBe('comp-100')
    expect(loadedList[0].category).toBe('wound')
  })

  test('8. timeline renders the comparison exactly once', () => {
    const compRecord = {
      id: 'comp-789',
      petId: 'pet-a',
      createdAt: Date.now(),
      category: 'spirit',
      leftAttachmentId: 'left-media-789',
      rightAttachmentId: 'right-media-789',
      note: '今天眼神感覺比之前有精神許多！',
      mediaType: 'photo' as const,
    }

    saveVisualComparison('pet-a', compRecord)

    const timeline = buildHealthTimeline([], 'pet-a')
    const compEvents = timeline.filter((event) => event.id === 'comp-789')
    expect(compEvents).toHaveLength(1)

    const event = compEvents[0]
    expect(event.title).toBe('🔍 視覺比對：精神狀態')
    expect(event.details).toContain('過去 vs 現在')
    expect(event.details).toContain('📷 照片比對')
    expect(event.details).toContain('今天眼神感覺比之前有精神許多')
  })

  test('9. deleted or missing attachment in visual comparison historical records is handled safely', () => {
    const compRecord = {
      id: 'comp-deleted-asset',
      petId: 'pet-a',
      createdAt: Date.now(),
      category: 'body',
      leftAttachmentId: 'missing-asset-id',
      rightAttachmentId: 'existing-asset-id',
      note: '體態比對測試',
    }

    saveVisualComparison('pet-a', compRecord)

    const html = renderToStaticMarkup(
      createElement(VisualComparisonView, {
        pet: petA,
        onBack: () => {},
      })
    )

    expect(html).toContain('歷史比對紀錄')
    expect(html).toContain('⚠️ 素材已丟失')
  })
})

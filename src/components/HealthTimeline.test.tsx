import { describe, test, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import HealthTimeline from '../HealthTimeline'
import { timelineAggregationService } from '../services/TimelineAggregationService'
import { timelineMessageService } from '../services/TimelineMessageService'
import type { Pet, CareReminder, GrowthRecord } from '../domain'

vi.mock('../device-store', () => ({
  loadAllMedia: vi.fn().mockResolvedValue([]),
}))

const mockPet: Pet = {
  id: 'test-coco',
  name: '可可',
  avatar: '🐱',
  species: '貓',
  birthDate: '2020-01-15',
}

const mockReminders: CareReminder[] = [
  {
    id: 'rem-med-1',
    petId: 'test-coco',
    kind: 'medication',
    title: '吃心絲蟲藥',
    details: '每月一次',
    startDate: '2026-05-01',
    time: '08:00',
    dailyTimes: ['08:00'],
    repeat: 'monthly',
    advanceMinutes: [],
    sound: 'system',
    enabled: true,
    completedOccurrences: ['rem-med-1:2026-05-01T08:00'],
    occurrenceRecords: [
      { key: 'rem-med-1:2026-05-01T08:00', status: 'completed', recordedAt: 1775011200000 },
    ],
    createdAt: 1775011200000,
  },
]

const mockGrowthRecords: GrowthRecord[] = [
  {
    id: 'g-1',
    petId: 'test-coco',
    date: '2026-05-02',
    weightKg: 5.4,
    note: '食慾好，體重上升',
    createdAt: 1775097600000,
  },
]

describe('TimelineMessageService - Emotion Layer tests', () => {
  test('correctly maps emotional templates with pet name replacements', () => {
    const birthdayMsg = timelineMessageService.getMessage('Birthday', '可可')
    expect(birthdayMsg).toContain('今天是 可可 的生日！')

    const emptyMsg = timelineMessageService.getMessage('NoRecords', '可可')
    expect(emptyMsg).toContain('和 可可 一起拍張照')
  })

  test('correctly resolves expanded humanized emotion templates', () => {
    const weightMsg = timelineMessageService.getMessage('WeightRecord', '可可')
    expect(weightMsg).toContain('可可 的最新體重')

    const firstMsg = timelineMessageService.getMessage('FirstMemory', '可可')
    expect(firstMsg).toContain('第一篇溫馨回憶')

    const calmMsg = timelineMessageService.getMessage('NoMemoriesToday', '可可')
    expect(calmMsg).toContain('平靜安詳的一天')
    expect(calmMsg).toContain('可可 靠在一起')
  })
})

describe('TimelineAggregationService - Dynamic aggregation engine tests', () => {
  test('correctly aggregates multiple sources under a single pet-isolated chronological list', () => {
    const events = timelineAggregationService.aggregateEvents({
      pet: mockPet,
      reminders: mockReminders,
      growthRecords: mockGrowthRecords,
      memories: [],
      abnormalEvents: [
        { id: 'abn-1', category: 'vomiting', timestamp: 1775184000000, notes: '吐了黃色液體' },
      ],
      visualComparisons: [
        { id: 'vc-1', category: 'gait', createdAt: 1785270400000, note: '步態明顯改善' },
      ],
      seniorCareHistory: {
        '2026-05-03': { appetite: 'attention', notes: '不愛吃早餐' },
      },
    })

    expect(events.length).toBeGreaterThan(0)
    expect(events[0].sourceType).toBe('comparison')
    expect(events[0].title).toContain('視覺前後對比：步態')

    // Pet Isolation test: Switch to invalid pet id, should return empty or filter out events
    const invalidEvents = timelineAggregationService.aggregateEvents({
      pet: { ...mockPet, id: 'some-other-id' },
      reminders: mockReminders,
      growthRecords: mockGrowthRecords,
      memories: [],
    })
    const hasTestCoco = invalidEvents.some((ev) => ev.petId === 'test-coco')
    expect(hasTestCoco).toBe(false)
  })
})

describe('HealthTimeline Component - Integration & Story Mode rendering tests', () => {
  test('renders aggregated events, and supports category filtering correctly', () => {
    const storage: Record<string, string> = {}
    const originalLocalStorage = global.localStorage

    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => { storage[key] = val },
      removeItem: (key: string) => { delete storage[key] },
      clear: () => {},
      length: 0,
      key: () => null,
    }

    try {
      localStorage.setItem('maohai-abnormal-events-test-coco', JSON.stringify([
        { id: 'abn-1', category: 'vomiting', timestamp: 1775184000000, notes: '吐了黃色液體' },
      ]))
      localStorage.setItem('maohai-visual-comparisons-test-coco', JSON.stringify([
        { id: 'vc-1', category: 'gait', createdAt: 1775270400000, note: '步態明顯改善' },
      ]))

      const html = renderToStaticMarkup(
        createElement(HealthTimeline, {
          pet: mockPet,
          reminders: mockReminders,
          growthRecords: mockGrowthRecords,
          onBack: () => {},
          onSaveGrowth: async () => {},
          onDeleteGrowth: async () => {},
          onExportVetReport: () => {},
        })
      )

      expect(html).toContain('可可的生命故事相簿')
      expect(html).toContain('全部生命故事')
      expect(html).toContain('吃藥紀錄 💊')
    } finally {
      global.localStorage = originalLocalStorage
    }
  })

  test('correctly renders "On This Day" moments for past matching calendar days', () => {
    // Generate a matching past date (same month, same date as today, but past years)
    const today = new Date()
    const pastYearDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate(), 10, 0, 0)

    // Aggregate a past event on this calendar date
    const pastReminders: CareReminder[] = [
      {
        id: 'past-rem',
        petId: 'test-coco',
        kind: 'medication',
        title: '當年的珍貴歷史點滴',
        details: '二年前的今天完成',
        startDate: '2024-01-01',
        time: '10:00',
        dailyTimes: ['10:00'],
        repeat: 'daily',
        advanceMinutes: [],
        sound: 'system',
        enabled: true,
        completedOccurrences: [],
        occurrenceRecords: [
          { key: `past-rem:${pastYearDate.toISOString().slice(0, 16)}`, status: 'completed', recordedAt: pastYearDate.getTime() },
        ],
        createdAt: pastYearDate.getTime(),
      }
    ]

    const html = renderToStaticMarkup(
      createElement(HealthTimeline, {
        pet: mockPet,
        reminders: pastReminders,
        growthRecords: [],
        onBack: () => {},
        onSaveGrowth: async () => {},
        onDeleteGrowth: async () => {},
        onExportVetReport: () => {},
      })
    )

    // Verify "On This Day" spotlight card renders
    expect(html).toContain('當年的今天')
    expect(html).toContain('當年的珍貴歷史點滴')
    expect(html).toContain('年的今天')
  })

  test('displays favorite star icons on high importance items', () => {
    const html = renderToStaticMarkup(
      createElement(HealthTimeline, {
        pet: mockPet,
        reminders: mockReminders, // contains medication event which defaults to high importance / high curation
        growthRecords: [],
        onBack: () => {},
        onSaveGrowth: async () => {},
        onDeleteGrowth: async () => {},
        onExportVetReport: () => {},
      })
    )

    // Stars should be present as a text or decoration marker
    expect(html).toContain('⭐')
  })
})

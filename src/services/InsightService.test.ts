import { describe, test, expect } from 'vitest'
import { insightService } from './InsightService'
import type { Pet, CareReminder, GrowthRecord } from '../domain'

const mockPet: Pet = {
  id: 'coco-123',
  name: '可可',
  avatar: '🐱',
  species: '貓',
}

describe('Guardian Insight Engine Foundation Tests', () => {
  test('1. Insight generation, 2. Pet isolation, and 4. Weight fluctuation summaries', () => {
    const reminders: CareReminder[] = []

    // Growth records: weight is falling
    const growthRecords: GrowthRecord[] = [
      { id: 'g-1', petId: 'coco-123', date: '2026-05-01', weightKg: 5.5, note: '', createdAt: 1775011200000 },
      { id: 'g-2', petId: 'coco-123', date: '2026-05-10', weightKg: 4.9, note: '', createdAt: 1775788800000 },
      // Other pet record (should be isolated)
      { id: 'g-isolated', petId: 'neighbor-dog', date: '2026-05-01', weightKg: 20.0, note: '', createdAt: 1775011200000 },
    ]

    const insights = insightService.getDailyInsights({
      pet: mockPet,
      reminders,
      growthRecords,
      seniorCareHistory: {},
    })

    // Assert weight summary is generated
    expect(insights.length).toBe(1)
    const ins = insights[0]
    expect(ins.petId).toBe('coco-123')
    expect(ins.type).toBe('weight-summary')
    expect(ins.title).toContain('體重呈現下降趨勢')
    expect(ins.summary).toContain('微幅減少')
    expect(ins.summary).toContain('0.60 kg') // 5.5 to 4.9
  })

  test('3. Recent Care streak consecutive days', () => {
    // Senior Care observations on 3 consecutive days
    const seniorCareHistory = {
      '2026-05-01': { appetite: 'normal', savedAt: 1775011200000 },
      '2026-05-02': { appetite: 'normal', savedAt: 1775097600000 },
      '2026-05-03': { appetite: 'normal', savedAt: 1775184000000 },
    }

    const insights = insightService.getDailyInsights({
      pet: mockPet,
      reminders: [],
      growthRecords: [],
      seniorCareHistory,
    })

    expect(insights.length).toBe(1)
    expect(insights[0].type).toBe('consecutive-care')
    expect(insights[0].metadata.consecutiveDays).toBe(3)
    expect(insights[0].summary).toContain('連續 3 天')
  })

  test('5. Weekly reminder/medication completion summaries', () => {
    const reminders: CareReminder[] = [
      {
        id: 'rem-m1',
        petId: 'coco-123',
        kind: 'medication',
        title: '吃藥藥',
        details: '每天一次',
        startDate: '2026-05-01',
        time: '08:00',
        dailyTimes: ['08:00'],
        repeat: 'daily',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        occurrenceRecords: [
          { key: 'rem-m1:2026-05-01T08:00', status: 'completed', recordedAt: 1775011200000 },
          { key: 'rem-m1:2026-05-02T08:00', status: 'skipped', recordedAt: 1775097600000 },
        ],
        createdAt: 1775011200000,
      },
    ]

    const insights = insightService.getWeeklyInsights({
      pet: mockPet,
      reminders,
      growthRecords: [],
    })

    const medInsList = insightService.getPetInsights(insights, 'medication-completion')
    expect(medInsList.length).toBe(1)
    expect(medInsList[0].metadata.rate).toBe(50) // 1 completed, 1 skipped out of 2 total occurrences
    expect(medInsList[0].summary).toContain('完成率約 50%')
  })

  test('7. Insight History and Priorities', () => {
    const historyList = [
      { id: '1', petId: 'coco-123', createdAt: 100, type: 'consecutive-care' as const, priority: 'normal' as const, title: 'B', summary: '', supportingObservationIds: [], supportingContextIds: [], supportingTimelineIds: [], metadata: {}, confidenceLevel: 'high' as const },
      { id: '2', petId: 'coco-123', createdAt: 200, type: 'weight-summary' as const, priority: 'high' as const, title: 'A', summary: '', supportingObservationIds: [], supportingContextIds: [], supportingTimelineIds: [], metadata: {}, confidenceLevel: 'high' as const },
    ]

    // Sorted history (newest first / higher createdAt first)
    const sorted = insightService.getInsightHistory(historyList)
    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')

    // Highlights (priority high or medium)
    const highlights = insightService.getRecentHighlights(historyList)
    expect(highlights.length).toBe(1)
    expect(highlights[0].id).toBe('2')
  })

  test('9. Performance: Fast Insight compilation on dense logs', () => {
    // Generate 500 weight growth logs to evaluate fast rendering
    const denseGrowth: GrowthRecord[] = []
    const startTimestamp = Date.now()

    for (let i = 0; i < 500; i++) {
      denseGrowth.push({
        id: `g-perf-${i}`,
        petId: 'coco-123',
        date: '2026-05-01',
        weightKg: 4.5 + (i % 5) * 0.1,
        note: 'performance check log',
        createdAt: startTimestamp + i * 1000,
      })
    }

    const tStart = performance.now()
    const daily = insightService.getDailyInsights({
      pet: mockPet,
      reminders: [],
      growthRecords: denseGrowth,
    })
    const tEnd = performance.now()

    expect(daily.length).toBeGreaterThan(0)

    // Performance assertion: should compile in less than 50ms (typically under 1ms)
    const elapsedMs = tEnd - tStart
    expect(elapsedMs).toBeLessThan(50)
  })
})

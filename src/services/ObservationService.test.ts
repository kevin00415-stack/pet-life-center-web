import { describe, test, expect } from 'vitest'
import { observationService } from './ObservationService'
import type { Pet, CareReminder, GrowthRecord } from '../domain'

const mockPet: Pet = {
  id: 'coco-123',
  name: '可可',
  avatar: '🐱',
  species: '貓',
}

describe('Observation Engine Foundation Tests', () => {
  test('1. Aggregates different existing source modules & 8. Enforces Pet Isolation', () => {
    const reminders: CareReminder[] = [
      {
        id: 'rem-1',
        petId: 'coco-123',
        kind: 'medication',
        title: '心絲蟲預防藥',
        details: '每月一次',
        startDate: '2026-05-01',
        time: '08:00',
        dailyTimes: ['08:00'],
        repeat: 'monthly',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        occurrenceRecords: [
          { key: 'rem-1:2026-05-01T08:00', status: 'completed', recordedAt: 1775011200000 },
        ],
        createdAt: 1775011200000,
      },
      {
        id: 'rem-other',
        petId: 'some-other-pet',
        kind: 'feeding',
        title: '隔壁小黑的飯',
        details: '每天吃兩次',
        startDate: '2026-05-01',
        time: '12:00',
        dailyTimes: ['12:00'],
        repeat: 'daily',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        createdAt: 1775011200000,
      },
    ]

    const growthRecords: GrowthRecord[] = [
      {
        id: 'g-1',
        petId: 'coco-123',
        date: '2026-05-02',
        weightKg: 4.8,
        note: '體重符合預期',
        createdAt: 1775097600000,
      },
    ]

    const abnormalEvents = [
      { id: 'abn-1', category: 'vomiting', timestamp: 1775184000000, notes: '吐了微黃液體' },
    ]

    const seniorCareHistory = {
      '2026-05-04': { appetite: 'attention', walking: 'attention', notes: '今天後腳無力' },
    }

    const observations = observationService.getObservationsByPet({
      pet: mockPet,
      reminders,
      growthRecords,
      abnormalEvents,
      seniorCareHistory,
    })

    // Assert that we aggregated all four source kinds
    expect(observations.length).toBe(4)

    // Check that we filtered out neighbor's reminders (Pet Isolation)
    const hasOtherPet = observations.some((obs) => obs.petId === 'some-other-pet')
    expect(hasOtherPet).toBe(false)

    // Verify categorization
    const weightObs = observationService.getObservationsByCategory(observations, 'weight')
    expect(weightObs.length).toBe(1)
    expect(weightObs[0].value).toBe(4.8)

    const abnormalObs = observationService.getObservationsByCategory(observations, 'abnormal-event')
    expect(abnormalObs.length).toBe(1)
    expect(abnormalObs[0].value).toBe('vomiting')
  })

  test('2. Groups repeated observations, consecutive streaks, and interval averages', () => {
    // Two sequential weight entries
    const timestamps = [
      new Date('2026-05-01T08:00:00').getTime(),
      new Date('2026-05-02T08:00:00').getTime(),
      new Date('2026-05-03T08:00:00').getTime(),
    ]

    const growthRecords: GrowthRecord[] = [
      { id: 'g-1', petId: 'coco-123', date: '2026-05-01', weightKg: 4.5, note: '', createdAt: timestamps[0] },
      { id: 'g-2', petId: 'coco-123', date: '2026-05-02', weightKg: 4.6, note: '', createdAt: timestamps[1] },
      { id: 'g-3', petId: 'coco-123', date: '2026-05-03', weightKg: 4.7, note: '', createdAt: timestamps[2] },
    ]

    const observations = observationService.getObservationsByPet({
      pet: mockPet,
      reminders: [],
      growthRecords,
    })

    const repeated = observationService.getRepeatedEvents(observations)
    expect(repeated.length).toBe(1)
    expect(repeated[0].category).toBe('weight')
    expect(repeated[0].consecutiveDays).toBe(3) // 3 sequential days
    expect(repeated[0].averageIntervalMs).toBe(24 * 3600 * 1000) // 1 day interval
  })

  test('3. Computes trends (Directions, first/last values, clustering)', () => {
    const timestamps = [
      new Date('2026-05-01T08:00:00').getTime(),
      new Date('2026-05-01T09:00:00').getTime(), // 1 hour later (Cluster coordinate check)
      new Date('2026-05-10T08:00:00').getTime(),
    ]

    const growthRecords: GrowthRecord[] = [
      { id: 'g-1', petId: 'coco-123', date: '2026-05-01', weightKg: 5.0, note: '', createdAt: timestamps[0] },
      { id: 'g-2', petId: 'coco-123', date: '2026-05-01', weightKg: 5.1, note: '', createdAt: timestamps[1] },
      { id: 'g-3', petId: 'coco-123', date: '2026-05-10', weightKg: 4.2, note: '', createdAt: timestamps[2] },
    ]

    const observations = observationService.getObservationsByPet({
      pet: mockPet,
      reminders: [],
      growthRecords,
    })

    const trend = observationService.getObservationTrend(observations, 'weight')
    expect(trend.direction).toBe('downward')
    expect(trend.firstValue).toBe(5.0)
    expect(trend.lastValue).toBe(4.2)
    expect(trend.valueChange).toBeCloseTo(-0.8)
    expect(trend.percentageChange).toBeCloseTo(-16.0)

    // Clusters occurring within 4 hours
    expect(trend.clusterCoordinates.length).toBe(1)
    const expectedClusterCenter = (timestamps[0] + timestamps[1]) / 2
    expect(trend.clusterCoordinates[0]).toBe(expectedClusterCenter)
  })

  test('4. Computes high-fidelity stats (Weekly frequencies, interval calculations, time of day distributions)', () => {
    // Two observations spaced 2 days apart
    const t1 = new Date('2026-05-01T08:30:00').getTime() // morning
    const t2 = new Date('2026-05-03T15:45:00').getTime() // afternoon

    const growthRecords: GrowthRecord[] = [
      { id: 'g-1', petId: 'coco-123', date: '2026-05-01', weightKg: 5.0, note: '', createdAt: t1 },
      { id: 'g-2', petId: 'coco-123', date: '2026-05-03', weightKg: 5.1, note: '', createdAt: t2 },
    ]

    const observations = observationService.getObservationsByPet({
      pet: mockPet,
      reminders: [],
      growthRecords,
    })

    const stats = observationService.getObservationStatistics(observations)
    expect(stats.totalCount).toBe(2)
    expect(stats.averageIntervalMs).toBe(2 * 24 * 3600 * 1000 + (15 - 8) * 3600 * 1000 + 15 * 60 * 1000) // exact diff
    expect(stats.timeOfDayDistribution.morning).toBe(1)
    expect(stats.timeOfDayDistribution.afternoon).toBe(1)
    expect(stats.dayOfWeekDistribution[new Date(t1).getDay()]).toBe(1) // Friday
    expect(stats.dayOfWeekDistribution[new Date(t2).getDay()]).toBe(1) // Sunday
  })

  test('9. Performance benchmark check under a high load of logging records', () => {
    // Generate 1000 weight entries to test fast read-only processing
    const largeGrowth: GrowthRecord[] = []
    const startTimestamp = Date.now()

    for (let i = 0; i < 1000; i++) {
      largeGrowth.push({
        id: `g-perf-${i}`,
        petId: 'coco-123',
        date: '2026-05-01',
        weightKg: 4.0 + (i % 10) * 0.1,
        note: 'performance test record',
        createdAt: startTimestamp + i * 1000,
      })
    }

    const tStart = performance.now()
    const observations = observationService.getObservationsByPet({
      pet: mockPet,
      reminders: [],
      growthRecords: largeGrowth,
    })

    const stats = observationService.getObservationStatistics(observations)
    const tEnd = performance.now()

    expect(observations.length).toBe(1000)
    expect(stats.totalCount).toBe(1000)

    // Performance assertion: Processing 1000 records on single-thread should be blazing fast (typically <10ms)
    const elapsedMs = tEnd - tStart
    expect(elapsedMs).toBeLessThan(100) // safety buffer of 100ms
  })
})

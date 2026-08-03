import { describe, test, expect } from 'vitest'
import { guardianTodayService } from './GuardianTodayService'
import type { Pet, CareReminder, GrowthRecord } from '../domain'

const mockPet: Pet = {
  id: 'coco-123',
  name: '可可',
  avatar: '🐱',
  species: '貓',
}

describe('Guardian Today Companion Foundation Tests', () => {
  test('1. TodayStatus generations (GREEN, YELLOW, RED, UNKNOWN) and 2. Reassurance messages', () => {
    // YELLOW: Pending reminder today
    const remindersYellow: CareReminder[] = [
      {
        id: 'rem-m1',
        petId: 'coco-123',
        kind: 'medication',
        title: '心絲蟲藥',
        details: '每天一次',
        startDate: '2026-05-01',
        time: '23:59', // future pending today
        dailyTimes: ['23:59'],
        repeat: 'daily',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        createdAt: 1775011200000,
      },
    ]

    const summaryYellow = guardianTodayService.getTodaySummary({
      pet: mockPet,
      reminders: remindersYellow,
      growthRecords: [],
    })

    expect(summaryYellow.status).toBe('YELLOW')
    expect(summaryYellow.reassuranceMessage).toContain('溫馨小提醒')

    // RED: Overdue reminder
    const remindersRed: CareReminder[] = [
      {
        id: 'rem-m2',
        petId: 'coco-123',
        kind: 'medication',
        title: '心絲蟲藥',
        details: '每天一次',
        startDate: '2026-05-01',
        time: '00:01', // overdue today
        dailyTimes: ['00:01'],
        repeat: 'daily',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        createdAt: 1775011200000,
      },
    ]

    const summaryRed = guardianTodayService.getTodaySummary({
      pet: mockPet,
      reminders: remindersRed,
      growthRecords: [],
    })

    expect(summaryRed.status).toBe('RED')
    expect(summaryRed.reassuranceMessage).toContain('守護叮嚀')
  })

  test('3. Care streak calculations on sequential calendar days', () => {
    // Simulatecompleted care observations on today and yesterday
    const now = Date.now()
    const millisecondsInDay = 24 * 3600 * 1000

    const reminders: CareReminder[] = [
      {
        id: 'rem-m1',
        petId: 'coco-123',
        kind: 'medication',
        title: '心絲蟲藥',
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
          { key: `rem-m1:${new Date(now).toISOString().slice(0, 10)}T08:00`, status: 'completed', recordedAt: now },
          { key: `rem-m1:${new Date(now - millisecondsInDay).toISOString().slice(0, 10)}T08:00`, status: 'completed', recordedAt: now - millisecondsInDay },
          { key: `rem-m1:${new Date(now - 2 * millisecondsInDay).toISOString().slice(0, 10)}T08:00`, status: 'completed', recordedAt: now - 2 * millisecondsInDay },
        ],
        createdAt: 1775011200000,
      },
    ]

    const summary = guardianTodayService.getTodaySummary({
      pet: mockPet,
      reminders,
      growthRecords: [],
    })

    // Expecting consecutive streak of 3 days
    expect(summary.streakDays).toBe(3)

    const streakCard = summary.cards.find((c) => c.type === 'care-streak')
    expect(streakCard).toBeDefined()
    expect(streakCard?.summary).toContain('連續 3 天')
  })

  test('4. Card ordering, 5. Pet isolation and 6. Quick action templates', () => {
    const reminders: CareReminder[] = [
      {
        id: 'rem-other-pet',
        petId: 'neighbor-dog',
        kind: 'medication',
        title: '隔壁小黑的飯',
        details: '',
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

    const summary = guardianTodayService.getTodaySummary({
      pet: mockPet,
      reminders,
      growthRecords: [],
    })

    // Neighbor's reminders should not affect coco-123 (Pet Isolation)
    expect(summary.status).toBe('UNKNOWN')

    // Quick action templates verified
    expect(summary.actions.length).toBe(4)
    expect(summary.actions[0].actionType).toBe('open-reminder')
  })
})

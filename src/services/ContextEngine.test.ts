import { describe, test, expect } from 'vitest'
import { contextEngine } from './ContextEngine'
import type { PetObservation } from './ObservationTypes'
import type { CareReminder, GrowthRecord } from '../domain'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'

const mockObs: PetObservation = {
  id: 'obs-test-999',
  petId: 'coco-123',
  timestamp: 1775097600000, // May 2, 2026, 08:00 UTC
  eventType: 'Abnormal:vomiting',
  category: 'abnormal-event',
  value: 'vomiting',
  severity: 'high',
  metadata: {},
  sourceType: 'health',
  sourceId: 'ev-999',
  attachmentIds: ['attach-photo-001'],
  notes: '吐了黃色液體',
}

describe('Guardian Context Engine Foundation Tests', () => {
  test('1. Context window calculations and 2. Nearby event aggregations with 3. Pet Isolation', () => {
    // Timeline events: two within temporal window, one outside, and one from another pet
    const timelineEvents: UnifiedTimelineEvent[] = [
      {
        id: 't-near-1',
        petId: 'coco-123',
        timestamp: 1775097600000 - 15 * 60 * 1000, // 15 mins before (INSIDE '1h' window)
        category: 'Medication',
        title: '吃保健品',
        subtitle: '',
        description: '吃藥完成',
        attachmentIds: ['attach-voice-01'],
        sourceType: 'reminder',
        sourceId: 'rem-m1',
        importance: 'normal',
        emotionType: 'ReminderCompleted',
      },
      {
        id: 't-near-2',
        petId: 'coco-123',
        timestamp: 1775097600000 + 40 * 60 * 1000, // 40 mins after (INSIDE '1h' window)
        category: 'Weight',
        title: '體重計量',
        subtitle: '',
        description: '體重已更新',
        attachmentIds: [],
        sourceType: 'growth',
        sourceId: 'g-1',
        importance: 'normal',
        emotionType: 'Weight',
      },
      {
        id: 't-far-3',
        petId: 'coco-123',
        timestamp: 1775097600000 + 5 * 3600 * 1000, // 5 hours after (OUTSIDE '1h' window)
        category: 'Diary',
        title: '散步日記',
        subtitle: '',
        description: '晚上散步了',
        attachmentIds: [],
        sourceType: 'memory',
        sourceId: 'm-1',
        importance: 'normal',
        emotionType: 'Diary',
      },
      {
        id: 't-isolated-4',
        petId: 'neighbor-pet',
        timestamp: 1775097600000, // exact same time but other pet (MUST BE ISOLATED)
        category: 'Medication',
        title: '隔壁小黑的藥',
        subtitle: '',
        description: '吃心絲蟲藥',
        attachmentIds: [],
        sourceType: 'reminder',
        sourceId: 'rem-x',
        importance: 'normal',
        emotionType: 'ReminderCompleted',
      },
    ]

    const reminders: CareReminder[] = [
      {
        id: 'rem-m1',
        petId: 'coco-123',
        kind: 'medication',
        title: '吃藥藥',
        details: '每天一次',
        startDate: '2026-05-01',
        time: '07:45',
        dailyTimes: ['07:45'],
        repeat: 'daily',
        advanceMinutes: [],
        enabled: true,
        sound: 'system',
        completedOccurrences: [],
        occurrenceRecords: [
          { key: 'rem-m1:2026-05-02T07:45', status: 'completed', recordedAt: 1775097600000 - 15 * 60 * 1000 },
        ],
        createdAt: 1775011200000,
      },
    ]

    const growthRecords: GrowthRecord[] = [
      {
        id: 'g-1',
        petId: 'coco-123',
        date: '2026-05-02',
        weightKg: 5.2,
        note: '體重已更新',
        createdAt: 1775097600000 + 40 * 60 * 1000,
      },
    ]

    const snapshot = contextEngine.getContextSnapshot({
      observation: mockObs,
      windowCode: '1h', // 1 hour temporal boundaries
      timelineEvents,
      reminders,
      growthRecords,
    })

    // Window validation (1775097600000 +/- 1 hour)
    expect(snapshot.windowStart).toBe(1775097600000 - 3600000)
    expect(snapshot.windowEnd).toBe(1775097600000 + 3600000)

    // Check that isolated and far events are excluded
    expect(snapshot.timelineEvents.length).toBe(2)
    const eventIds = snapshot.timelineEvents.map((ev) => ev.id)
    expect(eventIds).toContain('t-near-1')
    expect(eventIds).toContain('t-near-2')
    expect(eventIds).not.toContain('t-far-3')
    expect(eventIds).not.toContain('t-isolated-4')

    // Attachments aggregation: photo from obs and voice from adjacent timeline event
    expect(snapshot.attachments.length).toBe(2)
    expect(snapshot.attachments).toContain('attach-photo-001')
    expect(snapshot.attachments).toContain('attach-voice-01')

    // Notes mapping: compiled notes naturally from obs and adjacent event descriptions
    expect(snapshot.ownerNotes).toContain('吐了黃色液體')
    expect(snapshot.ownerNotes).toContain('吃藥完成')

    // Timeline ordering (newest first from Outer timelineEvents helper)
    const contextTimeline = contextEngine.getContextTimeline(snapshot)
    expect(contextTimeline[0].timestamp).toBeGreaterThan(contextTimeline[1].timestamp)

    // Adherence rates inside window
    expect(snapshot.statistics.medicationAdherenceRate).toBe(100)
    expect(snapshot.statistics.daysSinceLastWeightLog).toBe(0) // same day weight record
  })

  test('9. Performance check: Context window aggregations perform highly under dense datasets', () => {
    // Generate 500 timeline events to benchmark fast context window calculations
    const denseTimeline: UnifiedTimelineEvent[] = []
    const startTimestamp = Date.now()

    for (let i = 0; i < 500; i++) {
      denseTimeline.push({
        id: `t-perf-${i}`,
        petId: 'coco-123',
        timestamp: startTimestamp + (i - 250) * 10 * 1000, // centered tightly around startTimestamp
        category: 'Diary',
        title: `Performance entry ${i}`,
        subtitle: '',
        description: `Description ${i}`,
        attachmentIds: [],
        sourceType: 'memory',
        sourceId: `m-${i}`,
        importance: 'normal',
        emotionType: 'Diary',
      })
    }

    const tStart = performance.now()
    const snapshot = contextEngine.getContextSnapshot({
      observation: { ...mockObs, timestamp: startTimestamp },
      windowCode: '1h',
      timelineEvents: denseTimeline,
      reminders: [],
      growthRecords: [],
    })
    const tEnd = performance.now()

    expect(snapshot.timelineEvents.length).toBeGreaterThan(0)

    // Performance assertion: calculated window filter should complete in less than 50ms (typically under 1ms)
    const elapsedMs = tEnd - tStart
    expect(elapsedMs).toBeLessThan(50)
  })
})

import { describe, test, expect } from 'vitest'
import { caseJourneyService } from './CaseJourneyService'
import type { PetObservation } from './ObservationTypes'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'

describe('Guardian Case Journey Foundation Tests', () => {
  test('1. Case initialization, 5. Discussion item tracking, and 6. Status tracking', () => {
    // 1. Initialize a new Case
    const rawCase = caseJourneyService.createCase({
      petId: 'coco-123',
      title: '可可的腸胃炎關護記錄',
      primaryCondition: '嘔吐與食慾不振',
      ownerNotes: '初次記錄：早上吐了黃色液體兩次',
    })

    expect(rawCase.caseId).toBeDefined()
    expect(rawCase.petId).toBe('coco-123')
    expect(rawCase.title).toBe('可可的腸胃炎關護記錄')
    expect(rawCase.status).toBe('Open')

    // 5. Discussion items: Prepared questions to ask veterinarian
    const disc = caseJourneyService.addDiscussionItem(
      rawCase.caseId,
      '需要做血檢或是腹部超音波檢查嗎？',
      '關心嘔吐是否為慢性胰臟炎引起'
    )
    expect(disc).toBeDefined()
    expect(disc?.question).toBe('需要做血檢或是腹部超音波檢查嗎？')

    // 6. Status tracking
    const updated = caseJourneyService.updateCaseStatus(rawCase.caseId, 'Monitoring')
    expect(updated).toBeDefined()
    expect(updated?.status).toBe('Monitoring')

    // Pet Isolation check (Only returns cases belonging to coco-123)
    const neighborCases = caseJourneyService.getCasesByPet('neighbor-dog')
    expect(neighborCases.length).toBe(0)

    const petCases = caseJourneyService.getCasesByPet('coco-123')
    expect(petCases.length).toBe(1)
  })

  test('3. Chronological timeline assembly and 4. Concise Vet Visit summary sheets', () => {
    // Re-create a specific case for this test
    const targetCase = caseJourneyService.createCase({
      petId: 'coco-123',
      title: '可可的骨關節與步態追蹤',
      primaryCondition: '後腳無力',
    })

    const allObservations: PetObservation[] = [
      {
        id: 'obs-weight-1',
        petId: 'coco-123',
        timestamp: 1775011200000,
        eventType: 'WeightRecord',
        category: 'weight',
        value: 5.4,
        severity: 'normal',
        metadata: {},
        sourceType: 'growth',
        sourceId: 'g-1',
        attachmentIds: [],
      },
      {
        id: 'obs-abnormal-1',
        petId: 'coco-123',
        timestamp: 1775097600000,
        eventType: 'Abnormal:walking',
        category: 'abnormal-event',
        value: 'walking',
        severity: 'high',
        metadata: {},
        sourceType: 'health',
        sourceId: 'abn-1',
        attachmentIds: [],
      },
    ]

    const allTimelineEvents: UnifiedTimelineEvent[] = [
      {
        id: 't-reminder-1',
        petId: 'coco-123',
        timestamp: 1775184000000,
        category: 'Medication',
        title: '吃關節保健藥',
        subtitle: '吃藥完成',
        description: '順利吞服',
        attachmentIds: [],
        sourceType: 'reminder',
        sourceId: 'rem-m1',
        importance: 'normal',
        emotionType: 'ReminderCompleted',
      },
    ]

    // Link records to Case
    caseJourneyService.linkRecords(targetCase.caseId, {
      observationIds: ['obs-weight-1', 'obs-abnormal-1'],
      timelineIds: ['t-reminder-1'],
    })

    // 3. Assemble Chronological Timeline Journey
    const timeline = caseJourneyService.getCaseTimeline(targetCase.caseId, allObservations, allTimelineEvents)
    expect(timeline.observations.length).toBe(2)
    expect(timeline.timelineEvents.length).toBe(1)

    // Validate order (newest first: t-reminder-1 [1775184000000] should be index 0)
    expect(timeline.chronologicalJourney.length).toBe(3)
    expect(timeline.chronologicalJourney[0].type).toBe('timeline-event')
    expect(timeline.chronologicalJourney[0].timestamp).toBe(1775184000000)

    // 4. Concise Vet Visit Summary
    caseJourneyService.addDiscussionItem(targetCase.caseId, '關節藥品需要吃滿一個療程嗎？')

    const briefing = caseJourneyService.getVisitSummary(targetCase.caseId, allObservations, allTimelineEvents)
    expect(briefing).toBeDefined()
    expect(briefing?.caseTitle).toBe('可可的骨關節與步態追蹤')
    expect(briefing?.status).toBe('Open')
    expect(briefing?.symptomsBriefing).toContain('WeightRecord')
    expect(briefing?.symptomsBriefing).toContain('Abnormal:walking')
    expect(briefing?.discussionQuestions).toContain('關節藥品需要吃滿一個療程嗎？')
    expect(briefing?.lastWeight).toBe(5.4)
  })

  test('9. Performance: Fast Case Journey timeline generation under deep logs', () => {
    const targetCase = caseJourneyService.createCase({
      petId: 'coco-123',
      title: '可可的長期照護追蹤',
      primaryCondition: '慢性腎病',
    })

    // Generate 500 records to benchmark fast aggregation
    const largeObservations: PetObservation[] = []
    const linkIds: string[] = []
    const startTimestamp = Date.now()

    for (let i = 0; i < 500; i++) {
      const id = `obs-perf-${i}`
      largeObservations.push({
        id,
        petId: 'coco-123',
        timestamp: startTimestamp + i * 1000,
        eventType: 'SeniorCareObservation',
        category: 'senior-care',
        value: 1,
        severity: 'normal',
        metadata: {},
        sourceType: 'senior-care',
        sourceId: `s-${i}`,
        attachmentIds: [],
      })
      linkIds.push(id)
    }

    caseJourneyService.linkRecords(targetCase.caseId, {
      observationIds: linkIds,
    })

    const tStart = performance.now()
    const journey = caseJourneyService.getCaseTimeline(targetCase.caseId, largeObservations, [])
    const tEnd = performance.now()

    expect(journey.chronologicalJourney.length).toBe(500)

    // Performance assertion: calculated timeline filter should complete in less than 50ms (typically under 1ms)
    const elapsedMs = tEnd - tStart
    expect(elapsedMs).toBeLessThan(50)
  })
})

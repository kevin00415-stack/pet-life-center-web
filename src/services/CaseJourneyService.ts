import { CaseJourneyModel } from './CaseJourneyModel'
import type { GuardianCase, CaseStatus, CaseDiscussionItem, CaseVisitLog } from './CaseJourneyTypes'
import type { PetObservation } from './ObservationTypes'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'

export class CaseJourneyService {
  private cases: GuardianCase[] = []

  /**
   * Initializes or creates a new Care Case Journey for a pet securely.
   */
  createCase(params: {
    petId: string
    title: string
    primaryCondition: string
    ownerNotes?: string
    metadata?: Record<string, any>
  }): GuardianCase {
    const model = CaseJourneyModel.createNewCase(params)
    const raw = model.toJSON()
    this.cases.push(raw)
    return raw
  }

  /**
   * Fetches registered cases for a specific pet.
   */
  getCasesByPet(petId: string): GuardianCase[] {
    return this.cases.filter((c) => c.petId === petId)
  }

  /**
   * Updates organization status of a case.
   */
  updateCaseStatus(caseId: string, status: CaseStatus): GuardianCase | null {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return null
    match.status = status
    match.updatedAt = Date.now()
    return { ...match }
  }

  /**
   * Adds an observation discussion item (e.g., questions to ask vet) to a case.
   */
  addDiscussionItem(caseId: string, question: string, notes?: string): CaseDiscussionItem | null {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return null

    const item: CaseDiscussionItem = {
      id: `disc-${crypto.randomUUID()}`,
      timestamp: Date.now(),
      question,
      notes,
    }
    match.discussionItems.push(item)
    match.updatedAt = Date.now()
    return item
  }

  /**
   * Logs a veterinarian clinic follow-up visit.
   */
  addVisitLog(caseId: string, log: Omit<CaseVisitLog, 'id' | 'timestamp'>): CaseVisitLog | null {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return null

    const visit: CaseVisitLog = {
      id: `visit-${crypto.randomUUID()}`,
      timestamp: Date.now(),
      ...log,
    }
    match.visitHistory.push(visit)
    match.updatedAt = Date.now()
    return visit
  }

  /**
   * Links a list of existing observation/timeline/context IDs to the case securely.
   */
  linkRecords(
    caseId: string,
    params: {
      observationIds?: string[]
      timelineIds?: string[]
      contextIds?: string[]
      insightIds?: string[]
      attachmentIds?: string[]
    }
  ): GuardianCase | null {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return null

    if (params.observationIds) match.observationIds = [...new Set([...match.observationIds, ...params.observationIds])]
    if (params.timelineIds) match.timelineIds = [...new Set([...match.timelineIds, ...params.timelineIds])]
    if (params.contextIds) match.contextIds = [...new Set([...match.contextIds, ...params.contextIds])]
    if (params.insightIds) match.insightIds = [...new Set([...match.insightIds, ...params.insightIds])]
    if (params.attachmentIds) match.attachmentIds = [...new Set([...match.attachmentIds, ...params.attachmentIds])]

    match.updatedAt = Date.now()
    return { ...match }
  }

  /**
   * Assembles a chronologically sorted Care Journey Timeline combining linked observations and contexts safely.
   */
  getCaseTimeline(
    caseId: string,
    allObservations: PetObservation[],
    allTimelineEvents: UnifiedTimelineEvent[]
  ): {
    observations: PetObservation[]
    timelineEvents: UnifiedTimelineEvent[]
    chronologicalJourney: Array<{ timestamp: number; type: 'observation' | 'timeline-event'; data: any }>
  } {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return { observations: [], timelineEvents: [], chronologicalJourney: [] }

    const linkedObs = allObservations.filter((obs) => match.observationIds.includes(obs.id))
    const linkedEvents = allTimelineEvents.filter((ev) => match.timelineIds.includes(ev.id))

    const chronologicalJourney: Array<{ timestamp: number; type: 'observation' | 'timeline-event'; data: any }> = []

    linkedObs.forEach((obs) => {
      chronologicalJourney.push({
        timestamp: obs.timestamp,
        type: 'observation',
        data: obs,
      })
    })

    linkedEvents.forEach((ev) => {
      chronologicalJourney.push({
        timestamp: ev.timestamp,
        type: 'timeline-event',
        data: ev,
      })
    })

    chronologicalJourney.sort((a, b) => b.timestamp - a.timestamp) // newest first

    return {
      observations: linkedObs,
      timelineEvents: linkedEvents,
      chronologicalJourney,
    }
  }

  /**
   * Generates a concise, read-only one-page Vet Briefing Summary to print or show veterinarians during consultations.
   */
  getVisitSummary(
    caseId: string,
    allObservations: PetObservation[],
    allTimelineEvents: UnifiedTimelineEvent[]
  ): {
    caseTitle: string
    status: CaseStatus
    primaryCondition: string
    durationDays: number
    symptomsBriefing: string[]
    discussionQuestions: string[]
    lastWeight?: number
    recentObservationsCount: number
  } | null {
    const match = this.cases.find((c) => c.caseId === caseId)
    if (!match) return null

    const { observations } = this.getCaseTimeline(caseId, allObservations, allTimelineEvents)

    // Calculate duration in days
    const diffMs = Date.now() - match.createdAt
    const durationDays = Math.max(1, Math.ceil(diffMs / (24 * 3600 * 1000)))

    // Gather unique symptom categories observed
    const symptomsBriefing = Array.from(new Set(observations.map((obs) => obs.eventType)))

    // Extract questions prepared for discussion
    const discussionQuestions = match.discussionItems.map((item) => item.question)

    // Extract last observed weight value if available
    const lastWeightObs = observations.filter((obs) => obs.category === 'weight')
    const lastWeight = lastWeightObs.length > 0 ? (lastWeightObs[0].value as number) : undefined

    return {
      caseTitle: match.title,
      status: match.status,
      primaryCondition: match.primaryCondition,
      durationDays,
      symptomsBriefing,
      discussionQuestions,
      lastWeight,
      recentObservationsCount: observations.length,
    }
  }
}

export const caseJourneyService = new CaseJourneyService()
export type { GuardianCase, CaseStatus, CaseDiscussionItem, CaseVisitLog }

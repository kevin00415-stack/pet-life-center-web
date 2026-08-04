import type { GuardianCase, CaseStatus, CaseVisitLog, CaseDiscussionItem } from './CaseJourneyTypes'

export class CaseJourneyModel implements GuardianCase {
  readonly caseId: string
  readonly petId: string
  readonly title: string
  readonly status: CaseStatus
  readonly createdAt: number
  readonly updatedAt: number
  readonly primaryCondition: string
  readonly timelineIds: string[]
  readonly observationIds: string[]
  readonly contextIds: string[]
  readonly insightIds: string[]
  readonly attachmentIds: string[]
  readonly visitHistory: CaseVisitLog[]
  readonly discussionItems: CaseDiscussionItem[]
  readonly ownerNotes?: string
  readonly metadata: Record<string, any>

  constructor(data: GuardianCase) {
    this.caseId = data.caseId
    this.petId = data.petId
    this.title = data.title
    this.status = data.status || 'Open'
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt || data.createdAt
    this.primaryCondition = data.primaryCondition
    this.timelineIds = [...(data.timelineIds || [])]
    this.observationIds = [...(data.observationIds || [])]
    this.contextIds = [...(data.contextIds || [])]
    this.insightIds = [...(data.insightIds || [])]
    this.attachmentIds = [...(data.attachmentIds || [])]
    this.visitHistory = [...(data.visitHistory || [])]
    this.discussionItems = [...(data.discussionItems || [])]
    this.ownerNotes = data.ownerNotes
    this.metadata = { ...data.metadata }
  }

  /**
   * Factory builder to construct a new CaseJourneyModel securely from raw properties.
   */
  static createNewCase(params: {
    petId: string
    title: string
    primaryCondition: string
    ownerNotes?: string
    metadata?: Record<string, any>
  }): CaseJourneyModel {
    const now = Date.now()
    return new CaseJourneyModel({
      caseId: `case-${crypto.randomUUID()}`,
      petId: params.petId,
      title: params.title,
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      primaryCondition: params.primaryCondition,
      timelineIds: [],
      observationIds: [],
      contextIds: [],
      insightIds: [],
      attachmentIds: [],
      visitHistory: [],
      discussionItems: [],
      ownerNotes: params.ownerNotes,
      metadata: params.metadata || {},
    })
  }

  /**
   * Objective conversion back to raw JSON.
   */
  toJSON(): GuardianCase {
    return {
      caseId: this.caseId,
      petId: this.petId,
      title: this.title,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      primaryCondition: this.primaryCondition,
      timelineIds: [...this.timelineIds],
      observationIds: [...this.observationIds],
      contextIds: [...this.contextIds],
      insightIds: [...this.insightIds],
      attachmentIds: [...this.attachmentIds],
      visitHistory: [...this.visitHistory],
      discussionItems: [...this.discussionItems],
      ownerNotes: this.ownerNotes,
      metadata: { ...this.metadata },
    }
  }
}
export type { GuardianCase, CaseStatus, CaseVisitLog, CaseDiscussionItem }

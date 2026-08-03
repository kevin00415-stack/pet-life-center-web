export type InsightType =
  | 'care-activity'
  | 'weight-summary'
  | 'reminder-completion'
  | 'medication-completion'
  | 'timeline-summary'
  | 'memory-summary'
  | 'photo-activity'
  | 'video-activity'
  | 'diary-activity'
  | 'density-summary'
  | 'consecutive-care'

export type InsightPriority = 'low' | 'normal' | 'medium' | 'high'

export interface PetInsight {
  id: string
  petId: string
  createdAt: number
  type: InsightType
  priority: InsightPriority
  title: string
  summary: string
  supportingObservationIds: string[]
  supportingContextIds: string[]
  supportingTimelineIds: string[]
  metadata: Record<string, any>
  confidenceLevel: 'low' | 'medium' | 'high'
}

// ==================================================
// FUTURE COMPATIBILITY INTERFACES
// ==================================================

export interface FuturePatternDiscoveryInsights {
  detectedAnomalies: any[]
  behaviorCorrelations: { eventA: string; eventB: string; score: number }[]
}

export interface FutureVisitModeInsight {
  isPreparedForVet: boolean
  briefingSummaryForDoctor: string // Strictly objective summary, no diagnosis
}

export interface FutureSafetyCenterInsight {
  urgencyLevel: 'green' | 'yellow' | 'red'
  mitigationStepsDisclaimer: string // Local safety reminders, no prescriptive medicine
}

export interface FutureCareJourneyInsight {
  stageCompletedPercentage: number
  outstandingCareChecklist: string[]
}

export interface FutureAIGuardianInsight {
  readOnlySynthesis?: string // Strictly read-only, non-diagnostic automated synthesis
}

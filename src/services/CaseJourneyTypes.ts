export type CaseStatus =
  | 'Open'
  | 'Monitoring'
  | 'Follow-up'
  | 'Recovered'
  | 'Long-term Care'
  | 'Closed'

export interface CaseDiscussionItem {
  id: string
  timestamp: number
  question: string
  answer?: string
  notes?: string
}

export interface CaseVisitLog {
  id: string
  timestamp: number
  vetHospitalName: string
  vetDoctorName?: string
  diagnosisNotes?: string // Strictly objective recording, no diagnostic code synthesis
  treatmentNotes?: string
  nextAppointmentDate?: string
}

export interface GuardianCase {
  caseId: string
  petId: string
  title: string
  status: CaseStatus
  createdAt: number
  updatedAt: number
  primaryCondition: string
  timelineIds: string[]
  observationIds: string[]
  contextIds: string[]
  insightIds: string[]
  attachmentIds: string[]
  visitHistory: CaseVisitLog[]
  discussionItems: CaseDiscussionItem[]
  ownerNotes?: string
  metadata: Record<string, any>
}

// ==================================================
// FUTURE COMPATIBILITY INTERFACES
// ==================================================

export interface FuturePatternDiscoveryContext {
  correlatedPatternIds: string[]
}

export interface FutureVisitModeSession {
  visitModeSessionId: string
  hospitalId: string
  briefingPdfBlobUrl?: string // For direct sharing with vet on consultation
}

export interface FutureSafetyCenterAlerts {
  hasCriticalAlerts: boolean
  notifiedVeterinaryClinics: string[]
}

export interface FutureCareJourneyNavigatorMap {
  currentStageName: string
  targetRecoveryPercentage: number
  milestonesReached: { id: string; name: string; completedAt: number }[]
}

export interface FutureAIGuardianDiagnostics {
  readOnlySynthesis?: string // Strictly objective, read-only dashboard synthesis
}

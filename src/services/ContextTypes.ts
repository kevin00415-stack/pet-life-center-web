import type { PetObservation } from './ObservationTypes'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'
import type { CareReminder, GrowthRecord } from '../domain'

export type ConfigurableContextWindow =
  | '30m'
  | '1h'
  | '2h'
  | '6h'
  | '12h'
  | '24h'

export interface ContextSnapshot {
  observationId: string
  petId: string
  windowStart: number
  windowEnd: number
  observation: PetObservation
  timelineEvents: UnifiedTimelineEvent[]
  reminders: CareReminder[]
  medications: CareReminder[] // Medication kind reminders
  weightRecords: GrowthRecord[]
  attachments: string[] // attachment IDs
  ownerNotes: string[] // compiled note elements
  diaryEntries: any[] // diary entry logs
  statistics: {
    totalEventsCount: number
    medicationAdherenceRate: number
    daysSinceLastWeightLog: number
  }
  metadata: Record<string, any>
}

// ==================================================
// FUTURE COMPATIBILITY INTERFACES
// ==================================================

export interface FuturePatternDiscovery {
  linkedPatterns: any[]
}

export interface FutureVisitModeContext {
  vetHospitalId?: string
  lastVisitTimestamp?: number
}

export interface FutureGuardianSafetyCenter {
  safetyScore: number
  alertLevel: 'green' | 'yellow' | 'red'
}

export interface FutureCareJourneyContext {
  currentStageId: string
  adherencePercentage: number
}

export interface FutureAIGuardianContext {
  readOnlySynthesis?: string // Strictly read-only objective context synthesis
}

export interface FutureTelemetryContext {
  weatherSummary?: { temperature: number; condition: string }
  trackingSummary?: { steps: number; sleepMs: number }
  locationSummary?: { latitude: number; longitude: number }
}

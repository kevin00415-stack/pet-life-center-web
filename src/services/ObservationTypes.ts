export type ObservationCategory =
  | 'weight'
  | 'medication'
  | 'feeding'
  | 'abnormal-event'
  | 'senior-care'
  | 'diary'
  | 'reminder-completed'
  | 'reminder-missed'
  | 'vaccination'

export interface PetObservation {
  id: string
  petId: string
  timestamp: number
  eventType: string
  category: ObservationCategory
  value: number | string
  severity: 'info' | 'normal' | 'low' | 'medium' | 'high'
  metadata: Record<string, any>
  sourceType: 'pet' | 'reminder' | 'growth' | 'senior-care' | 'health' | 'memory' | 'comparison' | 'case-journey'
  sourceId: string
  attachmentIds: string[]
  location?: { latitude: number; longitude: number; name?: string } // Future placeholder
  notes?: string
}

export type TrendDirection = 'upward' | 'downward' | 'stable' | 'unknown'

export interface ObservationStatistics {
  totalCount: number
  eventFrequencyByWeek: number
  averageIntervalMs: number
  timeOfDayDistribution: { morning: number; afternoon: number; evening: number; night: number }
  dayOfWeekDistribution: Record<number, number> // 0 (Sunday) to 6 (Saturday)
  monthDistribution: Record<number, number> // 0 (January) to 11 (December)
  observationDensity: number // Average count of observations per day over the active observation date span
}

export interface RepeatedObservationGroup {
  eventType: string
  category: ObservationCategory
  occurrences: PetObservation[]
  consecutiveDays: number
  averageIntervalMs: number
}

export interface ObservationTrendSummary {
  direction: TrendDirection
  firstValue: number | null
  lastValue: number | null
  valueChange: number | null
  percentageChange: number | null
  clusterCoordinates: number[] // Timestamp centers of high-density clusters
}

// ==================================================
// FUTURE COMPATIBILITY INTERFACES
// ==================================================

export interface FuturePatternDiscoveryEngine {
  discoverPatterns(petId: string): Promise<any[]>
  correlatedObservations: { obsA: PetObservation; obsB: PetObservation; correlationFactor: number }[]
}

export interface FutureVisitMode {
  isVisitModeActive: boolean
  startVisitSession(vetHospitalId: string): void
  exportObservationsToVet(): string // Expose read-only observation data only
}

export interface FutureCaseJourney {
  caseId: string
  title: string
  status: 'ongoing' | 'resolved'
  linkedObservationIds: string[]
  timelineEvents: any[]
}

export interface FutureCareJourneyNavigator {
  currentStage: string
  nextMilestone: string
  adherencePercentage: number
}

export interface FutureAIGuardian {
  analyzeObservationsReadOnly(observations: PetObservation[]): string // Objective, read-only analytics, no diagnosis
}

export interface FutureTelemetryData {
  weatherEvent?: { tempCelsius: number; humidityPercent: number; weatherType: string }
  trackingEvent?: { stepsWalked: number; activeMinutes: number; sleepQualityPercent: number }
}

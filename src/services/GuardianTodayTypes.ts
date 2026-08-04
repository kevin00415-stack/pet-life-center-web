export type TodayStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'

export interface TodayCard {
  id: string
  title: string
  summary: string
  type:
    | 'reminder'
    | 'completed-care'
    | 'weight'
    | 'observation'
    | 'memory'
    | 'attachment'
    | 'care-streak'
    | 'upcoming'
    | 'abnormal-event'
  timestamp: number
  metadata: Record<string, any>
}

export interface TodayAction {
  id: string
  label: string
  icon: string
  actionType:
    | 'open-reminder'
    | 'record-observation'
    | 'record-weight'
    | 'open-timeline'
    | 'open-case-journey'
    | 'add-diary'
    | 'open-medication'
    | 'open-senior-care'
  routeHash: string
}

export interface GuardianTodaySummary {
  petId: string
  status: TodayStatus
  streakDays: number
  reassuranceMessage: string
  cards: TodayCard[]
  actions: TodayAction[]
  metadata: Record<string, any>
}

// ==================================================
// FUTURE COMPATIBILITY INTERFACES
// ==================================================

export interface FutureAIGuardianToday {
  dailyCalmBriefing?: string // Warm, read-only objective synthesis of today's health status
}

export interface FutureWeatherToday {
  hasWeatherImpact: boolean
  calmWeatherTip?: string // Local advice such as "天氣潮濕，注意關節除濕保暖"
}

export interface FutureGovernmentToday {
  isVaccineRegistryUpToDate: boolean
  governmentRegistryNotice?: string
}

export interface FuturePatternDiscoveryToday {
  detectedBehaviorAnomalies: any[]
}

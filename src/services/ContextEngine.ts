import type { PetObservation } from './ObservationTypes'
import type { ContextSnapshot, ConfigurableContextWindow } from './ContextTypes'
import { ContextSnapshotBuilder } from './ContextSnapshot'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'
import type { CareReminder, GrowthRecord } from '../domain'

export class ContextEngine {
  /**
   * Generates a contextual snapshot around a specific target observation securely.
   */
  getContextSnapshot(params: {
    observation: PetObservation
    windowCode: ConfigurableContextWindow
    timelineEvents: UnifiedTimelineEvent[]
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
  }): ContextSnapshot {
    return ContextSnapshotBuilder.createSnapshot(params)
  }

  /**
   * Retrieves adjacent context snapshots around a target observation (both backward-looking and forward-looking).
   */
  getObservationContext(params: {
    observation: PetObservation
    windowCode: ConfigurableContextWindow
    timelineEvents: UnifiedTimelineEvent[]
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
  }): { snapshot: ContextSnapshot; windowCode: ConfigurableContextWindow } {
    const snapshot = this.getContextSnapshot(params)
    return {
      snapshot,
      windowCode: params.windowCode,
    }
  }

  /**
   * Returns a chronologically sorted list of adjacent timeline occurrences surrounding the observation.
   */
  getContextTimeline(snapshot: ContextSnapshot): UnifiedTimelineEvent[] {
    return [...snapshot.timelineEvents].sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Finds events immediately preceding or succeeding the observation within the snapshot limits.
   */
  getNearbyEvents(
    snapshot: ContextSnapshot,
    filterType?: 'reminder' | 'growth' | 'senior-care' | 'health' | 'memory' | 'comparison'
  ): UnifiedTimelineEvent[] {
    const events = snapshot.timelineEvents
    if (!filterType) return [...events]
    return events.filter((ev) => ev.sourceType === filterType)
  }

  /**
   * Returns statistics compiled inside the Context window limit.
   */
  getContextStatistics(snapshot: ContextSnapshot): {
    totalEventsCount: number
    medicationAdherenceRate: number
    daysSinceLastWeightLog: number
  } {
    return { ...snapshot.statistics }
  }
}

export const contextEngine = new ContextEngine()
export type { ContextSnapshot, ConfigurableContextWindow }

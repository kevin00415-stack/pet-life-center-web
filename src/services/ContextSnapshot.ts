import type { PetObservation } from './ObservationTypes'
import type { ContextSnapshot, ConfigurableContextWindow } from './ContextTypes'
import type { UnifiedTimelineEvent } from './TimelineAggregationService'
import type { CareReminder, GrowthRecord } from '../domain'

export class ContextSnapshotBuilder {
  /**
   * Translates temporal ConfigurableContextWindow codes into millisecond duration values securely.
   */
  static getWindowDurationMs(windowCode: ConfigurableContextWindow): number {
    switch (windowCode) {
      case '30m':
        return 30 * 60 * 1000
      case '1h':
        return 60 * 60 * 1000
      case '2h':
        return 2 * 60 * 60 * 1000
      case '6h':
        return 6 * 60 * 60 * 1000
      case '12h':
        return 12 * 60 * 60 * 1000
      case '24h':
        return 24 * 60 * 60 * 1000
      default:
        return 1 * 60 * 60 * 1000 // default 1 hour
    }
  }

  /**
   * Generates a read-only ContextSnapshot around an observation securely.
   */
  static createSnapshot(params: {
    observation: PetObservation
    windowCode: ConfigurableContextWindow
    timelineEvents: UnifiedTimelineEvent[]
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
  }): ContextSnapshot {
    const obs = params.observation
    const duration = this.getWindowDurationMs(params.windowCode)

    const windowStart = obs.timestamp - duration
    const windowEnd = obs.timestamp + duration

    // Filter timeline events within temporal boundaries (multi-pet isolated)
    const timelineEvents = params.timelineEvents.filter(
      (ev) => ev.petId === obs.petId && ev.timestamp >= windowStart && ev.timestamp <= windowEnd
    )

    // Filter reminders (pet isolated)
    const reminders = params.reminders.filter((rem) => rem.petId === obs.petId)

    // Extract medication subset
    const medications = reminders.filter((rem) => rem.kind === 'medication')

    // Filter growth records within boundaries (pet isolated)
    const weightRecords = params.growthRecords.filter(
      (g) =>
        g.petId === obs.petId &&
        (g.createdAt || new Date(g.date + 'T12:00:00').getTime()) >= windowStart &&
        (g.createdAt || new Date(g.date + 'T12:00:00').getTime()) <= windowEnd
    )

    // Retrieve unique attachment ids from observation and timeline events
    const attachmentIdsSet = new Set<string>(obs.attachmentIds || [])
    timelineEvents.forEach((ev) => {
      ev.attachmentIds?.forEach((id) => attachmentIdsSet.add(id))
    })
    const attachments = Array.from(attachmentIdsSet)

    // Compile owner story/notes within temporal boundaries
    const ownerNotes: string[] = []
    if (obs.notes) ownerNotes.push(obs.notes)
    timelineEvents.forEach((ev) => {
      if (ev.description && ev.description !== obs.notes) {
        ownerNotes.push(ev.description)
      }
    })

    // Calculate medication completion adherence rate in current reminders
    let totalOccurrencesCount = 0
    let completedOccurrencesCount = 0
    reminders.forEach((rem) => {
      const records = rem.occurrenceRecords || []
      records.forEach((rec) => {
        const timePart = rec.key.substring(rec.key.indexOf(':') + 1)
        const dateObj = new Date(timePart)
        if (!isNaN(dateObj.getTime()) && dateObj.getTime() >= windowStart && dateObj.getTime() <= windowEnd) {
          totalOccurrencesCount++
          if (rec.status === 'completed' || rec.status === 'late') {
            completedOccurrencesCount++
          }
        }
      })
    })

    const medicationAdherenceRate =
      totalOccurrencesCount > 0 ? (completedOccurrencesCount / totalOccurrencesCount) * 100 : 100

    // Compute days since last weight log
    const petWeights = params.growthRecords
      .filter((g) => g.petId === obs.petId)
      .sort((a, b) => {
        const tA = a.createdAt || new Date(a.date + 'T12:00:00').getTime()
        const tB = b.createdAt || new Date(b.date + 'T12:00:00').getTime()
        return tB - tA // newest first
      })

    let daysSinceLastWeightLog = -1
    if (petWeights.length > 0) {
      const lastWeightTime = petWeights[0].createdAt || new Date(petWeights[0].date + 'T12:00:00').getTime()
      const diffMs = obs.timestamp - lastWeightTime
      daysSinceLastWeightLog = Math.max(0, Math.floor(diffMs / (24 * 3600 * 1000)))
    }

    const totalEventsCount = timelineEvents.length

    return {
      observationId: obs.id,
      petId: obs.petId,
      windowStart,
      windowEnd,
      observation: { ...obs },
      timelineEvents: [...timelineEvents],
      reminders: [...reminders],
      medications: [...medications],
      weightRecords: [...weightRecords],
      attachments: [...attachments],
      ownerNotes: [...ownerNotes],
      diaryEntries: [], // diary placeholder logs
      statistics: {
        totalEventsCount,
        medicationAdherenceRate,
        daysSinceLastWeightLog,
      },
      metadata: { windowCode: params.windowCode },
    }
  }
}
export type { ContextSnapshot, ConfigurableContextWindow }

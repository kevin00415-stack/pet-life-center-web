import type { CareReminder, GrowthRecord, Pet } from '../domain'
import { ObservationModel } from './ObservationModel'
import type {
  PetObservation,
  ObservationCategory,
  ObservationStatistics,
  RepeatedObservationGroup,
  ObservationTrendSummary,
  TrendDirection,
} from './ObservationTypes'

export class ObservationService {
  /**
   * Secure, read-only aggregation of observations for a specific pet.
   */
  getObservationsByPet(params: {
    pet?: Pet
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
    abnormalEvents?: any[]
    seniorCareHistory?: Record<string, any>
  }): PetObservation[] {
    const observations: PetObservation[] = []
    const pet = params.pet
    if (!pet) return []

    const petId = pet.id

    // 1. Growth Weight Records
    const petGrowth = params.growthRecords.filter((g) => g.petId === petId)
    petGrowth.forEach((grow) => {
      observations.push(ObservationModel.fromWeightRecord(grow).toJSON())
    })

    // 2. Abnormal behavior health logs
    const activeAbnormal = params.abnormalEvents || []
    activeAbnormal.forEach((ev) => {
      observations.push(ObservationModel.fromAbnormalEvent(petId, ev).toJSON())
    })

    // 3. Senior care observing logs
    const seniorHistory = params.seniorCareHistory || {}
    Object.entries(seniorHistory).forEach(([dateStr, obs]) => {
      observations.push(ObservationModel.fromSeniorCare(petId, dateStr, obs).toJSON())
    })

    // 4. Care reminders occurrence records
    const petReminders = params.reminders.filter((r) => r.petId === petId)
    petReminders.forEach((rem) => {
      // Aggregate both standard occurrenceRecords and completedOccurrences safely
      const aggregatedKeys = new Set<string>()

      rem.occurrenceRecords?.forEach((rec) => {
        aggregatedKeys.add(rec.key)
        observations.push(
          ObservationModel.fromReminderOccurrence(
            rem.id,
            petId,
            rec.key,
            rec.status,
            rem.title,
            rem.details,
            rem.kind,
            rem.voiceClipId
          ).toJSON()
        )
      })

      rem.completedOccurrences.forEach((key) => {
        if (aggregatedKeys.has(key)) return
        observations.push(
          ObservationModel.fromReminderOccurrence(
            rem.id,
            petId,
            key,
            'completed',
            rem.title,
            rem.details,
            rem.kind,
            rem.voiceClipId
          ).toJSON()
        )
      })
    })

    // Sort chronologically: newest first
    return observations.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Filters observations by category safely.
   */
  getObservationsByCategory(observations: PetObservation[], category: ObservationCategory): PetObservation[] {
    return observations.filter((obs) => obs.category === category)
  }

  /**
   * Exposes sorted timeline feed.
   */
  getObservationTimeline(observations: PetObservation[]): PetObservation[] {
    return [...observations].sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Groups repeated occurrences of identical observation categories/types.
   */
  getRepeatedEvents(observations: PetObservation[]): RepeatedObservationGroup[] {
    const groups: Record<string, PetObservation[]> = {}

    observations.forEach((obs) => {
      const key = `${obs.category}:${obs.eventType}`
      ;(groups[key] ||= []).push(obs)
    })

    return Object.entries(groups)
      .map(([key, list]) => {
        const [category, eventType] = key.split(':')
        const sortedAsc = [...list].sort((a, b) => a.timestamp - b.timestamp)

        // Calculate average intervals
        let sumInterval = 0
        for (let i = 1; i < sortedAsc.length; i++) {
          sumInterval += sortedAsc[i].timestamp - sortedAsc[i - 1].timestamp
        }
        const averageIntervalMs = sortedAsc.length > 1 ? sumInterval / (sortedAsc.length - 1) : 0

        // Calculate consecutive days of occurrences
        let consecutiveDays = 0
        if (sortedAsc.length > 0) {
          consecutiveDays = 1
          let currentStreak = 1
          const millisecondsInDay = 86_400_000

          for (let i = 1; i < sortedAsc.length; i++) {
            const diffMs = sortedAsc[i].timestamp - sortedAsc[i - 1].timestamp
            // If diff is roughly within 24 to 36 hours, increment streak
            if (diffMs > 12 * 3600 * 1000 && diffMs <= 1.5 * millisecondsInDay) {
              currentStreak++
              consecutiveDays = Math.max(consecutiveDays, currentStreak)
            } else if (diffMs > 1.5 * millisecondsInDay) {
              currentStreak = 1
            }
          }
        }

        return {
          eventType,
          category: category as ObservationCategory,
          occurrences: list, // Maintains chronological sort (newest first from outer array)
          consecutiveDays,
          averageIntervalMs,
        }
      })
      .filter((g) => g.occurrences.length >= 2)
  }

  /**
   * Summarizes numeric trends (e.g., weight growth tracking direction/velocity/clusters).
   */
  getObservationTrend(observations: PetObservation[], category: ObservationCategory): ObservationTrendSummary {
    const subset = observations
      .filter((obs) => obs.category === category && typeof obs.value === 'number')
      .sort((a, b) => a.timestamp - b.timestamp)

    if (subset.length === 0) {
      return {
        direction: 'unknown',
        firstValue: null,
        lastValue: null,
        valueChange: null,
        percentageChange: null,
        clusterCoordinates: [],
      }
    }

    const first = subset[0].value as number
    const last = subset[subset.length - 1].value as number
    const valueChange = last - first
    const percentageChange = first !== 0 ? (valueChange / first) * 100 : 0

    let direction: TrendDirection = 'stable'
    if (Math.abs(valueChange) > 0.01) {
      direction = valueChange > 0 ? 'upward' : 'downward'
    }

    // Cluster detection: Group elements occurring within 4 hours (240 minutes) of each other
    const clusters: number[] = []
    const fourHoursMs = 4 * 3600 * 1000
    let tempGroup: PetObservation[] = []

    subset.forEach((obs) => {
      if (tempGroup.length === 0) {
        tempGroup.push(obs)
      } else {
        const lastInGroup = tempGroup[tempGroup.length - 1]
        if (obs.timestamp - lastInGroup.timestamp <= fourHoursMs) {
          tempGroup.push(obs)
        } else {
          if (tempGroup.length >= 2) {
            const avgTime = tempGroup.reduce((sum, x) => sum + x.timestamp, 0) / tempGroup.length
            clusters.push(avgTime)
          }
          tempGroup = [obs]
        }
      }
    })

    if (tempGroup.length >= 2) {
      const avgTime = tempGroup.reduce((sum, x) => sum + x.timestamp, 0) / tempGroup.length
      clusters.push(avgTime)
    }

    return {
      direction,
      firstValue: first,
      lastValue: last,
      valueChange,
      percentageChange,
      clusterCoordinates: clusters,
    }
  }

  /**
   * Generates reusable statistical insights from existing longitudinal pet records.
   */
  getObservationStatistics(observations: PetObservation[]): ObservationStatistics {
    const totalCount = observations.length
    if (totalCount === 0) {
      return {
        totalCount: 0,
        eventFrequencyByWeek: 0,
        averageIntervalMs: 0,
        timeOfDayDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        dayOfWeekDistribution: {},
        monthDistribution: {},
        observationDensity: 0,
      }
    }

    const sortedAsc = [...observations].sort((a, b) => a.timestamp - b.timestamp)

    // Average intervals
    let sumInterval = 0
    for (let i = 1; i < sortedAsc.length; i++) {
      sumInterval += sortedAsc[i].timestamp - sortedAsc[i - 1].timestamp
    }
    const averageIntervalMs = sortedAsc.length > 1 ? sumInterval / (sortedAsc.length - 1) : 0

    // Time distributions
    const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    const dayOfWeek: Record<number, number> = {}
    const monthly: Record<number, number> = {}

    sortedAsc.forEach((obs) => {
      const d = new Date(obs.timestamp)
      const hour = d.getHours()
      const wDay = d.getDay()
      const month = d.getMonth()

      // Standardize Time of Day distributions
      if (hour >= 6 && hour < 12) timeOfDay.morning++
      else if (hour >= 12 && hour < 18) timeOfDay.afternoon++
      else if (hour >= 18 && hour < 24) timeOfDay.evening++
      else timeOfDay.night++

      dayOfWeek[wDay] = (dayOfWeek[wDay] || 0) + 1
      monthly[month] = (monthly[month] || 0) + 1
    })

    // Active timespan density calculations
    const firstTime = sortedAsc[0].timestamp
    const lastTime = sortedAsc[sortedAsc.length - 1].timestamp
    const diffDays = Math.max(1, Math.ceil((lastTime - firstTime) / (86_400_000)))
    const observationDensity = totalCount / diffDays

    // Weekly Frequency
    const eventFrequencyByWeek = (totalCount / diffDays) * 7

    return {
      totalCount,
      eventFrequencyByWeek,
      averageIntervalMs,
      timeOfDayDistribution: timeOfDay,
      dayOfWeekDistribution: dayOfWeek,
      monthDistribution: monthly,
      observationDensity,
    }
  }
}

export const observationService = new ObservationService()
export type { PetObservation, ObservationCategory, ObservationStatistics, RepeatedObservationGroup, ObservationTrendSummary }

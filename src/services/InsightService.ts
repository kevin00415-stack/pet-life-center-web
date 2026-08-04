import { observationService } from './ObservationService'
import { InsightModel } from './InsightModel'
import type { PetInsight, InsightType } from './InsightTypes'
import type { CareReminder, GrowthRecord, Pet } from '../domain'

export class InsightService {
  /**
   * Generates high-fidelity daily insights summaries from raw pet records securely.
   */
  getDailyInsights(params: {
    pet?: Pet
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
    abnormalEvents?: any[]
    seniorCareHistory?: Record<string, any>
  }): PetInsight[] {
    const pet = params.pet
    if (!pet) return []

    const petId = pet.id
    const insights: PetInsight[] = []

    // Compile observations using standard ObservationService
    const observations = observationService.getObservationsByPet(params)
    if (observations.length === 0) return []

    // 1. Consecutive Care Days summary
    const seniorObservations = observationService.getObservationsByCategory(observations, 'senior-care')
    if (seniorObservations.length > 0) {
      const repeated = observationService.getRepeatedEvents(observations)
      const seniorRepeated = repeated.find((g) => g.category === 'senior-care')
      const streak = seniorRepeated ? seniorRepeated.consecutiveDays : 1
      const obsIds = seniorObservations.map((obs) => obs.id)
      insights.push(InsightModel.createConsecutiveCare(petId, streak, obsIds).toJSON())
    }

    // 2. Weight fluctuation summary
    const weightObservations = observationService.getObservationsByCategory(observations, 'weight')
    if (weightObservations.length >= 2) {
      const trend = observationService.getObservationTrend(observations, 'weight')
      if (trend.direction !== 'unknown' && trend.valueChange !== null && trend.percentageChange !== null) {
        const obsIds = weightObservations.map((obs) => obs.id)
        insights.push(
          InsightModel.createWeightSummary(
            petId,
            trend.direction as 'upward' | 'downward' | 'stable',
            trend.valueChange,
            trend.percentageChange,
            obsIds
          ).toJSON()
        )
      }
    }

    return insights
  }

  /**
   * Generates weekly longitudinal insights summaries securely.
   */
  getWeeklyInsights(params: {
    pet?: Pet
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
    abnormalEvents?: any[]
    seniorCareHistory?: Record<string, any>
  }): PetInsight[] {
    const pet = params.pet
    if (!pet) return []

    const petId = pet.id
    const insights: PetInsight[] = []

    // Compile observations
    const observations = observationService.getObservationsByPet(params)
    if (observations.length === 0) return []

    // 1. Medication Completion Weekly summary
    const medicationObservations = observations.filter(
      (obs) => obs.category === 'medication' || obs.category === 'vaccination'
    )
    if (medicationObservations.length > 0) {
      const total = medicationObservations.length
      const completed = medicationObservations.filter((obs) => obs.value === 'completed' || obs.value === 'late').length
      const rate = total > 0 ? (completed / total) * 100 : 100
      const obsIds = medicationObservations.map((obs) => obs.id)
      insights.push(InsightModel.createMedicationCompletion(petId, rate, total, completed, obsIds).toJSON())
    }

    // Include daily insights inside weekly list for comprehensive views
    const daily = this.getDailyInsights(params)
    return [...insights, ...daily]
  }

  /**
   * Retrieves aggregated list of pet insights filtered by type safely.
   */
  getPetInsights(insightsList: PetInsight[], type: InsightType): PetInsight[] {
    return insightsList.filter((ins) => ins.type === type)
  }

  /**
   * Returns a chronologically sorted history of generated pet insights.
   */
  getInsightHistory(insightsList: PetInsight[]): PetInsight[] {
    return [...insightsList].sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Pulls high-priority highlights to display prominently on the dashboard.
   */
  getRecentHighlights(insightsList: PetInsight[]): PetInsight[] {
    return insightsList
      .filter((ins) => ins.priority === 'high' || ins.priority === 'medium')
      .sort((a, b) => b.createdAt - a.createdAt)
  }
}

export const insightService = new InsightService()
export type { PetInsight, InsightType }

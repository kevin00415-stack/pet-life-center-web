import { observationService } from './ObservationService'
import { GuardianTodayModel } from './GuardianTodayModel'
import type { GuardianTodaySummary, TodayStatus, TodayCard, TodayAction } from './GuardianTodayTypes'
import type { PetObservation } from './ObservationTypes'
import type { CareReminder, GrowthRecord, Pet } from '../domain'
import { occurrencesOnDate, occurrenceStatus } from '../domain'

export class GuardianTodayService {
  /**
   * Secure, read-only aggregation of Today's companion layer.
   */
  getTodaySummary(params: {
    pet?: Pet
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
    abnormalEvents?: any[]
    seniorCareHistory?: Record<string, any>
  }): GuardianTodaySummary {
    const pet = params.pet
    if (!pet) {
      return {
        petId: '',
        status: 'UNKNOWN',
        streakDays: 0,
        reassuranceMessage: '請先建立或選擇一位毛孩檔案。',
        cards: [],
        actions: [],
        metadata: {},
      }
    }

    const petId = pet.id
    const petName = pet.name

    // 1. Determine organizational status based on Today Reminders
    const status = this.getTodayStatus(params)

    // 2. Compile observations
    const observations = observationService.getObservationsByPet(params)

    // 3. Compute Consecutive Care streak
    const streakDays = this.calculateStreak(observations)

    // 4. Generate Daily Cards (readable in 5s)
    const cards = this.getTodayCards(petName, params, observations, streakDays)

    // 5. Expose Quick Action triggers
    const actions = this.getTodayActions()

    const reassuranceMessage = GuardianTodayModel.getReassuranceMessage(status, petName)

    return new GuardianTodayModel({
      petId,
      status,
      streakDays,
      reassuranceMessage,
      cards,
      actions,
      metadata: { generatedAt: Date.now() },
    }).toJSON()
  }

  /**
   * Analyzes Today's care reminder statuses to return organizational alert status.
   */
  getTodayStatus(params: {
    pet?: Pet
    reminders: CareReminder[]
  }): TodayStatus {
    const pet = params.pet
    if (!pet) return 'UNKNOWN'

    const petId = pet.id
    const petReminders = params.reminders.filter((r) => r.petId === petId && r.enabled)
    if (petReminders.length === 0) return 'UNKNOWN'

    const todayOccurrences = petReminders.flatMap((r) =>
      occurrencesOnDate(r, new Date()).map((occ) => ({
        reminder: r,
        occurrence: occ,
        status: occurrenceStatus(r, occ),
      }))
    )

    if (todayOccurrences.length === 0) return 'UNKNOWN'

    const hasOverdue = todayOccurrences.some((occ) => occ.status === 'missed')
    if (hasOverdue) return 'RED'

    const hasPending = todayOccurrences.some((occ) => occ.status === 'pending')
    if (hasPending) return 'YELLOW'

    const hasCompleted = todayOccurrences.some(
      (occ) => occ.status === 'completed' || occ.status === 'late' || occ.status === 'skipped'
    )
    if (hasCompleted) return 'GREEN'

    return 'UNKNOWN'
  }

  /**
   * Compiles Today's warm reassurance cards.
   */
  getTodayCards(
    petName: string,
    params: {
      reminders: CareReminder[]
    },
    observations: PetObservation[],
    streakDays: number
  ): TodayCard[] {
    const cards: TodayCard[] = []
    const now = Date.now()

    // 1. Streak Card
    if (streakDays > 0) {
      cards.push({
        id: 'card-streak',
        title: '🌟 連續照護里程碑',
        summary: `你已經連續 ${streakDays} 天為 ${petName} 記錄日常觀測。這樣溫柔的陪伴是寶貝最放心的後盾。`,
        type: 'care-streak',
        timestamp: now,
        metadata: { streakDays },
      })
    }

    // 2. Upcoming reminders card
    const todayReminders = params.reminders.filter((r) => r.enabled)
    const pendingRem = todayReminders
      .flatMap((r) =>
        occurrencesOnDate(r, new Date())
          .filter((occ) => occurrenceStatus(r, occ) === 'pending')
          .map((occ) => ({ reminder: r, occurrence: occ }))
      )
      .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())

    if (pendingRem.length > 0) {
      const next = pendingRem[0]
      const timeStr = next.occurrence.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
      cards.push({
        id: 'card-upcoming',
        title: '⏰ 即將到來的照護項目',
        summary: `今天 ${timeStr} 預計需要完成「${next.reminder.title}」。我們一步步慢慢來就可以囉。`,
        type: 'upcoming',
        timestamp: next.occurrence.getTime(),
        metadata: { reminderId: next.reminder.id },
      })
    }

    // 3. Weight log card
    const weightLogs = observations.filter((obs) => obs.category === 'weight')
    if (weightLogs.length > 0) {
      const lastW = weightLogs[0]
      cards.push({
        id: 'card-weight',
        title: '⚖️ 最新體重足跡',
        summary: `${petName} 的最新體重是 ${lastW.value} kg。穩定的體重成長，最令守護者安心。`,
        type: 'weight',
        timestamp: lastW.timestamp,
        metadata: { weightKg: lastW.value },
      })
    }

    // 4. Abnormal event card
    const abnormalLogs = observations.filter((obs) => obs.category === 'abnormal-event')
    if (abnormalLogs.length > 0) {
      const lastAbn = abnormalLogs[0]
      const categoryLabels: Record<string, string> = {
        vomiting: '嘔吐',
        diarrhea: '拉肚子',
        seizure: '發作',
        injury: '受傷',
      }
      const label = categoryLabels[lastAbn.value as string] || '異樣'
      cards.push({
        id: 'card-abnormal',
        title: '🚨 注意生理異常觀察',
        summary: `近期有登錄「${label}」觀察記錄。一有不適，請記得及時尋求專業獸醫檢查。`,
        type: 'abnormal-event',
        timestamp: lastAbn.timestamp,
        metadata: { category: lastAbn.value },
      })
    }

    // Clean sort: Streak first, then newest timestamps
    return cards.sort((a, b) => {
      if (a.type === 'care-streak') return -1
      if (b.type === 'care-streak') return 1
      return b.timestamp - a.timestamp
    })
  }

  /**
   * Defines standard fast-action templates mapping application modules.
   */
  getTodayActions(): TodayAction[] {
    return [
      { id: 'act-reminder', label: '打開照護提醒', icon: '⏰', actionType: 'open-reminder', routeHash: '#/calendar' },
      { id: 'act-obs', label: '登錄生理觀察', icon: '📝', actionType: 'record-observation', routeHash: '#/senior' },
      { id: 'act-weight', label: '記錄今日體重', icon: '⚖️', actionType: 'record-weight', routeHash: '#/health' },
      { id: 'act-case', label: '打開照護病歷', icon: '🏥', actionType: 'open-case-journey', routeHash: '#/health' },
    ]
  }

  /**
   * Calculates care streaks (consecutive days of completed activities).
   */
  private calculateStreak(observations: PetObservation[]): number {
    const completedObservations = observations.filter(
      (obs) =>
        obs.category === 'senior-care' ||
        obs.category === 'weight' ||
        obs.category === 'reminder-completed' ||
        obs.category === 'medication' ||
        obs.category === 'vaccination'
    )

    if (completedObservations.length === 0) return 0

    // Gather unique local dates of completed records
    const uniqueDates = Array.from(
      new Set(
        completedObservations.map((obs) => {
          const d = new Date(obs.timestamp)
          const pad = (n: number) => String(n).padStart(2, '0')
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        })
      )
    ).sort((a, b) => b.localeCompare(a)) // newest dates first

    if (uniqueDates.length === 0) return 0

    let streak = 0
    const millisecondsInDay = 24 * 3600 * 1000

    // Check if the most recent entry was today or yesterday
    const todayStr = this.getLocalDateString(new Date())
    const yesterdayStr = this.getLocalDateString(new Date(Date.now() - millisecondsInDay))

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0
    }

    streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1]).getTime()
      const prev = new Date(uniqueDates[i]).getTime()
      const diffDays = Math.round((curr - prev) / millisecondsInDay)

      if (diffDays === 1) {
        streak++
      } else if (diffDays > 1) {
        break // streak broken
      }
    }

    return streak
  }

  private getLocalDateString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
}

export const guardianTodayService = new GuardianTodayService()

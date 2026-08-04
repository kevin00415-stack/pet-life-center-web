import type { CareReminder } from '../domain'
import { occurrencesOnDate, occurrenceStatus } from '../domain'

export type ReminderCenterTab = 'today' | 'overdue' | 'upcoming' | 'completed' | 'skipped' | 'all'

export interface ClassifiedOccurrence {
  reminder: CareReminder
  occurrence: Date
  status: 'pending' | 'missed' | 'completed' | 'late' | 'skipped'
  id: string // standard occurrenceKey
}

/**
 * Shared utility for classifying and filtering reminder occurrences.
 * Reused by both CareHome Daily Dashboard and the Reminder Center to ensure 100% data consistency.
 */
export function classifyReminderOccurrences(
  reminders: CareReminder[],
  petId: string,
  now = new Date()
): Record<ReminderCenterTab, ClassifiedOccurrence[]> {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const activeReminders = reminders.filter((r) => r.petId === petId && r.enabled)

  const todayList: ClassifiedOccurrence[] = []
  const overdueList: ClassifiedOccurrence[] = []
  const upcomingList: ClassifiedOccurrence[] = []
  const completedList: ClassifiedOccurrence[] = []
  const skippedList: ClassifiedOccurrence[] = []
  const allList: ClassifiedOccurrence[] = []

  // To build upcoming and overdue we look at a reasonable window, e.g. 30 days past/future
  const past30DaysStart = new Date(todayStart.getTime() - 30 * 86_400_000)
  const future30DaysEnd = new Date(todayEnd.getTime() + 30 * 86_400_000)

  // Step 1: Scan occurrences in range
  activeReminders.forEach((r) => {
    // Collect occurrences on date for Today
    const todayOccs = occurrencesOnDate(r, now)
    todayOccs.forEach((occ) => {
      const status = occurrenceStatus(r, occ, now)
      const id = `${r.id}-${occ.toISOString()}`
      todayList.push({ reminder: r, occurrence: occ, status, id })
    })

    // To scan wider range for upcoming/overdue
    let checkDate = new Date(past30DaysStart)
    while (checkDate <= future30DaysEnd) {
      const occs = occurrencesOnDate(r, checkDate)
      occs.forEach((occ) => {
        const status = occurrenceStatus(r, occ, now)
        const id = `${r.id}-${occ.toISOString()}`

        // General list
        allList.push({ reminder: r, occurrence: occ, status, id })

        // Completed
        if (status === 'completed' || status === 'late') {
          completedList.push({ reminder: r, occurrence: occ, status, id })
        }

        // Skipped
        if (status === 'skipped') {
          skippedList.push({ reminder: r, occurrence: occ, status, id })
        }

        // Overdue classification
        if (occ < now && status === 'missed') {
          overdueList.push({ reminder: r, occurrence: occ, status, id })
        }

        // Upcoming classification (future dates, not today, not completed/skipped)
        if (occ > todayEnd && (status === 'pending' || status === 'missed')) {
          upcomingList.push({ reminder: r, occurrence: occ, status, id })
        }
      })

      // Next day
      checkDate = new Date(checkDate.getTime() + 86_400_000)
    }
  })

  // Deduplicate and sort lists safely
  const sortByTime = (a: ClassifiedOccurrence, b: ClassifiedOccurrence) =>
    a.occurrence.getTime() - b.occurrence.getTime()

  return {
    today: todayList.sort(sortByTime),
    overdue: overdueList.sort(sortByTime),
    upcoming: upcomingList.sort(sortByTime),
    completed: completedList.sort(sortByTime),
    skipped: skippedList.sort(sortByTime),
    all: allList.sort(sortByTime),
  }
}

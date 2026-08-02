export type ReminderKind = 'medication' | 'feeding' | 'vet' | 'vaccine' | 'care'
export type RepeatRule = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Pet = {
  id: string
  name: string
  avatar: string
  species: string
  birthDate?: string
  avatarPhoto?: Blob
  avatarMimeType?: string
  avatarPosition?: { x: number; y: number; zoom: number }
  coverPhoto?: Blob
  coverMimeType?: string
  coverPosition?: { x: number; y: number; zoom: number }
  microchipNumber?: string
  microchipStatus?: string
  lastScanDate?: string
  emergencyContact?: string
  vetHospital?: string
  medicalNotes?: string
}
export type VoiceClip = { id: string; name: string; blob: Blob; mimeType: string; durationMs: number; createdAt: number; source?: 'recording' | 'file' }
export type OccurrenceStatus = 'completed' | 'late' | 'skipped'
export type OccurrenceRecord = { key: string; status: OccurrenceStatus; recordedAt: number }
export type MedicationStock = { initialQuantity: number; doseQuantity: number; unit: string; lowStockThreshold: number }
export type ChecklistItem = { id: string; text: string; completed: boolean }
export type VetVisitDetails = {
  preparationItems: ChecklistItem[]
  questions: ChecklistItem[]
  diagnosis?: string
  instructions?: string
  prescription?: string
  nextVisitDate?: string
  updatedAt?: number
}
export type TimelineEvent = {
  id: string
  petId: string
  kind: ReminderKind
  title: string
  details: string
  date: Date
  status: 'completed' | 'late' | 'skipped' | 'scheduled' | 'recorded'
}
export type MemoryMood = 'happy' | 'calm' | 'funny' | 'brave' | 'miss'
export type MemoryPhoto = { id: string; blob: Blob; mimeType: string; name: string }
export type MemoryVideo = { id: string; blob: Blob; mimeType: string; name: string; size: number }
export type MemoryEntry = { id: string; petId: string; date: string; title: string; note: string; mood: MemoryMood; photos: MemoryPhoto[]; videos?: MemoryVideo[]; createdAt: number }
export type GrowthRecord = { id: string; petId: string; date: string; weightKg: number; bodyLengthCm?: number; chestCm?: number; neckCm?: number; note: string; createdAt: number }
export type CalendarEvent = { id: string; reminder: CareReminder; occurrence: Date }
export type CareReminder = {
  id: string
  petId: string
  kind: ReminderKind
  title: string
  details: string
  dose?: string
  startDate: string
  time: string
  dailyTimes: string[]
  repeat: RepeatRule
  endDate?: string
  advanceMinutes: number[]
  sound: 'system' | 'gentle' | 'bell' | 'voice'
  voiceClipId?: string
  enabled: boolean
  completedOccurrences: string[]
  occurrenceRecords?: OccurrenceRecord[]
  medicationStock?: MedicationStock
  vetVisit?: VetVisitDetails
  createdAt: number
}

export const kindLabels: Record<ReminderKind, string> = { medication: '吃藥', feeding: '吃飯', vet: '看醫生', vaccine: '疫苗', care: '日常護照' }
export const kindIcons: Record<ReminderKind, string> = { medication: '＋', feeding: '♨', vet: '✚', vaccine: '◇', care: '♡' }
export const repeatLabels: Record<RepeatRule, string> = { once: '單次', daily: '每天', weekly: '每週', monthly: '每月', quarterly: '每季', yearly: '每年' }

export function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function occurrenceKey(reminderId: string, date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${reminderId}:${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function legacyOccurrenceKey(reminderId: string, date: Date) {
  return `${reminderId}:${date.toISOString().slice(0, 16)}`
}

export function occurrencesOnDate(reminder: CareReminder, date: Date) {
  if (!reminder.enabled && reminder.repeat !== 'once') return []
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const start = new Date(`${reminder.startDate}T00:00:00`)
  const end = reminder.endDate ? new Date(`${reminder.endDate}T23:59:59`) : undefined
  if (dayStart < new Date(start.getFullYear(), start.getMonth(), start.getDate()) || (end && dayStart > end)) return []
  if (reminder.repeat === 'once' && localDateKey(dayStart) !== reminder.startDate) return []
  if (reminder.repeat !== 'once' && reminder.repeat !== 'daily') {
    const target = localDateKey(dayStart)
    const matches = reminderOccurrences(reminder, start, 500).some((occurrence) => localDateKey(occurrence) === target)
    if (!matches) return []
  }
  const times = reminder.repeat === 'daily' ? reminder.dailyTimes : [reminder.time]
  return times.map((time) => {
    const [hour, minute] = time.split(':').map(Number)
    return new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hour, minute)
  }).sort((a, b) => a.getTime() - b.getTime())
}

export function occurrenceStatus(reminder: CareReminder, occurrence: Date, now = new Date()): 'pending' | 'missed' | OccurrenceStatus {
  const key = occurrenceKey(reminder.id, occurrence)
  const record = reminder.occurrenceRecords?.find((item) => item.key === key)
  if (record) return record.status
  if (reminder.completedOccurrences.includes(key) || reminder.completedOccurrences.includes(legacyOccurrenceKey(reminder.id, occurrence))) return 'completed'
  return occurrence < now ? 'missed' : 'pending'
}

export function reminderOccurrences(reminder: CareReminder, from = new Date(), limit = 48) {
  if (!reminder.enabled) return []
  const result: Date[] = []
  const start = new Date(`${reminder.startDate}T00:00:00`)
  const defaultDays = reminder.repeat === 'yearly' ? 366 * 5 : reminder.repeat === 'quarterly' ? 366 * 2 : reminder.repeat === 'monthly' || reminder.repeat === 'weekly' ? 366 : 120
  const end = reminder.endDate ? new Date(`${reminder.endDate}T23:59:59`) : new Date(from.getTime() + defaultDays * 86_400_000)
  const times = reminder.repeat === 'daily' ? reminder.dailyTimes : [reminder.time]
  const anchorDay = start.getDate()
  const occurrenceDate = (step: number) => {
    if (reminder.repeat === 'once') return new Date(start)
    if (reminder.repeat === 'daily') return new Date(start.getFullYear(), start.getMonth(), start.getDate() + step)
    if (reminder.repeat === 'weekly') return new Date(start.getFullYear(), start.getMonth(), start.getDate() + step * 7)
    const months = reminder.repeat === 'monthly' ? step : reminder.repeat === 'quarterly' ? step * 3 : step * 12
    const targetYear = start.getFullYear() + Math.floor((start.getMonth() + months) / 12)
    const targetMonth = (start.getMonth() + months) % 12
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
    return new Date(targetYear, targetMonth, Math.min(anchorDay, lastDay))
  }
  let step = 0
  let cursor = occurrenceDate(step)
  while (cursor <= end && result.length < limit) {
    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number)
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour, minute)
      const key = occurrenceKey(reminder.id, occurrence)
      if (occurrence >= from && occurrence >= start && occurrence <= end && !reminder.completedOccurrences.includes(key) && !reminder.completedOccurrences.includes(legacyOccurrenceKey(reminder.id, occurrence))) result.push(occurrence)
      if (result.length >= limit) break
    }
    if (reminder.repeat === 'once') break
    step += 1
    cursor = occurrenceDate(step)
  }
  return result.sort((a, b) => a.getTime() - b.getTime()).slice(0, limit)
}

export function nextOccurrence(reminder: CareReminder, from = new Date()) {
  return reminderOccurrences(reminder, from, 1)[0]
}

export function calendarEventsInRange(reminders: CareReminder[], petId: string, from: Date, to: Date) {
  return reminders.filter((reminder) => reminder.petId === petId && reminder.enabled).flatMap((reminder) => reminderOccurrences(reminder, from, 500).filter((occurrence) => occurrence < to).map((occurrence) => ({ id: occurrenceKey(reminder.id, occurrence), reminder, occurrence }))).sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
}

export function medicationStockSummary(reminder: CareReminder) {
  const stock = reminder.medicationStock
  if (!stock || stock.initialQuantity <= 0 || stock.doseQuantity <= 0) return undefined
  const consumedKeys = new Set(reminder.completedOccurrences)
  reminder.occurrenceRecords?.forEach((record) => {
    if (record.status === 'completed' || record.status === 'late') consumedKeys.add(record.key)
  })
  const remaining = Math.max(0, stock.initialQuantity - consumedKeys.size * stock.doseQuantity)
  const dosesPerDay = reminder.repeat === 'daily' ? Math.max(1, reminder.dailyTimes.length) : 1
  const dailyQuantity = dosesPerDay * stock.doseQuantity
  return {
    remaining,
    remainingDays: Math.floor(remaining / dailyQuantity),
    needsRefill: remaining <= stock.lowStockThreshold,
    usedQuantity: stock.initialQuantity - remaining,
  }
}

function dateFromOccurrenceKey(key: string) {
  const value = key.slice(key.indexOf(':') + 1)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function buildHealthTimeline(reminders: CareReminder[], petId: string, now = new Date()) {
  const events: TimelineEvent[] = []

  // Automatically read and merge abnormal events from localStorage to inject into Timeline
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(`maohai-abnormal-events-${petId}`)
    if (saved) {
      try {
        const eventsList = JSON.parse(saved)
        if (Array.isArray(eventsList)) {
          const categoryLabels: Record<string, string> = {
            seizure: '癲癇/抽搐 (Seizure)',
            vomiting: '嘔吐/噁心 (Vomiting)',
            diarrhea: '拉肚子/腹瀉 (Diarrhea)',
            injury: '外傷/受傷 (Injury)',
            walking: '走路異常 (Abnormal Walking)',
            breathing: '呼吸急促/困難 (Breathing)',
            appetite: '食慾不振 (Appetite Loss)',
            other: '其他異常 (Other)',
          }

          eventsList.forEach((ev: any) => {
            let details = ev.notes || '無備註說明'
            if (ev.hasPhoto || ev.hasVideo) {
              const evidenceParts: string[] = []
              if (ev.hasPhoto) evidenceParts.push('📷 照片證據')
              if (ev.hasVideo) evidenceParts.push('🎥 影片證據')
              details += `\n(已附加: ${evidenceParts.join('、')})`
            }
            events.push({
              id: ev.id || `abnormal-${ev.timestamp}`,
              petId,
              kind: 'care',
              title: `🚨 異常：${categoryLabels[ev.category] || '其他異常'}`,
              details,
              date: new Date(ev.timestamp),
              status: 'recorded',
            })
          })
        }
      } catch (e) {
        console.error('Failed to parse abnormal events in timeline builder', e)
      }
    }

    const savedComps = localStorage.getItem(`maohai-visual-comparisons-${petId}`)
    if (savedComps) {
      try {
        const compsList = JSON.parse(savedComps)
        if (Array.isArray(compsList)) {
          const compCategories: Record<string, string> = {
            gait: '步態',
            spirit: '精神狀態',
            skin: '皮膚',
            wound: '傷口',
            body: '體態',
            eating: '進食動作',
            seizure: '抽搐／發作',
            breathing: '呼吸狀態',
            other: '其他',
          }

          compsList.forEach((comp: any) => {
            const catLabel = compCategories[comp.category] || comp.category || '其他'
            const mediaLabel = comp.mediaType === 'video' ? '🎥 影片比對' : '📷 照片比對'
            const details = `過去 vs 現在 | ${mediaLabel}\n備忘: ${comp.note || '無備註'}`
            events.push({
              id: comp.id || `comparison-${comp.createdAt}`,
              petId,
              kind: 'care',
              title: `🔍 視覺比對：${catLabel}`,
              details,
              date: new Date(comp.createdAt),
              status: 'recorded',
            })
          })
        }
      } catch (e) {
        console.error('Failed to parse visual comparisons in timeline builder', e)
      }
    }
  }

  reminders.filter((reminder) => reminder.petId === petId).forEach((reminder) => {
    const recordedKeys = new Set<string>()
    reminder.occurrenceRecords?.forEach((record) => {
      const date = dateFromOccurrenceKey(record.key)
      if (!date) return
      recordedKeys.add(record.key)
      events.push({ id: `${record.key}-${record.status}`, petId, kind: reminder.kind, title: reminder.title, details: reminder.dose || reminder.details || kindLabels[reminder.kind], date, status: record.status })
    })
    reminder.completedOccurrences.forEach((key) => {
      if (recordedKeys.has(key)) return
      const date = dateFromOccurrenceKey(key)
      if (date) events.push({ id: `${key}-completed`, petId, kind: reminder.kind, title: reminder.title, details: reminder.dose || reminder.details || kindLabels[reminder.kind], date, status: 'completed' })
    })
    if (reminder.kind === 'vet') {
      const date = new Date(`${reminder.startDate}T${reminder.time}`)
      const visit = reminder.vetVisit
      const summary = [visit?.diagnosis, visit?.instructions, visit?.prescription].filter(Boolean).join('・') || reminder.details || '看診行程'
      events.push({ id: `${reminder.id}-visit`, petId, kind: 'vet', title: reminder.title, details: summary, date, status: visit?.updatedAt ? 'recorded' : date > now ? 'scheduled' : 'completed' })
    } else if (reminder.kind === 'vaccine') {
      const date = new Date(`${reminder.startDate}T${reminder.time}`)
      events.push({ id: `${reminder.id}-vaccine`, petId, kind: 'vaccine', title: reminder.title, details: reminder.details || '疫苗提醒', date, status: date > now ? 'scheduled' : 'completed' })
    }
  })
  return events.sort((a, b) => b.date.getTime() - a.date.getTime())
}

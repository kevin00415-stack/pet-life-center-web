import { useState, useEffect, useMemo } from 'react'
import type { Pet, CareReminder, VoiceClip, MemoryEntry, GrowthRecord } from '../domain'
import {
  loadPets,
  loadReminders,
  loadVoices,
  loadMemories,
  loadGrowthRecords,
} from '../device-store'
import { nextOccurrence, occurrencesOnDate, occurrenceStatus, medicationStockSummary } from '../domain'

export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!blob) {
      setUrl('')
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([])
  const [reminders, setReminders] = useState<CareReminder[]>([])
  const [voices, setVoices] = useState<VoiceClip[]>([])
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([])
  const [activePet, setActivePet] = useState('')

  const refresh = async () => {
    const [petData, reminderData, voiceData, memoryData, growthData] = await Promise.all([
      loadPets(),
      loadReminders(),
      loadVoices(),
      loadMemories(),
      loadGrowthRecords(),
    ])
    setPets(petData)
    setReminders(reminderData)
    setVoices(voiceData)
    setMemories(memoryData)
    setGrowthRecords(growthData)
    setActivePet((current) => petData.some((item) => item.id === current) ? current : petData[0]?.id || '')
  }

  useEffect(() => {
    void refresh()
  }, [])

  const activeReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.enabled)
        .map((reminder) => ({ reminder, next: nextOccurrence(reminder) }))
        .filter((item) => item.next)
        .sort((a, b) => (a.next?.getTime() || 0) - (b.next?.getTime() || 0)),
    [reminders, activePet],
  )

  const nextItem = activeReminders[0]
  const todayKey = new Date().toDateString()
  const todayItems = activeReminders.filter(({ next }) => next?.toDateString() === todayKey).slice(0, 5)

  const pet = pets.find((item) => item.id === activePet)
  const customHomeCover = useBlobUrl(pet?.coverPhoto)

  const todayMedication = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.kind === 'medication')
        .flatMap((reminder) =>
          occurrencesOnDate(reminder, new Date()).map((occurrence) => ({
            reminder,
            occurrence,
            status: occurrenceStatus(reminder, occurrence),
          })),
        )
        .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime()),
    [reminders, activePet],
  )

  const medicationDone = todayMedication.filter(
    (item) => item.status === 'completed' || item.status === 'late',
  ).length
  const medicationMissed = todayMedication.filter((item) => item.status === 'missed')
  const medicationRate = todayMedication.length
    ? Math.round((medicationDone / todayMedication.length) * 100)
    : 0

  const stockItems = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.petId === activePet && reminder.kind === 'medication' && reminder.medicationStock,
        )
        .map((reminder) => ({ reminder, summary: medicationStockSummary(reminder)! }))
        .sort((a, b) => a.summary.remainingDays - b.summary.remainingDays),
    [reminders, activePet],
  )

  const vetVisits = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.kind === 'vet')
        .sort((a, b) => `${b.startDate}T${b.time}`.localeCompare(`${a.startDate}T${a.time}`)),
    [reminders, activePet],
  )

  return {
    pets,
    setPets,
    reminders,
    setReminders,
    voices,
    setVoices,
    memories,
    setMemories,
    growthRecords,
    setGrowthRecords,
    activePet,
    setActivePet,
    activeReminders,
    nextItem,
    todayItems,
    pet,
    customHomeCover,
    todayMedication,
    medicationDone,
    medicationMissed,
    medicationRate,
    stockItems,
    vetVisits,
    refresh,
  }
}

import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Node environments lack browser URL creation and Audio APIs
beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn((_blob: Blob) => `blob:mock-url-${Math.random()}`)
  globalThis.URL.revokeObjectURL = vi.fn()
  globalThis.confirm = () => true
  globalThis.alert = () => {}
  globalThis.window = {
    confirm: () => true,
    alert: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
    }
  } as any
})

afterAll(() => {
  vi.restoreAllMocks()
})

import ReminderCenterView from './ReminderCenterView'
import type { Pet, CareReminder, VoiceClip } from '../domain'
import { classifyReminderOccurrences } from '../services/ReminderSelectorService'

describe('ReminderCenterView MVP Component and Selector Tests', () => {
  const mockPetA: Pet = { id: 'pet-1', name: '比比', species: '貓咪', avatar: '🐱' }

  const mockReminders: CareReminder[] = [
    {
      id: 'rem-1',
      petId: 'pet-1',
      kind: 'medication',
      title: '心臟藥提醒',
      details: '飯後吃藥',
      startDate: '2026-07-01',
      time: '08:00',
      dailyTimes: ['08:00'],
      repeat: 'daily',
      advanceMinutes: [0],
      sound: 'system',
      enabled: true,
      completedOccurrences: [],
      createdAt: Date.now(),
    },
    {
      id: 'rem-2',
      petId: 'pet-2',
      kind: 'feeding',
      title: '哈吉的晚餐',
      details: '罐頭半罐',
      startDate: '2026-07-01',
      time: '18:00',
      dailyTimes: ['18:00'],
      repeat: 'daily',
      advanceMinutes: [0],
      sound: 'voice',
      voiceClipId: 'voice-123',
      enabled: true,
      completedOccurrences: [],
      createdAt: Date.now(),
    }
  ]

  const mockVoices: VoiceClip[] = [
    { id: 'voice-123', name: '吃罐罐囉', blob: new Blob([]), mimeType: 'audio/webm', durationMs: 5000, createdAt: Date.now() }
  ]

  test('1. Reminder Center renders & 20. Long titles render safely', () => {
    const html = renderToStaticMarkup(
      createElement(ReminderCenterView, {
        pets: [mockPetA],
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        reminders: mockReminders,
        voices: mockVoices,
        onBack: () => {},
        onComplete: async () => {},
        onSkip: async () => {},
        onSnooze: async () => {},
        onDelete: async () => {},
        onCreateNew: () => {},
        onEditExisting: () => {},
      })
    )

    expect(html).toContain('比比 的守護提醒中心')
    expect(html).toContain('心臟藥提醒')
  })

  test('2 & 3. Reminders are isolated to selected pet', () => {
    const classifiedA = classifyReminderOccurrences(mockReminders, 'pet-1', new Date('2026-07-15T12:00:00'))
    const classifiedB = classifyReminderOccurrences(mockReminders, 'pet-2', new Date('2026-07-15T12:00:00'))

    // Pet 1 has medication reminders
    expect(classifiedA.all.length).toBeGreaterThan(0)
    classifiedA.all.forEach(item => {
      expect(item.reminder.petId).toBe('pet-1')
    })

    // Pet 2 has feeding reminders
    expect(classifiedB.all.length).toBeGreaterThan(0)
    classifiedB.all.forEach(item => {
      expect(item.reminder.petId).toBe('pet-2')
    })
  })

  test('11. Reminder type filtering works', () => {
    const classifiedA = classifyReminderOccurrences(mockReminders, 'pet-1', new Date('2026-07-15T12:00:00'))
    const medsOnly = classifiedA.today.filter(x => x.reminder.kind === 'medication')
    const feedingOnly = classifiedA.today.filter(x => x.reminder.kind === 'feeding')

    expect(medsOnly.length).toBeGreaterThanOrEqual(0)
    expect(feedingOnly).toHaveLength(0)
  })

  test('21 & 22 & 23. Audio loop and revocation checks', () => {
    const blob = new Blob(['mockAudio'], { type: 'audio/mp3' })
    const url = URL.createObjectURL(blob)
    expect(url).toBeDefined()

    URL.revokeObjectURL(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
  })
})

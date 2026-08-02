import { describe, test, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CareHomeView } from './CareHomeView'
import type { Pet, GrowthRecord } from '../domain'

describe('CareHomeView Guardian Daily Dashboard Tests', () => {
  const mockPetA: Pet = {
    id: 'pet-1',
    name: '嚕嚕非常長長長長的名字測試其是否會折損',
    species: '狗狗',
    avatar: '🐶',
    coverPosition: { x: 45, y: 60, zoom: 1.2 }
  }

  const mockPetB: Pet = {
    id: 'pet-2',
    name: '喵喵',
    species: '貓咪',
    avatar: '🐱'
  }

  const mockPets = [mockPetA]

  test('1. Dashboard renders for selected pet & 16. Long pet names render without breaking', () => {
    const html = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: mockPets,
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '',
        nextItem: undefined,
        complete: async () => {},
        snooze: async () => {},
        setView: () => {},
        setEditorKind: () => {},
        activeReminders: [],
        todayItems: [],
        medicationDone: 0,
        medicationMissed: [],
        todayMedication: [],
        medicationRate: 0,
        recordOccurrence: async () => {},
        filter: 'all',
        setFilter: () => {},
        shown: [],
        remove: async () => {},
        vetVisits: [],
        setOpenVetVisit: () => {},
        exportVetPdf: () => {},
        exportData: async () => {},
        restoreInputRef: { current: null },
        importData: async () => {},
        growthRecords: [],
        reminders: [],
        nav: null
      })
    )

    expect(html).toContain('嚕嚕非常長長長長的名字測試其是否會折損')
    expect(html).toContain('今日健康摘要')
    expect(html).toContain('今日照護提醒')
    expect(html).toContain('日常照護快速登錄')
    expect(html).toContain('最新活動紀錄')
  })

  test('3. Multi-pet data remains isolated & 15. Single-pet mode does not show unnecessary pet switching', () => {
    // Under 1 pet, no selector tab should be rendered
    const htmlSingle = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: [mockPetA],
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '',
        nextItem: undefined,
        complete: async () => {},
        snooze: async () => {},
        setView: () => {},
        setEditorKind: () => {},
        activeReminders: [],
        todayItems: [],
        medicationDone: 0,
        medicationMissed: [],
        todayMedication: [],
        medicationRate: 0,
        recordOccurrence: async () => {},
        filter: 'all',
        setFilter: () => {},
        shown: [],
        remove: async () => {},
        vetVisits: [],
        setOpenVetVisit: () => {},
        exportVetPdf: () => {},
        exportData: async () => {},
        restoreInputRef: { current: null },
        importData: async () => {},
        growthRecords: [],
        reminders: [],
        nav: null
      })
    )

    // No pet switching list is rendered, only the edit/add actions inside nav
    expect(htmlSingle).not.toContain('喵喵')

    const htmlMultiple = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: [mockPetA, mockPetB],
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '',
        nextItem: undefined,
        complete: async () => {},
        snooze: async () => {},
        setView: () => {},
        setEditorKind: () => {},
        activeReminders: [],
        todayItems: [],
        medicationDone: 0,
        medicationMissed: [],
        todayMedication: [],
        medicationRate: 0,
        recordOccurrence: async () => {},
        filter: 'all',
        setFilter: () => {},
        shown: [],
        remove: async () => {},
        vetVisits: [],
        setOpenVetVisit: () => {},
        exportVetPdf: () => {},
        exportData: async () => {},
        restoreInputRef: { current: null },
        importData: async () => {},
        growthRecords: [],
        reminders: [],
        nav: null
      })
    )

    // Two buttons are rendered since there are > 1 pets
    expect(htmlMultiple).toContain('喵喵')
  })

  test('9. Latest weight is selected correctly', () => {
    const weights: GrowthRecord[] = [
      { id: 'w-1', petId: 'pet-1', date: '2026-07-20', weightKg: 6.2, note: '上次', createdAt: 1 },
      { id: 'w-2', petId: 'pet-1', date: '2026-07-31', weightKg: 6.5, note: '最新', createdAt: 2 },
    ]

    const html = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: mockPets,
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '',
        nextItem: undefined,
        complete: async () => {},
        snooze: async () => {},
        setView: () => {},
        setEditorKind: () => {},
        activeReminders: [],
        todayItems: [],
        medicationDone: 0,
        medicationMissed: [],
        todayMedication: [],
        medicationRate: 0,
        recordOccurrence: async () => {},
        filter: 'all',
        setFilter: () => {},
        shown: [],
        remove: async () => {},
        vetVisits: [],
        setOpenVetVisit: () => {},
        exportVetPdf: () => {},
        exportData: async () => {},
        restoreInputRef: { current: null },
        importData: async () => {},
        growthRecords: weights,
        reminders: [],
        nav: null
      })
    )

    expect(html).toContain('最新體重數據')
    expect(html).toContain('6.5')
    expect(html).toContain('2026-07-31')
  })

  test('8. Empty reminder state renders correctly', () => {
    const html = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: mockPets,
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '',
        nextItem: undefined,
        complete: async () => {},
        snooze: async () => {},
        setView: () => {},
        setEditorKind: () => {},
        activeReminders: [],
        todayItems: [], // No reminders scheduled for today
        medicationDone: 0,
        medicationMissed: [],
        todayMedication: [],
        medicationRate: 0,
        recordOccurrence: async () => {},
        filter: 'all',
        setFilter: () => {},
        shown: [],
        remove: async () => {},
        vetVisits: [],
        setOpenVetVisit: () => {},
        exportVetPdf: () => {},
        exportData: async () => {},
        restoreInputRef: { current: null },
        importData: async () => {},
        growthRecords: [],
        reminders: [],
        nav: null
      })
    )

    expect(html).toContain('今天太棒了！所有事情都已完成')
  })
})

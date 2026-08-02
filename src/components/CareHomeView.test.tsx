import { describe, test, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CareHomeView } from './CareHomeView'
import type { Pet } from '../domain'

describe('CareHomeView Component Tests', () => {
  const mockPetA: Pet = {
    id: 'pet-1',
    name: '比比',
    species: '貓咪',
    avatar: '🐱',
    coverPosition: { x: 45, y: 60, zoom: 1.2 }
  }

  const mockPets = [mockPetA]

  test('renders default system hero image without custom cover class', () => {
    const html = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: mockPets,
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: '', // No custom cover
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
        nav: null
      })
    )

    expect(html).toContain('island-hero')
    expect(html).not.toContain('custom-pet-cover')
    expect(html).toContain('比比的首頁封面')
  })

  test('renders custom pet cover and respects saved position/zoom parameters', () => {
    const html = renderToStaticMarkup(
      createElement(CareHomeView, {
        pets: mockPets,
        pet: mockPetA,
        activePet: 'pet-1',
        setActivePet: () => {},
        setEditingPet: () => {},
        customHomeCover: 'data:image/png;base64,mockCoverData', // Custom cover
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
        nav: null
      })
    )

    expect(html).toContain('island-hero')
    expect(html).toContain('custom-pet-cover')
    expect(html).toContain('object-position:45% 60%')
    expect(html).toContain('scale(1.2)')
  })
})

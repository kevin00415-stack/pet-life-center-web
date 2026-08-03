import { describe, test, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock storage before loading components
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k in store) delete store[k] },
} as any

globalThis.window = {
  localStorage: globalThis.localStorage,
  confirm: () => true,
} as any

import SeniorCareView from './SeniorCareView'
import type { Pet, CareReminder } from '../domain'

describe('SeniorCareView Component Tests', () => {
  const mockPet: Pet = {
    id: 'senior-dog-1',
    name: '嚕嚕',
    species: '狗狗',
    avatar: '🐶',
  }

  const mockTodayMedication: { reminder: CareReminder; occurrence: Date; status: string }[] = []

  beforeEach(() => {
    localStorage.clear()
  })

  test('renders SeniorCareView elements correctly and has no parenthetical English in user UI', () => {
    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: mockPet,
        todayMedication: mockTodayMedication,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    // Verify header title, subtitles, and disclaimer
    expect(html).toContain('嚕嚕的高齡照護中心')
    expect(html).toContain('高齡照護宗旨')
    expect(html).toContain('本系統僅作日常觀察輔助')

    // Verify core metrics section and fields
    expect(html).toContain('1. 每日生理狀況觀察')
    expect(html).toContain('食慾狀況')
    expect(html).toContain('精神活力')
    expect(html).not.toContain('Energy Level')
    expect(html).not.toContain('Good')
    expect(html).not.toContain('Normal')
  })

  test('history is rendered with click triggers and custom detailed display', () => {
    const histData = {
      '2026-07-31': {
        appetite: 'good',
        water: 'attention',
        energy: 'normal',
        walking: 'good',
        sleep: 'normal',
        urination: 'normal',
        defecation: 'normal',
        breathing: 'normal',
        vomiting: 'normal',
        pain: 'normal',
        notes: '今天喝水需要留意，但走路非常良好！',
        medsStatus: { 'med-1-2026-07-31T09:00:00Z': 'completed' },
        savedAt: 1785500000000
      }
    }
    localStorage.setItem('maohai-senior-care-senior-dog-1', JSON.stringify(histData))

    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: mockPet,
        todayMedication: mockTodayMedication,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    expect(html).toContain('5. 歷史狀況追蹤')
    expect(html).toContain('2026年7月31日')
    expect(html).toContain('生理指標：')
    expect(html).toContain('今天喝水需要留意，但走路非常良好！')
  })

  test('pet-isolated history returns isolation successfully', () => {
    const histData = {
      '2026-07-31': {
        appetite: 'good',
        notes: '嚕嚕的紀錄',
      }
    }
    localStorage.setItem('maohai-senior-care-senior-dog-1', JSON.stringify(histData))

    // Render for another pet
    const petB: Pet = { id: 'other-pet', name: '喵喵', species: '貓咪', avatar: '🐱' }
    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: petB,
        todayMedication: mockTodayMedication,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    expect(html).toContain('還沒有任何高齡照護歷史紀錄。')
    expect(html).not.toContain('嚕嚕的紀錄')
  })
})

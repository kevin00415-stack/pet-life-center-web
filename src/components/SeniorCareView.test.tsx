import { describe, test, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SeniorCareView from './SeniorCareView'
import type { Pet, CareReminder } from '../domain'

describe('SeniorCareView Component Tests', () => {
  const mockPet: Pet = {
    id: 'senior-dog-1',
    name: '嚕嚕 (Lulu)',
    species: '狗狗',
    avatar: '🐶',
  }

  const mockTodayMedication: { reminder: CareReminder; occurrence: Date; status: string }[] = []

  test('renders SeniorCareView elements correctly', () => {
    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: mockPet,
        todayMedication: mockTodayMedication,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    // Verify header title, subtitles, and disclaimer
    expect(html).toContain('嚕嚕 (Lulu)的高齡照護中心')
    expect(html).toContain('高齡照護宗旨')
    expect(html).toContain('本系統僅作日常觀察輔助')

    // Verify core metrics section and fields
    expect(html).toContain('1. 每日生理狀況觀察')
    expect(html).toContain('食慾狀況 (Appetite)')
    expect(html).toContain('精神活力 (Energy Level)')
    expect(html).toContain('良好 (Good)')
    expect(html).toContain('正常 (Normal)')
    expect(html).toContain('意 (Attention)')
  })

  test('does not show emergency alert when attention count is zero or one', () => {
    // By default, observation initializes with all fields set to 'normal', so alert is hidden
    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: mockPet,
        todayMedication: mockTodayMedication,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    expect(html).not.toContain('重要照護警示')
  })

  test('renders medication items correctly when todayMedication is populated', () => {
    const mockReminder = {
      id: 'med-1',
      petId: 'senior-dog-1',
      kind: 'medication',
      title: '關節保健粉',
      repeat: 'daily',
      startDate: '2026-07-01',
      enabled: true,
      completedOccurrences: [],
    } as unknown as CareReminder

    const todayMeds = [
      {
        reminder: mockReminder,
        occurrence: new Date('2026-07-31T09:00:00Z'),
        status: 'pending',
      }
    ]

    const html = renderToStaticMarkup(
      createElement(SeniorCareView, {
        pet: mockPet,
        todayMedication: todayMeds,
        recordOccurrence: async () => {},
        onBack: () => {},
      })
    )

    expect(html).toContain('今日服藥進度')
    expect(html).toContain('關節保健粉')
    expect(html).toContain('已服用')
    expect(html).toContain('略過')
    expect(html).toContain('待確認')
  })
})

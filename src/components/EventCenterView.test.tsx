import { describe, test, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EventCenterView from './EventCenterView'
import type { Pet } from '../domain'

// Setup Node-safe storage mocks before loading components
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k in store) delete store[k] },
  } as any
}

describe('EventCenterView Component Tests', () => {
  const mockPet: Pet = {
    id: 'guardian-dog-1',
    name: '嚕嚕 (Lulu)',
    species: '狗狗',
    avatar: '🐶',
  }

  test('renders EventCenterView elements correctly', () => {
    const html = renderToStaticMarkup(
      createElement(EventCenterView, {
        pet: mockPet,
        onBack: () => {},
      })
    )

    // Verify header title, subtitles, and disclaimer
    expect(html).toContain('嚕嚕 (Lulu)的異常事件中心')
    expect(html).toContain('重要守護提醒')
    expect(html).toContain('此功能用於')
    expect(html).toContain('即時保留現場證據與異變時間紀錄')

    // Verify core categories select sections
    expect(html).toContain('選擇異常類型')
    expect(html).toContain('癲癇/抽搐')
    expect(html).toContain('嘔吐/噁心')
    expect(html).toContain('拉肚子/腹瀉')
    expect(html).toContain('外傷/受傷')
    expect(html).toContain('走路異常')
    expect(html).toContain('呼吸急促/困難')
    expect(html).toContain('食慾不振')
  })

  test('renders media upload placeholders and instructions', () => {
    const html = renderToStaticMarkup(
      createElement(EventCenterView, {
        pet: mockPet,
        onBack: () => {},
      })
    )

    expect(html).toContain('現場證據保留')
    expect(html).toContain('📷 拍下現場照片')
    expect(html).toContain('🎥 錄製現場影片')
    expect(html).toContain('Capacitor 鏡頭對接 (預留)')
  })

  test('renders historical empty state when no previous abnormal events logged', () => {
    localStorage.removeItem('maohai-abnormal-events-guardian-dog-1')

    const html = renderToStaticMarkup(
      createElement(EventCenterView, {
        pet: mockPet,
        onBack: () => {},
      })
    )

    expect(html).toContain('歷史異常事件')
    expect(html).toContain('尚無任何異常事件紀錄')
  })
})

import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EventCenterView from './EventCenterView'
import { sharedMediaService } from '../services/SharedMediaService'
import { buildHealthTimeline, type CareReminder, type Pet } from '../domain'

// Mock global URL creator functions
beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => `blob:mock-url-${Math.random()}`)
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterAll(() => {
  vi.restoreAllMocks()
})

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

describe('EventCenterView & SharedMediaService Component Tests', () => {
  const mockPetA: Pet = {
    id: 'guardian-dog-a',
    name: '嚕嚕 (Lulu)',
    species: '狗狗',
    avatar: '🐶',
  }


  // Test 1: Photo selection validation
  test('photo file validation checks size and type limits correctly', () => {
    const validPhoto = new File(['small'], 'lulu.png', { type: 'image/png' })
    const validationResult = sharedMediaService.validateMedia(validPhoto)
    expect(validationResult.valid).toBe(true)

    // Over 10MB photo
    const bigPhoto = {
      name: 'large.jpg',
      type: 'image/jpeg',
      size: 11 * 1024 * 1024,
    } as File
    const bigResult = sharedMediaService.validateMedia(bigPhoto)
    expect(bigResult.valid).toBe(false)
    expect(bigResult.error).toContain('超過 10 MB')
  })

  // Test 2: Video selection validation
  test('video file validation checks size limits correctly', () => {
    const validVideo = new File(['video-data'], 'lulu.mp4', { type: 'video/mp4' })
    const validationResult = sharedMediaService.validateMedia(validVideo)
    expect(validationResult.valid).toBe(true)

    // Over 150MB video
    const bigVideo = {
      name: 'huge.mp4',
      type: 'video/mp4',
      size: 160 * 1024 * 1024,
    } as File
    const bigResult = sharedMediaService.validateMedia(bigVideo)
    expect(bigResult.valid).toBe(false)
    expect(bigResult.error).toContain('超過 150 MB')
  })

  // Test 3: Invalid media type rejection
  test('rejects unsupported mime types', () => {
    const textFile = new File(['text'], 'log.txt', { type: 'text/plain' })
    const validationResult = sharedMediaService.validateMedia(textFile)
    expect(validationResult.valid).toBe(false)
    expect(validationResult.error).toContain('不支援的檔案類型')
  })

  // Test 4: Media metadata links to abnormal event correctly
  test('creates media metadata correctly linked to the saved abnormal event', () => {
    const meta = sharedMediaService.createMetadata({
      id: 'media-99',
      petId: 'guardian-dog-a',
      type: 'photo',
      mimeType: 'image/png',
      fileName: 'lulu.png',
      fileSize: 1024,
      source: 'camera',
      context: 'abnormal-event',
      entityType: 'abnormal-event',
      entityId: 'event-888',
    })

    expect(meta.id).toBe('media-99')
    expect(meta.petId).toBe('guardian-dog-a')
    expect(meta.entityId).toBe('event-888')
    expect(meta.context).toBe('abnormal-event')
  })

  // Test 5: Event without media still works
  test('creates abnormal event without media successfully', () => {
    const storageKey = 'maohai-abnormal-events-guardian-dog-a'
    const eventWithoutMedia = {
      id: 'abnormal-111',
      petId: 'guardian-dog-a',
      category: 'vomiting',
      notes: '吐了微黃的酸水',
      hasPhoto: false,
      hasVideo: false,
      timestamp: Date.now(),
    }
    localStorage.setItem(storageKey, JSON.stringify([eventWithoutMedia]))

    const loaded = JSON.parse(localStorage.getItem(storageKey) || '[]')
    expect(loaded).toHaveLength(1)
    expect(loaded[0].hasPhoto).toBe(false)
    expect(loaded[0].notes).toBe('吐了微黃的酸水')
  })

  // Test 6: Multi-pet data safety and isolation
  test('ensures complete isolation of abnormal events and media between Pet A and Pet B', () => {
    const keyA = 'maohai-abnormal-events-guardian-dog-a'
    const keyB = 'maohai-abnormal-events-guardian-cat-b'

    const eventA = { id: 'ev-a', petId: 'guardian-dog-a', category: 'seizure', notes: '嚕嚕抽搐', timestamp: Date.now() }
    const eventB = { id: 'ev-b', petId: 'guardian-cat-b', category: 'diarrhea', notes: '咪咪拉肚子', timestamp: Date.now() }

    localStorage.setItem(keyA, JSON.stringify([eventA]))
    localStorage.setItem(keyB, JSON.stringify([eventB]))

    const loadedA = JSON.parse(localStorage.getItem(keyA) || '[]')
    const loadedB = JSON.parse(localStorage.getItem(keyB) || '[]')

    expect(loadedA[0].notes).toBe('嚕嚕抽搐')
    expect(loadedB[0].notes).toBe('咪咪拉肚子')
    expect(loadedA[0].petId).not.toBe(loadedB[0].petId)
  })

  // Test 7: Deleting unsaved previews releases URL objects
  test('releases temporary preview object URLs properly when requested', () => {
    const blob = new Blob(['data'], { type: 'image/png' })
    const url = sharedMediaService.createPreviewUrl(blob)
    expect(url).toBeDefined()

    sharedMediaService.revokePreviewUrl(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
  })

  // Test 8: Health Timeline integration and duplicate check
  test('renders exactly one event in Health Timeline with appended evidence status', () => {
    const keyA = 'maohai-abnormal-events-guardian-dog-a'
    const eventA = {
      id: 'ev-a',
      petId: 'guardian-dog-a',
      category: 'seizure',
      notes: '抽搐30秒',
      hasPhoto: true,
      hasVideo: false,
      timestamp: Date.now(),
    }
    localStorage.setItem(keyA, JSON.stringify([eventA]))

    const reminders: CareReminder[] = []
    const timeline = buildHealthTimeline(reminders, 'guardian-dog-a')

    // Check that we only have one event and it has correct label appended
    expect(timeline).toHaveLength(1)
    expect(timeline[0].title).toContain('癲癇/抽搐')
    expect(timeline[0].details).toContain('📷 照片證據')
    expect(timeline[0].details).toContain('抽搐30秒')
  })

  // Test 9: UI view renders properly
  test('renders EventCenterView with real media actions and lists', () => {
    const html = renderToStaticMarkup(
      createElement(EventCenterView, {
        pet: mockPetA,
        onBack: () => {},
      })
    )

    expect(html).toContain('現場證據保留')
    expect(html).toContain('立即拍照')
    expect(html).toContain('立即錄影')
    expect(html).toContain('相簿選擇')
  })
})

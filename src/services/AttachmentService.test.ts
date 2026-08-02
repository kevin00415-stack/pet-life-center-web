import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { attachmentService } from './AttachmentService'

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn((_blob: Blob) => `blob:mock-url-${Math.random()}`)
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('Guardian Attachment Foundation Service Tests', () => {
  test('creates correct unified attachment metadata', () => {
    const meta = attachmentService.createAttachmentMetadata({
      id: 'attach-test-01',
      petId: 'pet-99',
      type: 'medical-report',
      mimeType: 'application/pdf',
      filename: 'blood-report.pdf',
      filesize: 1024 * 1024,
      context: 'medical',
      entityType: 'clinic-visit',
      entityId: 'visit-123',
      tags: ['blood', 'checkup'],
      source: 'gallery',
    })

    expect(meta.id).toBe('attach-test-01')
    expect(meta.petId).toBe('pet-99')
    expect(meta.type).toBe('medical-report')
    expect(meta.mimeType).toBe('application/pdf')
    expect(meta.filename).toBe('blood-report.pdf')
    expect(meta.filesize).toBe(1024 * 1024)
    expect(meta.context).toBe('medical')
    expect(meta.entityType).toBe('clinic-visit')
    expect(meta.entityId).toBe('visit-123')
    expect(meta.tags).toEqual(['blood', 'checkup'])
    expect(meta.source).toBe('gallery')
    expect(meta.version).toBe(1)
    expect(meta.createdAt).toBeGreaterThan(0)
    expect(meta.updatedAt).toBe(meta.createdAt)
  })

  test('validates file size limitations for each attachment type', () => {
    // 1. Valid PDF report
    const goodDoc = new File(['report-data'], 'xray.pdf', { type: 'application/pdf' })
    const goodDocResult = attachmentService.validateAttachment(goodDoc, 'pdf')
    expect(goodDocResult.valid).toBe(true)

    // 2. Oversized PDF doc (> 25MB)
    const bigDoc = {
      name: 'large-mri.pdf',
      type: 'application/pdf',
      size: 26 * 1024 * 1024,
    } as File
    const bigDocResult = attachmentService.validateAttachment(bigDoc, 'pdf')
    expect(bigDocResult.valid).toBe(false)
    expect(bigDocResult.error).toContain('超過 25 MB')

    // 3. Oversized Voice Clip (> 10MB)
    const bigVoice = {
      name: 'long-growl.wav',
      type: 'audio/wav',
      size: 11 * 1024 * 1024,
    } as File
    const bigVoiceResult = attachmentService.validateAttachment(bigVoice, 'voice')
    expect(bigVoiceResult.valid).toBe(false)
    expect(bigVoiceResult.error).toContain('超過 10 MB')
  })

  test('automatically resolves correct attachment type from MIME signatures', () => {
    expect(attachmentService.resolveTypeFromMime('image/png')).toBe('photo')
    expect(attachmentService.resolveTypeFromMime('video/mp4')).toBe('video')
    expect(attachmentService.resolveTypeFromMime('audio/webm')).toBe('voice')
    expect(attachmentService.resolveTypeFromMime('application/pdf')).toBe('pdf')
    expect(attachmentService.resolveTypeFromMime('application/vnd.ms-excel')).toBe('document')
  })

  test('successfully manages and revokes preview object URLs', () => {
    const blob = new Blob(['blood-test'], { type: 'application/pdf' })
    const url = attachmentService.createPreviewUrl(blob)
    expect(url).toBeDefined()

    attachmentService.revokePreviewUrl(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
  })
})

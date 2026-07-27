import { describe, expect, it } from 'vitest'
import type { CareReminder, GrowthRecord, Pet } from './domain'
import { buildVetReportHtml } from './vet-report'

const pet: Pet = { id: 'pet-1', name: '<豆 & 米>', avatar: '🐶', species: 'dog', birthDate: '2022-05-01' }
const reminder: CareReminder = {
  id: 'reminder-1', petId: pet.id, kind: 'medication', title: '心臟藥', details: '飯後', dose: '半顆',
  startDate: '2026-07-01', time: '08:00', dailyTimes: ['08:00', '20:00'], repeat: 'daily',
  advanceMinutes: [0], sound: 'system', enabled: true, completedOccurrences: [], createdAt: 1,
}
const growth: GrowthRecord = { id: 'growth-1', petId: pet.id, date: '2026-07-20', weightKg: 6.2, note: '食慾正常', createdAt: 1 }

describe('vet report', () => {
  it('includes the selected pet health summary without executable user markup', () => {
    const html = buildVetReportHtml({ pet, reminders: [reminder], growthRecords: [growth], generatedAt: new Date('2026-07-27T08:00:00+08:00') })
    expect(html).toContain('&lt;豆 &amp; 米&gt;')
    expect(html).not.toContain('<豆 & 米>')
    expect(html).toContain('心臟藥')
    expect(html).toContain('半顆')
    expect(html).toContain('6.2 kg')
    expect(html).toContain('此文件整理自飼主自行輸入')
  })

  it('does not include photo, video, or audio content', () => {
    const html = buildVetReportHtml({ pet, reminders: [reminder], growthRecords: [growth] })
    expect(html).not.toContain('data:image')
    expect(html).not.toContain('data:audio')
    expect(html).not.toContain('data:video')
  })
})

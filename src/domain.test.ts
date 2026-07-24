import { describe, expect, it } from 'vitest'
import type { CareReminder, GrowthRecord, MemoryEntry } from './domain'
import { buildHealthTimeline, calendarEventsInRange, medicationStockSummary, occurrenceKey, occurrencesOnDate, occurrenceStatus, reminderOccurrences } from './domain'

const base: CareReminder = {
  id: 'medicine-1', petId: 'jiji', kind: 'medication', title: '心臟藥', details: '', dose: '半顆',
  startDate: '2026-07-25', time: '08:00', dailyTimes: ['08:00', '20:00'], repeat: 'daily', endDate: '2026-07-27',
  advanceMinutes: [0], sound: 'voice', voiceClipId: 'voice-1', enabled: true, completedOccurrences: [], createdAt: 1,
}

describe('照護提醒排程', () => {
  it('每天多次服藥會依時間產生排程', () => {
    const result = reminderOccurrences(base, new Date('2026-07-25T07:00:00'), 10)
    expect(result.map((date) => `${date.getDate()}-${date.getHours()}`)).toEqual(['25-8', '25-20', '26-8', '26-20', '27-8', '27-20'])
  })

  it('完成其中一次後不再顯示該次提醒', () => {
    const first = new Date('2026-07-25T08:00:00')
    const result = reminderOccurrences({ ...base, completedOccurrences: [occurrenceKey(base.id, first)] }, new Date('2026-07-25T07:00:00'), 2)
    expect(result[0].getHours()).toBe(20)
  })

  it('單次看診只產生一次', () => {
    const visit: CareReminder = { ...base, id: 'visit-1', kind: 'vet', repeat: 'once', startDate: '2026-07-25', time: '12:00', dailyTimes: ['12:00'], endDate: undefined }
    expect(reminderOccurrences(visit, new Date('2026-07-25T10:00:00'), 10)).toHaveLength(1)
  })

  it('每日吃飯可以設定早餐與晚餐', () => {
    const feeding: CareReminder = { ...base, id: 'feeding-1', kind: 'feeding', title: '吃飯囉', dose: '乾飼料80克', dailyTimes: ['07:30', '18:30'] }
    const result = reminderOccurrences(feeding, new Date('2026-07-25T07:00:00'), 2)
    expect(result.map((date) => `${date.getHours()}:${date.getMinutes()}`)).toEqual(['7:30', '18:30'])
  })

  it('能找出今日已錯過的服藥時段', () => {
    const occurrences = occurrencesOnDate(base, new Date('2026-07-25T21:00:00'))
    expect(occurrences).toHaveLength(2)
    expect(occurrenceStatus(base, occurrences[0], new Date('2026-07-25T21:00:00'))).toBe('missed')
  })

  it('補吃後會顯示為 late 並納入完成', () => {
    const occurrence = new Date('2026-07-25T08:00:00')
    const key = occurrenceKey(base.id, occurrence)
    expect(occurrenceStatus({ ...base, occurrenceRecords: [{ key, status: 'late', recordedAt: 2 }] }, occurrence, new Date('2026-07-25T21:00:00'))).toBe('late')
  })

  it('完成與補吃會自動扣除藥品庫存並估算天數', () => {
    const first = occurrenceKey(base.id, new Date('2026-07-25T08:00:00'))
    const second = occurrenceKey(base.id, new Date('2026-07-25T20:00:00'))
    const summary = medicationStockSummary({ ...base, medicationStock: { initialQuantity: 10, doseQuantity: 1, unit: '顆', lowStockThreshold: 3 }, occurrenceRecords: [{ key: first, status: 'completed', recordedAt: 1 }, { key: second, status: 'late', recordedAt: 2 }] })
    expect(summary).toMatchObject({ remaining: 8, remainingDays: 4, needsRefill: false })
  })

  it('庫存到門檻時標記需要補藥', () => {
    const summary = medicationStockSummary({ ...base, completedOccurrences: ['1', '2'], medicationStock: { initialQuantity: 3, doseQuantity: 1, unit: '顆', lowStockThreshold: 1 } })
    expect(summary).toMatchObject({ remaining: 1, needsRefill: true })
  })

  it('看診提醒可保存準備清單、問題與醫囑', () => {
    const visit: CareReminder = { ...base, kind: 'vet', vetVisit: { preparationItems: [{ id: 'p1', text: '帶檢查報告', completed: true }], questions: [{ id: 'q1', text: '是否需要換藥？', completed: false }], diagnosis: '持續觀察', instructions: '一週後追蹤' } }
    expect(visit.vetVisit?.preparationItems[0].completed).toBe(true)
    expect(visit.vetVisit?.instructions).toBe('一週後追蹤')
  })

  it('健康時間軸會整合服藥與看診紀錄', () => {
    const medicine = { ...base, occurrenceRecords: [{ key: occurrenceKey(base.id, new Date('2026-07-25T08:00:00')), status: 'late' as const, recordedAt: 2 }] }
    const visit: CareReminder = { ...base, id: 'visit-2', kind: 'vet', startDate: '2026-07-26', time: '10:00', vetVisit: { preparationItems: [], questions: [], diagnosis: '狀況穩定', updatedAt: 3 } }
    const events = buildHealthTimeline([medicine, visit], base.petId, new Date('2026-07-27T00:00:00'))
    expect(events.map((event) => event.kind)).toEqual(['vet', 'medication'])
    expect(events[0].details).toContain('狀況穩定')
  })

  it('生活回憶可依毛孩保存心情與多張照片欄位', () => {
    const memory: MemoryEntry = { id: 'm1', petId: base.petId, date: '2026-07-25', title: '第一次去海邊', note: '今天很勇敢', mood: 'brave', photos: [], createdAt: 1 }
    expect(memory).toMatchObject({ petId: 'jiji', mood: 'brave', title: '第一次去海邊' })
  })

  it('毛孩頭像可保存水平、垂直與縮放位置', () => {
    const pet = { id: 'bean', name: '小豆', species: '貓咪', avatar: '🐱', avatarPosition: { x: 40, y: 65, zoom: 1.4 } }
    expect(pet.avatarPosition).toEqual({ x: 40, y: 65, zoom: 1.4 })
  })

  it('成長紀錄可保存體重與身體數值', () => {
    const record: GrowthRecord = { id: 'g1', petId: base.petId, date: '2026-07-25', weightKg: 6.25, bodyLengthCm: 42, chestCm: 38, neckCm: 24, note: '狀況穩定', createdAt: 1 }
    expect(record).toMatchObject({ weightKg: 6.25, bodyLengthCm: 42, chestCm: 38 })
  })

  it('每週提醒會間隔七天', () => {
    const weekly: CareReminder = { ...base, repeat: 'weekly', startDate: '2026-07-01', time: '09:00', dailyTimes: ['09:00'], endDate: '2026-07-31' }
    expect(reminderOccurrences(weekly, new Date('2026-07-01T00:00:00'), 3).map((date) => date.getDate())).toEqual([1, 8, 15])
  })

  it('每月提醒遇到月底會使用該月最後一天', () => {
    const monthly: CareReminder = { ...base, repeat: 'monthly', startDate: '2027-01-31', time: '09:00', dailyTimes: ['09:00'], endDate: '2027-04-30' }
    expect(reminderOccurrences(monthly, new Date('2027-01-01T00:00:00'), 3).map((date) => `${date.getMonth() + 1}/${date.getDate()}`)).toEqual(['1/31', '2/28', '3/31'])
  })

  it('每年提醒能處理閏年日期', () => {
    const yearly: CareReminder = { ...base, repeat: 'yearly', startDate: '2028-02-29', time: '09:00', dailyTimes: ['09:00'], endDate: '2030-12-31' }
    expect(reminderOccurrences(yearly, new Date('2028-01-01T00:00:00'), 3).map((date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)).toEqual(['2028-2-29', '2029-2-28', '2030-2-28'])
  })

  it('月曆只整理指定毛孩與月份內的行程', () => {
    const weekly: CareReminder = { ...base, kind: 'care', repeat: 'weekly', startDate: '2026-07-01', time: '09:00', dailyTimes: ['09:00'], endDate: '2026-08-31' }
    const otherPet: CareReminder = { ...weekly, id: 'other', petId: 'coco' }
    const events = calendarEventsInRange([weekly, otherPet], 'jiji', new Date('2026-07-01T00:00:00'), new Date('2026-08-01T00:00:00'))
    expect(events.map((event) => event.occurrence.getDate())).toEqual([1, 8, 15, 22, 29])
  })
})

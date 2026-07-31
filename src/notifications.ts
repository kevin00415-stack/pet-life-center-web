import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { CareReminder, Pet } from './domain'
import { kindLabels, reminderOccurrences } from './domain'

function getSafeNotificationSound(sound: CareReminder['sound']): string | undefined {
  if (sound === 'system' || sound === 'voice') return undefined
  // bell.wav and gentle.wav are missing from native resources in current version.
  // We safely default to undefined to prevent silent notifications until they are bundled.
  const BUNDLED_SOUNDS: string[] = []
  if (BUNDLED_SOUNDS.includes(sound)) {
    return `${sound}.wav`
  }
  return undefined // Safe fallback to system default sound
}

function notificationId(reminderId: string, occurrence: Date, advance: number) {
  const source = `${reminderId}-${occurrence.toISOString()}-${advance}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0
  return Math.abs(hash) || 1
}

export async function ensureNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return 'web' as const
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return 'granted' as const
  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted' ? 'granted' as const : 'denied' as const
}

export async function getNotificationDiagnostics() {
  if (!Capacitor.isNativePlatform()) return { platform: 'web', permission: 'web', exactAlarm: 'not-required' } as const
  const permission = await LocalNotifications.checkPermissions()
  if (Capacitor.getPlatform() !== 'android') return { platform: Capacitor.getPlatform(), permission: permission.display, exactAlarm: 'not-required' } as const
  const exact = await LocalNotifications.checkExactNotificationSetting()
  return { platform: 'android', permission: permission.display, exactAlarm: exact.exact_alarm } as const
}

export async function scheduleTestNotification() {
  if (!Capacitor.isNativePlatform()) return 'web' as const
  const permission = await ensureNotificationPermission()
  if (permission !== 'granted') return 'denied' as const
  await ensureExactAlarmSetting()
  const at = new Date(Date.now() + 10_000)
  await LocalNotifications.schedule({ notifications: [{ id: 1900718, title: '毛孩生活中心・測試通知', body: '本機提醒運作正常，可以安心使用。', schedule: { at, allowWhileIdle: true }, extra: { test: true } }] })
  return 'scheduled' as const
}

async function ensureExactAlarmSetting() {
  if (Capacitor.getPlatform() !== 'android') return
  const current = await LocalNotifications.checkExactNotificationSetting()
  if (current.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting()
}

export async function scheduleCareReminder(reminder: CareReminder, pet: Pet) {
  if (!Capacitor.isNativePlatform()) return { status: 'web' as const, count: 0 }
  const permission = await ensureNotificationPermission()
  if (permission !== 'granted') return { status: 'denied' as const, count: 0 }
  await ensureExactAlarmSetting()
  const notifications = reminderOccurrences(reminder, new Date(), 48).flatMap((occurrence) => {
    const advances = reminder.advanceMinutes.length ? reminder.advanceMinutes : [0]
    return advances.map((advance) => ({
      id: notificationId(reminder.id, occurrence, advance),
      title: `${pet.name}・${kindLabels[reminder.kind]}提醒`,
      body: advance ? `${advance >= 60 ? `${advance / 60}小時` : `${advance}分鐘`}後：${reminder.title}` : reminder.title,
      schedule: { at: new Date(occurrence.getTime() - advance * 60_000), allowWhileIdle: true },
      sound: getSafeNotificationSound(reminder.sound),
      extra: { reminderId: reminder.id, occurrence: occurrence.toISOString(), voiceClipId: reminder.voiceClipId },
    }))
  }).filter((notification) => notification.schedule.at > new Date())
  if (notifications.length) await LocalNotifications.schedule({ notifications: notifications.slice(0, 60) })
  return { status: 'scheduled' as const, count: Math.min(notifications.length, 60) }
}

export async function scheduleSnooze(reminder: CareReminder, pet: Pet, minutes = 10) {
  if (!Capacitor.isNativePlatform()) return 'web' as const
  const permission = await ensureNotificationPermission()
  if (permission !== 'granted') return 'denied' as const
  await ensureExactAlarmSetting()
  const at = new Date(Date.now() + minutes * 60_000)
  await LocalNotifications.schedule({ notifications: [{
    id: notificationId(reminder.id, at, -minutes),
    title: `${pet.name}・稍後提醒`,
    body: reminder.title,
    schedule: { at, allowWhileIdle: true },
    extra: { reminderId: reminder.id, snoozed: true, voiceClipId: reminder.voiceClipId },
  }] })
  return 'scheduled' as const
}

export async function scheduleLowStockReminder(reminder: CareReminder, pet: Pet, remaining: number) {
  if (!Capacitor.isNativePlatform() || !reminder.medicationStock) return 'web' as const
  const permission = await ensureNotificationPermission()
  if (permission !== 'granted') return 'denied' as const
  const at = new Date(Date.now() + 60_000)
  await LocalNotifications.schedule({ notifications: [{
    id: notificationId(reminder.id, new Date(0), -99),
    title: `${pet.name}・該補藥了`,
    body: `${reminder.title}只剩 ${remaining} ${reminder.medicationStock.unit}，請記得補充。`,
    schedule: { at, allowWhileIdle: true },
    extra: { reminderId: reminder.id, lowStock: true },
  }] })
  return 'scheduled' as const
}

export async function cancelCareReminder(reminder: CareReminder) {
  if (!Capacitor.isNativePlatform()) return
  const pending = await LocalNotifications.getPending()
  const matching = pending.notifications.filter((notification) => notification.extra?.reminderId === reminder.id)
  if (matching.length) await LocalNotifications.cancel({ notifications: matching.map(({ id }) => ({ id })) })
}

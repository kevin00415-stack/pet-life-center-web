import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const CARE_ALERT_EVENT = 'maohai:care-alert'

export type CareAlertDetail = {
  phase: 'started' | 'completed'
  notificationId: number
  voiceClipId?: string
}

let initialized = false
let completionTimer: number | undefined
let activeNotificationId = 0

function emit(detail: CareAlertDetail) {
  window.dispatchEvent(new CustomEvent<CareAlertDetail>(CARE_ALERT_EVENT, { detail }))
}

function complete(notificationId: number) {
  if (notificationId !== activeNotificationId) return
  emit({ phase: 'completed', notificationId })
  activeNotificationId = 0
  if (completionTimer) window.clearTimeout(completionTimer)
  completionTimer = undefined
}

/**
 * Coordinates foreground notification sounds with the relaxation player.
 * The operating system owns background notification audio. When the WebView is
 * active, this bridge provides deterministic pause/resume behavior and also
 * deduplicates notifications that arrive close together.
 */
export async function initializeAudioCoordination() {
  if (initialized || !Capacitor.isNativePlatform()) return
  initialized = true

  await LocalNotifications.addListener('localNotificationReceived', (notification) => {
    activeNotificationId = notification.id
    emit({ phase: 'started', notificationId: notification.id, voiceClipId: notification.extra?.voiceClipId })
    if (completionTimer) window.clearTimeout(completionTimer)
    completionTimer = window.setTimeout(() => complete(notification.id), 30_000)
  })

  await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const notificationId = action.notification.id
    if (activeNotificationId === notificationId) complete(notificationId)
  })
}

import { useEffect } from 'react'
import type { VoiceClip } from '../domain'
import { CARE_ALERT_EVENT, type CareAlertDetail } from '../audio-coordination'

export function useAlarmController(voices: VoiceClip[]) {
  useEffect(() => {
    let alertAudio: HTMLAudioElement | undefined
    let alertUrl = ''
    let synthInterval: number | undefined
    let audioCtx: AudioContext | undefined

    const stopAllAlerts = () => {
      if (alertAudio) {
        alertAudio.pause()
        alertAudio = undefined
      }
      if (alertUrl) {
        URL.revokeObjectURL(alertUrl)
        alertUrl = ''
      }
      if (synthInterval) {
        window.clearInterval(synthInterval)
        synthInterval = undefined
      }
      if (audioCtx) {
        void audioCtx.close().catch(() => {})
        audioCtx = undefined
      }
    }

    const handleCareAlert = (event: Event) => {
      const detail = (event as CustomEvent<CareAlertDetail>).detail
      if (detail.phase === 'completed') {
        stopAllAlerts()
        return
      }

      stopAllAlerts()

      const clip = voices.find((item) => item.id === detail.voiceClipId)
      if (clip) {
        alertUrl = URL.createObjectURL(clip.blob)
        alertAudio = new Audio(alertUrl)
        alertAudio.loop = true
        void alertAudio.play().catch((e) => console.error('Audio play blocked:', e))
      } else {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          audioCtx = ctx
          const playBeep = () => {
            if (ctx.state === 'closed') return
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const now = ctx.currentTime
            osc.type = 'sine'
            osc.frequency.setValueAtTime(659.25, now) // Mi
            osc.frequency.setValueAtTime(880.00, now + 0.15) // La
            gain.gain.setValueAtTime(0.0001, now)
            gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now)
            osc.stop(now + 0.6)
          }
          playBeep()
          synthInterval = window.setInterval(playBeep, 1500)
        } catch (e) {
          console.error('Synth alert blocked:', e)
        }
      }
    }

    window.addEventListener(CARE_ALERT_EVENT, handleCareAlert)
    return () => {
      window.removeEventListener(CARE_ALERT_EVENT, handleCareAlert)
      stopAllAlerts()
    }
  }, [voices])
}
export default useAlarmController

import { useEffect, useRef, useState } from 'react'
import type { CareReminder, GrowthRecord, MemoryEntry, Pet, VoiceClip } from './domain'
import { getNotificationDiagnostics, scheduleTestNotification } from './notifications'

type Props = { pets: Pet[]; reminders: CareReminder[]; memories: MemoryEntry[]; growthRecords: GrowthRecord[]; voices: VoiceClip[]; onBack: () => void; onExport: () => Promise<void>; onImport: (file?: File) => Promise<void>; notify: (text: string) => void }
type Diagnostics = Awaited<ReturnType<typeof getNotificationDiagnostics>>

export default function SettingsPage({ pets, reminders, memories, growthRecords, voices, onBack, onExport, onImport, notify }: Props) {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({})
  const restoreInput = useRef<HTMLInputElement>(null)
  const acceptanceItems = [
    ['notification', '通知權限與10秒測試通知'], ['medication', '吃藥提醒、完成與補吃'], ['feeding', '早餐／午餐／晚餐提醒'], ['vet', '看診提前提醒與看診紀錄'], ['voice', '自行錄音與 App 內試聽'], ['backup', '下載包含照片與錄音的備份'], ['restore', '恢復備份並核對資料'], ['reboot', '重新開機後確認提醒仍存在'], ['silent', '靜音／勿擾模式下確認系統行為'], ['multiPet', '多毛孩、頭像、回憶與健康資料切換'],
  ] as const
  const [acceptance, setAcceptance] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('maohai-acceptance-v1') || '{}') } catch { return {} } })
  const photoCount = memories.reduce((sum, memory) => sum + memory.photos.length, 0) + pets.filter((pet) => pet.avatarPhoto).length
  const mediaBytes = memories.flatMap((memory) => memory.photos).reduce((sum, photo) => sum + photo.blob.size, 0) + pets.reduce((sum, pet) => sum + (pet.avatarPhoto?.size || 0), 0) + voices.reduce((sum, voice) => sum + voice.blob.size, 0)
  const mediaMb = (mediaBytes / 1024 / 1024).toFixed(mediaBytes ? 1 : 0)
  useEffect(() => { void getNotificationDiagnostics().then(setDiagnostics); void navigator.storage?.estimate().then(setStorage) }, [])
  const permissionText = diagnostics?.permission === 'granted' ? '已允許' : diagnostics?.permission === 'denied' ? '已關閉' : diagnostics?.permission === 'web' ? '需在手機 App 測試' : '尚未詢問'
  const exactText = diagnostics?.exactAlarm === 'granted' ? '已允許' : diagnostics?.exactAlarm === 'not-required' ? '不需要額外設定' : '需要開啟'
  async function testNotification() {
    const result = await scheduleTestNotification(); setDiagnostics(await getNotificationDiagnostics())
    notify(result === 'scheduled' ? '測試通知會在10秒後出現' : result === 'denied' ? '請先到手機設定允許通知' : '請安裝到手機後測試通知')
  }
  function toggleAcceptance(id: string) {
    const next = { ...acceptance, [id]: !acceptance[id] }; setAcceptance(next); localStorage.setItem('maohai-acceptance-v1', JSON.stringify(next))
  }
  const acceptedCount = acceptanceItems.filter(([id]) => acceptance[id]).length

  return <section className="settings-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">LOCAL APP SETTINGS</span><h1>設定與資料保護</h1><p>掌握手機裡的資料、通知與完整備份。</p></div></header>
    <section className="local-status"><i>⌂</i><div><b>單機資料模式</b><p>不需登入；照片、健康、提醒與錄音預設不離開這台裝置。</p></div><em>本機</em></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">LOCAL DATA</span><h2>本機資料摘要</h2></div><strong>{mediaMb} MB<small>媒體檔案</small></strong></div><div className="data-counts"><div><b>{pets.length}</b><small>毛孩</small></div><div><b>{reminders.length}</b><small>提醒</small></div><div><b>{memories.length}</b><small>回憶</small></div><div><b>{photoCount}</b><small>照片</small></div><div><b>{growthRecords.length}</b><small>成長</small></div><div><b>{voices.length}</b><small>錄音</small></div></div>{storage.quota && <div className="device-storage"><span>App／瀏覽器儲存用量</span><b>{((storage.usage || 0) / 1024 / 1024).toFixed(1)} MB / {(storage.quota / 1024 / 1024).toFixed(0)} MB</b><i><em style={{ width: `${Math.min(100, (storage.usage || 0) / storage.quota * 100)}%` }} /></i></div>}</section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">REMINDER CHECK</span><h2>通知與鬧鐘</h2></div></div><div className="diagnostic-list"><div><span><b>本機通知權限</b><small>吃藥、吃飯、看診與照護</small></span><em className={diagnostics?.permission === 'granted' ? 'ok' : ''}>{permissionText}</em></div><div><span><b>Android 精確鬧鐘</b><small>讓提醒更接近設定時間</small></span><em className={diagnostics?.exactAlarm === 'granted' || diagnostics?.exactAlarm === 'not-required' ? 'ok' : ''}>{exactText}</em></div></div><button className="test-notification" onClick={() => void testNotification()}>測試10秒後通知</button></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">BACKUP & RESTORE</span><h2>完整備份與恢復</h2></div></div><p className="backup-explain">備份包含毛孩檔案、頭像、回憶照片、提醒、完成紀錄、看診、成長、藥品庫存與錄音。</p><div className="settings-backup"><button onClick={() => void onExport()}>下載完整備份</button><button onClick={() => restoreInput.current?.click()}>從備份恢復</button><input ref={restoreInput} type="file" accept="application/json" onChange={(event) => void onImport(event.target.files?.[0])} /></div><small className="backup-warning">建議每月備份一次，換手機或送修前務必再備份。</small></section>
    <section className="settings-block acceptance-block"><div className="settings-title"><div><span className="eyebrow">DEVICE ACCEPTANCE</span><h2>手機實機驗收</h2></div><strong>{acceptedCount}/{acceptanceItems.length}<small>已完成</small></strong></div><div className="acceptance-progress"><i style={{ width: `${acceptedCount / acceptanceItems.length * 100}%` }} /></div><div className="acceptance-list">{acceptanceItems.map(([id, label]) => <label key={id} className={acceptance[id] ? 'checked' : ''}><input type="checkbox" checked={Boolean(acceptance[id])} onChange={() => toggleAcceptance(id)} /><span>{label}</span></label>)}</div><aside><b>目前限制</b><p>自訂錄音已可錄製與 App 內試聽；App 關閉或手機鎖定時直接播放該錄音，仍待原生橋接與實機驗證。背景通知目前使用手機系統聲音。</p></aside></section>
    <footer className="settings-footer"><b>毛孩生活中心 v0.21.0</b><span>離線陪伴・上線服務</span></footer>
  </section>
}

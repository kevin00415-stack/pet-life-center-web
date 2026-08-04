import { useEffect, useRef, useState } from 'react'
import type { CareReminder, GrowthRecord, MemoryEntry, Pet, VoiceClip } from './domain'
import { getNotificationDiagnostics, scheduleTestNotification } from './notifications'
import { interpolate, supportedLocales, useTranslation } from './i18n/translations'
import { formatNumber } from './i18n/formatters'
import { guardianThemes, useTheme } from './theme/theme'

type Props = { pets: Pet[]; reminders: CareReminder[]; memories: MemoryEntry[]; growthRecords: GrowthRecord[]; voices: VoiceClip[]; onBack: () => void; onExport: () => Promise<void>; onExportVetReport: () => void; onImport: (file?: File) => Promise<void>; notify: (text: string) => void }
type Diagnostics = Awaited<ReturnType<typeof getNotificationDiagnostics>>

export default function SettingsPage({ pets, reminders, memories, growthRecords, voices, onBack, onExport, onExportVetReport, onImport, notify }: Props) {
  const { t, locale, changeLocale } = useTranslation()
  const { theme, changeTheme } = useTheme()
  const themeLabels = { warm: t('themeWarm'), tech: t('themeTech'), medical: t('themeMedical'), nature: t('themeNature'), game: t('themeGame') }
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({})
  const restoreInput = useRef<HTMLInputElement>(null)
  const acceptanceItems = [
    ['notification', t('settingsAcceptanceNotification')], ['medication', t('settingsAcceptanceMedication')], ['feeding', t('settingsAcceptanceFeeding')], ['vet', t('settingsAcceptanceVet')], ['voice', t('settingsAcceptanceVoice')], ['backup', t('settingsAcceptanceBackup')], ['restore', t('settingsAcceptanceRestore')], ['reboot', t('settingsAcceptanceReboot')], ['silent', t('settingsAcceptanceSilent')], ['multiPet', t('settingsAcceptanceMultiPet')],
  ] as const
  const [acceptance, setAcceptance] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('maohai-acceptance-v1') || '{}') } catch { return {} } })
  const photoCount = memories.reduce((sum, memory) => sum + memory.photos.length, 0) + pets.filter((pet) => pet.avatarPhoto).length
  const mediaBytes = memories.flatMap((memory) => memory.photos).reduce((sum, photo) => sum + photo.blob.size, 0) + pets.reduce((sum, pet) => sum + (pet.avatarPhoto?.size || 0), 0) + voices.reduce((sum, voice) => sum + voice.blob.size, 0)
  const mediaMb = formatNumber(mediaBytes / 1024 / 1024, locale, { maximumFractionDigits: mediaBytes ? 1 : 0 })
  useEffect(() => { void getNotificationDiagnostics().then(setDiagnostics); void navigator.storage?.estimate().then(setStorage) }, [])
  const permissionText = diagnostics?.permission === 'granted' ? t('permissionGranted') : diagnostics?.permission === 'denied' ? t('permissionDenied') : diagnostics?.permission === 'web' ? t('permissionTestInApp') : t('permissionNotAsked')
  const exactText = diagnostics?.exactAlarm === 'granted' ? t('permissionGranted') : diagnostics?.exactAlarm === 'not-required' ? t('exactAlarmNotRequired') : t('exactAlarmRequired')
  async function testNotification() {
    const result = await scheduleTestNotification(); setDiagnostics(await getNotificationDiagnostics())
    notify(result === 'scheduled' ? t('testNotificationScheduled') : result === 'denied' ? t('testNotificationDenied') : t('testNotificationInstall'))
  }
  function toggleAcceptance(id: string) {
    const next = { ...acceptance, [id]: !acceptance[id] }; setAcceptance(next); localStorage.setItem('maohai-acceptance-v1', JSON.stringify(next))
  }
  const acceptedCount = acceptanceItems.filter(([id]) => acceptance[id]).length
  const storageUsage = formatNumber((storage.usage || 0) / 1024 / 1024, locale, { maximumFractionDigits: 1 })
  const storageQuota = formatNumber((storage.quota || 0) / 1024 / 1024, locale, { maximumFractionDigits: 0 })

  return <section className="settings-page"><header className="timeline-header"><button onClick={onBack} aria-label={t('back')}>‹</button><div><span className="eyebrow">LOCAL APP SETTINGS</span><h1>{t('settingsTitle')}</h1><p>{t('settingsSubtitle')}</p></div></header>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">LANGUAGE & REGION</span><h2>{t('settingsLanguageRegion')}</h2></div></div><label style={{display:'grid',gap:'8px',fontWeight:700}}>{t('settingsDisplayLanguage')}<select value={locale} onChange={(event)=>changeLocale(event.target.value as 'zh-TW'|'en-US')} style={{minHeight:'46px',border:'1px solid var(--line)',borderRadius:'12px',padding:'0 12px',background:'#fff'}}>{supportedLocales.map((item)=><option key={item.code} value={item.code}>{item.nativeLabel} · {item.label}</option>)}</select></label><p className="backup-explain">{t('settingsLanguageHelp')}</p><a href="/website" style={{color:'var(--brand)',fontWeight:800}}>{t('settingsWebsite')}</a></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">THEME</span><h2>{t('themeTitle')}</h2></div></div><label style={{display:'grid',gap:'8px',fontWeight:700}}>{t('themeSelect')}<select value={theme} onChange={(event)=>changeTheme(event.target.value as typeof theme)} style={{minHeight:'46px',border:'1px solid var(--line)',borderRadius:'12px',padding:'0 12px',background:'var(--guardian-color-surface)',color:'var(--guardian-color-ink)'}}>{guardianThemes.map((item)=><option key={item.code} value={item.code}>{themeLabels[item.code]}</option>)}</select></label><p className="backup-explain">{t('themeHelp')}</p></section>
    <section className="local-status"><i>⌂</i><div><b>{t('settingsLocalMode')}</b><p>{t('settingsLocalModeHelp')}</p></div><em>{t('settingsLocalBadge')}</em></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">LOCAL DATA</span><h2>{t('settingsLocalSummary')}</h2></div><strong>{mediaMb} MB<small>{t('settingsMediaFiles')}</small></strong></div><div className="data-counts"><div><b>{formatNumber(pets.length, locale)}</b><small>{t('settingsPets')}</small></div><div><b>{formatNumber(reminders.length, locale)}</b><small>{t('settingsReminders')}</small></div><div><b>{formatNumber(memories.length, locale)}</b><small>{t('settingsMemories')}</small></div><div><b>{formatNumber(photoCount, locale)}</b><small>{t('settingsPhotos')}</small></div><div><b>{formatNumber(growthRecords.length, locale)}</b><small>{t('settingsGrowth')}</small></div><div><b>{formatNumber(voices.length, locale)}</b><small>{t('settingsRecordings')}</small></div></div>{storage.quota && <div className="device-storage"><span>{t('settingsStorageUsage')}</span><b>{interpolate(t('settingsStorageValue'), { usage: storageUsage, quota: storageQuota })}</b><i><em style={{ width: `${Math.min(100, (storage.usage || 0) / storage.quota * 100)}%` }} /></i></div>}</section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">REMINDER CHECK</span><h2>{t('settingsNotifications')}</h2></div></div><div className="diagnostic-list"><div><span><b>{t('settingsNotificationPermission')}</b><small>{t('settingsNotificationPermissionHelp')}</small></span><em className={diagnostics?.permission === 'granted' ? 'ok' : ''}>{permissionText}</em></div><div><span><b>{t('settingsExactAlarm')}</b><small>{t('settingsExactAlarmHelp')}</small></span><em className={diagnostics?.exactAlarm === 'granted' || diagnostics?.exactAlarm === 'not-required' ? 'ok' : ''}>{exactText}</em></div></div><button className="test-notification" onClick={() => void testNotification()}>{t('settingsTestNotification')}</button></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">SHARE WITH VET</span><h2>{t('settingsVetPdf')}</h2></div></div><p className="backup-explain">{t('settingsVetPdfHelp')}</p><button className="vet-report-settings" onClick={onExportVetReport}>{t('settingsVetPdfButton')}</button><small className="backup-warning">{t('settingsVetPdfWarning')}</small></section>
    <section className="settings-block"><div className="settings-title"><div><span className="eyebrow">BACKUP & RESTORE</span><h2>{t('settingsBackupRestore')}</h2></div></div><p className="backup-explain">{t('settingsBackupHelp')}</p><div className="settings-backup"><button onClick={() => void onExport()}>{t('settingsDownloadBackup')}</button><button onClick={() => restoreInput.current?.click()}>{t('settingsRestoreBackup')}</button><input ref={restoreInput} type="file" accept="application/json,.json" aria-label={t('settingsRestoreBackup')} onChange={(event) => void onImport(event.target.files?.[0])} /></div><small className="backup-warning">{t('settingsBackupWarning')}</small></section>
    <section className="settings-block acceptance-block"><div className="settings-title"><div><span className="eyebrow">DEVICE ACCEPTANCE</span><h2>{t('settingsDeviceAcceptance')}</h2></div><strong>{acceptedCount}/{acceptanceItems.length}<small>{t('settingsCompleted')}</small></strong></div><div className="acceptance-progress"><i style={{ width: `${acceptedCount / acceptanceItems.length * 100}%` }} /></div><div className="acceptance-list">{acceptanceItems.map(([id, label]) => <label key={id} className={acceptance[id] ? 'checked' : ''}><input type="checkbox" checked={Boolean(acceptance[id])} onChange={() => toggleAcceptance(id)} /><span>{label}</span></label>)}</div><aside><b>{t('settingsCurrentLimit')}</b><p>{t('settingsCurrentLimitHelp')}</p></aside></section>
    <footer className="settings-footer" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 0', borderTop: '1px solid #eee', fontSize: '11px', color: '#888', alignItems: 'center' }}>
      <b>{t('settingsBuildName')}</b><span>{t('settingsBuildBranch')}</span><span>{t('settingsBuildCommit')}</span><span>{t('settingsBuildTime')}</span><span>{t('settingsTagline')}</span>
    </footer>
  </section>
}

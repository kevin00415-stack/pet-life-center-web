import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRinging,
  CaretRight,
  CheckCircle,
  Clock,
  GearSix,
  Heartbeat,
  House,
  Images,
  LockKey,
  Package,
  Plus,
} from '@phosphor-icons/react'
import './App.css'
import ReminderEditor from './ReminderEditor'
import VetVisitPanel from './VetVisitPanel'
import HealthTimeline from './HealthTimeline'
import MemoriesPage from './MemoriesPage'
import PetAvatar from './PetAvatar'
import PetEditor from './PetEditor'
import CareCalendar from './CareCalendar'
import SettingsPage from './SettingsPage'
import RelaxPage from './RelaxPage'
import brandMark from './assets/brand-mark.webp'
import homeIsland from './assets/home-island-v1.webp'
import healthFeatureIcon from './assets/feature-icons/health-3d.webp'
import reminderFeatureIcon from './assets/feature-icons/reminder-3d.webp'
import memoriesFeatureIcon from './assets/feature-icons/memories-3d.webp'
import musicFeatureIcon from './assets/feature-icons/music-3d.webp'
import type { CareReminder, GrowthRecord, MemoryEntry, Pet, ReminderKind, VoiceClip } from './domain'
import {
  kindIcons,
  kindLabels,
  medicationStockSummary,
  nextOccurrence,
  occurrenceKey,
  occurrencesOnDate,
  occurrenceStatus,
  repeatLabels,
} from './domain'
import {
  createBackup,
  deleteGrowthRecord,
  deleteMemory,
  deletePetData,
  deleteReminder,
  loadGrowthRecords,
  loadMemories,
  loadPets,
  loadReminders,
  loadVoices,
  restoreBackup,
  saveGrowthRecord,
  saveMemory,
  savePet,
  saveReminder,
  saveVoice,
} from './device-store'
import {
  cancelCareReminder,
  scheduleCareReminder,
  scheduleLowStockReminder,
  scheduleSnooze,
} from './notifications'
import { CARE_ALERT_EVENT, type CareAlertDetail } from './audio-coordination'

type View = 'care' | 'health' | 'memories' | 'calendar' | 'settings' | 'relax'

function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!blob) { setUrl(''); return }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: View
  onChange: (view: View) => void
  onAdd: () => void
}) {
  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      <button className={active === 'care' ? 'active' : ''} onClick={() => onChange('care')}>
        <i><House size={23} weight={active === 'care' ? 'fill' : 'regular'} /></i><span>今日</span>
      </button>
      <button className={active === 'memories' ? 'active' : ''} onClick={() => onChange('memories')}>
        <i><Images size={23} weight={active === 'memories' ? 'fill' : 'regular'} /></i><span>紀錄</span>
      </button>
      <button className="primary-add" onClick={onAdd} aria-label="快速新增照護提醒">
        <i><Plus size={29} weight="bold" /></i>
      </button>
      <button className={active === 'health' ? 'active' : ''} onClick={() => onChange('health')}>
        <i><Heartbeat size={23} weight={active === 'health' ? 'fill' : 'regular'} /></i><span>健康</span>
      </button>
      <button className={active === 'calendar' || active === 'relax' ? 'active' : ''} onClick={() => onChange('calendar')}>
        <i><BellRinging size={23} weight={active === 'calendar' || active === 'relax' ? 'fill' : 'regular'} /></i><span>提醒</span>
      </button>
    </nav>
  )
}

export default function App() {
  const [pets, setPets] = useState<Pet[]>([])
  const [reminders, setReminders] = useState<CareReminder[]>([])
  const [voices, setVoices] = useState<VoiceClip[]>([])
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([])
  const [activePet, setActivePet] = useState('')
  const [editorKind, setEditorKind] = useState<ReminderKind | null>(null)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [toast, setToast] = useState('')
  const [openVetVisit, setOpenVetVisit] = useState<CareReminder | null>(null)
  const [view, setView] = useState<View>('care')
  const [editingPet, setEditingPet] = useState<Pet | 'new' | null>(null)
  const restoreInput = useRef<HTMLInputElement>(null)

  async function refresh() {
    const [petData, reminderData, voiceData, memoryData, growthData] = await Promise.all([
      loadPets(),
      loadReminders(),
      loadVoices(),
      loadMemories(),
      loadGrowthRecords(),
    ])
    setPets(petData)
    setReminders(reminderData)
    setVoices(voiceData)
    setMemories(memoryData)
    setGrowthRecords(growthData)
    setActivePet((current) => petData.some((item) => item.id === current) ? current : petData[0]?.id || '')
  }

  useEffect(() => {
    void refresh()
  }, [])

  const activeReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.enabled)
        .map((reminder) => ({ reminder, next: nextOccurrence(reminder) }))
        .filter((item) => item.next)
        .sort((a, b) => (a.next?.getTime() || 0) - (b.next?.getTime() || 0)),
    [reminders, activePet],
  )
  const nextItem = activeReminders[0]
  const todayKey = new Date().toDateString()
  const todayItems = activeReminders.filter(({ next }) => next?.toDateString() === todayKey).slice(0, 5)
  const shown = activeReminders.filter(
    ({ next }) =>
      filter === 'all' ||
      (filter === 'today' ? next?.toDateString() === todayKey : next && next.toDateString() !== todayKey),
  )
  const pet = pets.find((item) => item.id === activePet)
  const customHomeCover = useBlobUrl(pet?.coverPhoto)
  const todayMedication = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.kind === 'medication')
        .flatMap((reminder) =>
          occurrencesOnDate(reminder, new Date()).map((occurrence) => ({
            reminder,
            occurrence,
            status: occurrenceStatus(reminder, occurrence),
          })),
        )
        .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime()),
    [reminders, activePet],
  )
  const medicationDone = todayMedication.filter(
    (item) => item.status === 'completed' || item.status === 'late',
  ).length
  const medicationMissed = todayMedication.filter((item) => item.status === 'missed')
  const medicationRate = todayMedication.length
    ? Math.round((medicationDone / todayMedication.length) * 100)
    : 0
  const stockItems = useMemo(
    () =>
      reminders
        .filter(
          (reminder) =>
            reminder.petId === activePet && reminder.kind === 'medication' && reminder.medicationStock,
        )
        .map((reminder) => ({ reminder, summary: medicationStockSummary(reminder)! }))
        .sort((a, b) => a.summary.remainingDays - b.summary.remainingDays),
    [reminders, activePet],
  )
  const vetVisits = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.petId === activePet && reminder.kind === 'vet')
        .sort((a, b) => `${b.startDate}T${b.time}`.localeCompare(`${a.startDate}T${a.time}`)),
    [reminders, activePet],
  )

  useEffect(() => {
    let alertAudio: HTMLAudioElement | undefined
    let alertUrl = ''
    const handleCareAlert = (event: Event) => {
      const detail = (event as CustomEvent<CareAlertDetail>).detail
      if (detail.phase === 'completed') {
        alertAudio?.pause()
        if (alertUrl) URL.revokeObjectURL(alertUrl)
        alertAudio = undefined
        alertUrl = ''
        return
      }
      const clip = voices.find((item) => item.id === detail.voiceClipId)
      if (!clip) return
      alertAudio?.pause()
      if (alertUrl) URL.revokeObjectURL(alertUrl)
      alertUrl = URL.createObjectURL(clip.blob)
      alertAudio = new Audio(alertUrl)
      alertAudio.onended = () => {
        if (alertUrl) URL.revokeObjectURL(alertUrl)
        alertAudio = undefined
        alertUrl = ''
      }
      void alertAudio.play()
    }
    window.addEventListener(CARE_ALERT_EVENT, handleCareAlert)
    return () => {
      window.removeEventListener(CARE_ALERT_EVENT, handleCareAlert)
      alertAudio?.pause()
      if (alertUrl) URL.revokeObjectURL(alertUrl)
    }
  }, [voices])

  function notify(text: string) {
    setToast(text)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function addReminder(reminder: CareReminder, voice?: VoiceClip) {
    if (voice) await saveVoice(voice)
    await saveReminder(reminder)
    const targetPet = pets.find((item) => item.id === reminder.petId)
    const result = targetPet
      ? await scheduleCareReminder(reminder, targetPet)
      : { status: 'web' as const, count: 0 }
    await refresh()
    setActivePet(reminder.petId)
    setEditorKind(null)
    notify(
      result.status === 'scheduled'
        ? `已在手機排定 ${result.count} 個提醒`
        : result.status === 'denied'
          ? '提醒已保存，請到手機設定開啟通知權限'
          : '提醒已保存在這台裝置',
    )
  }

  async function recordOccurrence(
    reminder: CareReminder,
    occurrence: Date,
    status: 'completed' | 'late' | 'skipped',
  ) {
    const key = occurrenceKey(reminder.id, occurrence)
    const previousStock = medicationStockSummary(reminder)
    const updated = {
      ...reminder,
      completedOccurrences:
        status === 'skipped'
          ? reminder.completedOccurrences
          : [...new Set([...reminder.completedOccurrences, key])],
      occurrenceRecords: [
        ...(reminder.occurrenceRecords || []).filter((item) => item.key !== key),
        { key, status, recordedAt: Date.now() },
      ],
    }
    if (updated.repeat === 'once') updated.enabled = false
    await saveReminder(updated)
    const currentStock = medicationStockSummary(updated)
    const targetPet = pets.find((item) => item.id === reminder.petId)
    if (targetPet && currentStock?.needsRefill && !previousStock?.needsRefill) {
      await scheduleLowStockReminder(updated, targetPet, currentStock.remaining)
    }
    await refresh()
    notify(
      currentStock?.needsRefill && status !== 'skipped'
        ? `已記錄，${reminder.title}只剩 ${currentStock.remaining} ${reminder.medicationStock?.unit}`
        : status === 'late'
          ? '已記錄補吃，完成率已更新'
          : status === 'skipped'
            ? '已記錄本次未服用'
            : '已記錄完成，辛苦了',
    )
  }

  async function complete(item: { reminder: CareReminder; next?: Date }) {
    if (item.next) await recordOccurrence(item.reminder, item.next, 'completed')
  }

  async function remove(reminder: CareReminder) {
    if (!window.confirm(`確定刪除「${reminder.title}」提醒嗎？`)) return
    await cancelCareReminder(reminder)
    await deleteReminder(reminder.id)
    await refresh()
    notify('提醒已刪除')
  }

  async function saveVetVisit(reminder: CareReminder) {
    await saveReminder(reminder)
    await refresh()
    setOpenVetVisit(null)
    notify('看診準備與紀錄已保存在手機')
  }

  async function addMemory(memory: MemoryEntry) {
    await saveMemory(memory)
    await refresh()
    notify('回憶已保存在這台手機')
  }

  async function removeMemory(memory: MemoryEntry) {
    if (!window.confirm(`確定刪除「${memory.title}」這篇回憶嗎？`)) return
    await deleteMemory(memory.id)
    await refresh()
    notify('回憶已刪除')
  }

  async function updatePet(profile: Pet) {
    await savePet(profile)
    await refresh()
    setActivePet(profile.id)
    setEditingPet(null)
    notify('毛孩檔案已保存在這台手機')
  }

  async function removePet(profile: Pet) {
    if (!window.confirm(`確定刪除「${profile.name}」嗎？相關提醒、回憶與健康紀錄也會一併刪除。此動作無法復原。`)) return
    const relatedReminders = reminders.filter((item) => item.petId === profile.id)
    await Promise.all(relatedReminders.map(cancelCareReminder))
    await deletePetData(profile.id)
    setEditingPet(null)
    await refresh()
    notify('毛孩與相關資料已刪除')
  }

  async function addGrowth(record: GrowthRecord) {
    await saveGrowthRecord(record)
    await refresh()
    notify('成長紀錄已保存在手機')
  }

  async function removeGrowth(record: GrowthRecord) {
    if (!window.confirm(`確定刪除 ${record.date} 的體重紀錄嗎？`)) return
    await deleteGrowthRecord(record.id)
    await refresh()
    notify('成長紀錄已刪除')
  }

  async function snooze(reminder: CareReminder) {
    const targetPet = pets.find((item) => item.id === reminder.petId)
    if (!targetPet) return
    const result = await scheduleSnooze(reminder, targetPet, 10)
    notify(
      result === 'scheduled'
        ? '已安排10分鐘後再次提醒'
        : result === 'denied'
          ? '請先開啟手機通知權限'
          : 'App版本會在10分鐘後提醒',
    )
  }

  async function exportData() {
    const content = await createBackup()
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `毛孩生活中心-單機備份-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    notify('完整備份已下載')
  }

  async function importData(file?: File) {
    if (!file) return
    try {
      await restoreBackup(await file.text())
      await refresh()
      notify('完整資料已恢復')
    } catch {
      notify('這個檔案不是有效的毛孩生活中心備份')
    }
  }

  const nav = (
    <BottomNav
      active={view}
      onChange={setView}
      onAdd={() => {
        setView('care')
        if (pet) setEditorKind('medication')
        else setEditingPet('new')
      }}
    />
  )

  if (view === 'health') {
    return (
      <main className="app-shell">
        <HealthTimeline
          pet={pet}
          reminders={reminders}
          growthRecords={growthRecords}
          onBack={() => setView('care')}
          onSaveGrowth={addGrowth}
          onDeleteGrowth={removeGrowth}
        />
        {nav}
      </main>
    )
  }
  if (view === 'memories') {
    return (
      <main className="app-shell">
        <MemoriesPage
          pet={pet}
          memories={memories}
          onBack={() => setView('care')}
          onSave={addMemory}
          onDelete={removeMemory}
        />
        {nav}
      </main>
    )
  }
  if (view === 'calendar') {
    return (
      <main className="app-shell">
        <CareCalendar
          pet={pet}
          reminders={reminders}
          onBack={() => setView('care')}
          onComplete={(reminder, occurrence) => recordOccurrence(reminder, occurrence, 'completed')}
        />
        {nav}
      </main>
    )
  }
  if (view === 'settings') {
    return (
      <main className="app-shell">
        <SettingsPage
          pets={pets}
          reminders={reminders}
          memories={memories}
          growthRecords={growthRecords}
          voices={voices}
          onBack={() => setView('care')}
          onExport={exportData}
          onImport={importData}
          notify={notify}
        />
        {toast && <div className="toast">{toast}</div>}
      </main>
    )
  }
  if (view === 'relax') {
    return (
      <main className="app-shell">
        <RelaxPage onBack={() => setView('care')} />
        {nav}
      </main>
    )
  }

  const lowStock = stockItems.find(({ summary }) => summary.needsRefill)

  return (
    <main className="app-shell cozy-home">
      <header className="topbar">
        <div className="brand">
          <span><img src={brandMark} alt="毛寵健廚品牌標誌" /></span>
          <div><b>毛孩生活中心</b><small>安心陪伴每一天</small></div>
        </div>
        <button className="more" aria-label="開啟設定" onClick={() => setView('settings')}>
          <GearSix size={23} weight="bold" />
        </button>
      </header>

      <nav className="pet-tabs cozy-pet-tabs" aria-label="選擇毛孩">
        {pets.map((item) => (
          <button
            key={item.id}
            className={item.id === activePet ? 'active' : ''}
            onClick={() => setActivePet(item.id)}
          >
            <PetAvatar pet={item} />
            <span><b>{item.name}</b><small>{item.species}</small></span>
            {item.id === activePet && <CheckCircle size={19} weight="fill" />}
          </button>
        ))}
        <button className="add-pet" onClick={() => setEditingPet('new')}>
          <i><Plus size={20} weight="bold" /></i>
          <span><b>新增毛孩</b><small>建立照護檔案</small></span>
        </button>
      </nav>

      {!pet ? (
        <section className="first-pet-onboarding">
          <img src={brandMark} alt="毛寵健廚品牌標誌" />
          <span>WELCOME HOME</span>
          <h1>先建立你的毛孩</h1>
          <p>輸入名字、照片與生日後，首頁、提醒、健康時間軸和回憶相簿都會變成牠的專屬空間。</p>
          <button onClick={() => setEditingPet('new')}><Plus size={22} weight="bold" />建立第一位毛孩</button>
          <small><LockKey size={17} />資料只保存在這台裝置，不會自動上傳。</small>
        </section>
      ) : (<>
      <section className={`island-hero ${customHomeCover ? 'custom-pet-cover' : ''}`} aria-label={`${pet.name}的首頁封面`}>
        <img
          src={customHomeCover || homeIsland}
          alt={customHomeCover ? `${pet.name}的首頁照片` : '狗狗與貓咪在溫暖居家小島上休息'}
          style={customHomeCover ? { objectPosition: `${pet.coverPosition?.x ?? 50}% ${pet.coverPosition?.y ?? 50}%`, transform: `scale(${pet.coverPosition?.zoom ?? 1})` } : undefined}
        />
        <button className="change-cover-photo" onClick={() => setEditingPet(pet)}><Images size={18} />更換首頁照片</button>
      </section>
      <section className="hero-reminder" aria-label="下一個照護提醒">
          <div className="hero-time">
            <i><Clock size={26} weight="duotone" /></i>
            <span><small>下一個照護提醒</small><strong>{nextItem?.next?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) || '--:--'}</strong><em>{nextItem?.reminder.title || '今天沒有待辦'}</em></span>
          </div>
          <div className="hero-actions">
            <button className="complete" disabled={!nextItem} onClick={() => nextItem && void complete(nextItem)}>
              <CheckCircle size={21} weight="fill" />完成
            </button>
            <button disabled={!nextItem} onClick={() => nextItem && void snooze(nextItem.reminder)}>
              <Clock size={20} weight="fill" />延後
            </button>
          </div>
      </section>

      {pet && (
        <div className="pet-profile-actions">
          <span>{pet.birthDate ? `${pet.name}・生日 ${pet.birthDate}` : `${pet.name}・可加入生日與專屬照片`}</span>
          <button onClick={() => setEditingPet(pet)}>編輯檔案</button>
        </div>
      )}

      <section className="game-actions" aria-label="常用功能">
        <button className="health-action" onClick={() => setView('health')}>
          <i><img src={healthFeatureIcon} alt="" /></i><b>健康紀錄</b><small>體重與看診</small>
        </button>
        <button className="reminder-action" onClick={() => setEditorKind('medication')}>
          <i><img src={reminderFeatureIcon} alt="" /></i><b>照護提醒</b><small>餵藥與回診</small>
          {activeReminders.length > 0 && <em>{activeReminders.length}</em>}
        </button>
        <button className="memory-action" onClick={() => setView('memories')}>
          <i><img src={memoriesFeatureIcon} alt="" /></i><b>回憶相簿</b><small>照片與故事</small>
        </button>
        <button className="music-action" onClick={() => setView('relax')}>
          <i><img src={musicFeatureIcon} alt="" /></i><b>舒壓音樂</b><small>離線安心播放</small>
        </button>
      </section>

      <section className="today-journey">
        <div className="section-heading">
          <div><span>DAILY CARE</span><h2>今日照護</h2></div>
          <button onClick={() => setView('calendar')}>查看全部 <CaretRight size={16} /></button>
        </div>
        {todayItems.length ? (
          <div className="journey-track">
            {todayItems.map((item, index) => (
              <button key={item.reminder.id} onClick={() => setView('calendar')}>
                <i className={index === 0 ? 'current' : ''}>
                  {index === 0 ? <BellRinging size={22} weight="fill" /> : <Clock size={22} weight="duotone" />}
                </i>
                <time>{item.next?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
                <span>{item.reminder.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="journey-empty" onClick={() => setEditorKind('care')}>
            <CheckCircle size={26} weight="duotone" />
            <span><b>今天沒有待辦</b><small>新增一個照護提醒，行程會出現在這裡。</small></span>
            <Plus size={20} weight="bold" />
          </button>
        )}
      </section>

      {lowStock && (
        <button className="stock-alert" onClick={() => setEditorKind('medication')}>
          <i><Package size={30} weight="duotone" /></i>
          <span><b>{lowStock.reminder.title} 即將不足</b><small>剩餘 {lowStock.summary.remaining} {lowStock.reminder.medicationStock?.unit}，約 {lowStock.summary.remainingDays} 天</small></span>
          <CaretRight size={22} weight="bold" />
        </button>
      )}

      {todayMedication.length > 0 && (
        <section className="adherence-card">
          <div className="adherence-summary">
            <div><span className="eyebrow">TODAY'S MEDICATION</span><h2>今日服藥完成率</h2><p>{medicationDone} 次完成・{medicationMissed.length} 次待確認・共 {todayMedication.length} 次</p></div>
            <strong>{medicationRate}<small>%</small></strong>
          </div>
          <div className="progress-track"><i style={{ width: `${medicationRate}%` }} /></div>
          {medicationMissed.length > 0 && (
            <div className="missed-list">
              <b>有服藥時間已經過了</b>
              {medicationMissed.map((item) => (
                <div key={occurrenceKey(item.reminder.id, item.occurrence)}>
                  <span><time>{item.occurrence.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</time><em>{item.reminder.title} {item.reminder.dose}</em></span>
                  <span><button onClick={() => void recordOccurrence(item.reminder, item.occurrence, 'late')}>已補吃</button><button className="skip" onClick={() => void recordOccurrence(item.reminder, item.occurrence, 'skipped')}>本次略過</button></span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="quick-section">
        <div className="section-title">
          <div><span className="eyebrow">QUICK ADD</span><h2>快速新增照護</h2></div>
          <small>常用項目一鍵建立</small>
        </div>
        <div className="quick-grid">
          {(['medication', 'feeding', 'vet', 'vaccine', 'care'] as ReminderKind[]).map((kind) => (
            <button key={kind} onClick={() => setEditorKind(kind)}>
              <i className={kind}>{kindIcons[kind]}</i>
              <span><b>{kindLabels[kind]}</b><small>建立{kindLabels[kind]}時間與提示</small></span>
              <em><Plus size={16} weight="bold" /></em>
            </button>
          ))}
        </div>
      </section>

      <section className="schedule-section">
        <div className="section-title">
          <div><span className="eyebrow">CARE SCHEDULE</span><h2>{pet?.name || '毛孩'}的照護表</h2></div>
          <button onClick={() => setEditorKind('medication')}>＋ 新增</button>
        </div>
        <div className="filters">
          {([['today', '今天'], ['upcoming', '接下來'], ['all', '全部']] as const).map(([value, label]) => (
            <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <div className="reminder-list">
          {shown.length ? shown.map((item) => (
            <article key={item.reminder.id}>
              <time><b>{item.next?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</b><small>{item.next?.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</small></time>
              <i className={item.reminder.kind}>{kindIcons[item.reminder.kind]}</i>
              <div><small>{kindLabels[item.reminder.kind]}・{repeatLabels[item.reminder.repeat]}</small><b>{item.reminder.title}</b><p>{item.reminder.dose || item.reminder.details || '尚未填寫備註'}</p>{item.reminder.voiceClipId && <em>● 自訂語音</em>}</div>
              <button className="item-menu" onClick={() => void remove(item.reminder)} aria-label={`刪除${item.reminder.title}`}>×</button>
            </article>
          )) : (
            <div className="list-empty"><i><Clock size={24} /></i><b>{filter === 'today' ? '今天沒有其他提醒' : '這裡還沒有提醒'}</b><p>照護紀錄越清楚，就越不容易漏掉重要時刻。</p></div>
          )}
        </div>
      </section>

      {vetVisits.length > 0 && (
        <section className="visit-section">
          <div className="section-title"><div><span className="eyebrow">VET VISITS</span><h2>看診準備與紀錄</h2></div><small>看診前後都不遺漏</small></div>
          <div className="visit-list">
            {vetVisits.map((visit) => {
              const total = (visit.vetVisit?.preparationItems.length || 0) + (visit.vetVisit?.questions.length || 0)
              const done = [...(visit.vetVisit?.preparationItems || []), ...(visit.vetVisit?.questions || [])].filter((item) => item.completed).length
              return (
                <button key={visit.id} onClick={() => setOpenVetVisit(visit)}>
                  <i><Heartbeat size={22} weight="duotone" /></i>
                  <span><b>{visit.title}</b><small>{visit.startDate}・{visit.time}・準備 {done}/{total}</small></span>
                  <em>{visit.vetVisit?.diagnosis ? '已有看診紀錄' : '查看準備'} <CaretRight size={15} /></em>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="data-safety">
        <div><i><LockKey size={24} weight="duotone" /></i><span><b>單機資料保護</b><small>提醒、看診、回憶照片與錄音都包含在備份中</small></span></div>
        <div className="backup-actions"><button onClick={() => void exportData()}>下載備份</button><button onClick={() => restoreInput.current?.click()}>恢復資料</button><input ref={restoreInput} type="file" accept="application/json" onChange={(event) => void importData(event.target.files?.[0])} /></div>
      </section>
      </>)}

      {nav}
      {editorKind && pet && <ReminderEditor pets={pets} initialKind={editorKind} voices={voices} onClose={() => setEditorKind(null)} onSave={addReminder} />}
      {openVetVisit && <VetVisitPanel reminder={openVetVisit} onClose={() => setOpenVetVisit(null)} onSave={saveVetVisit} />}
      {editingPet && <PetEditor pet={editingPet === 'new' ? undefined : editingPet} onClose={() => setEditingPet(null)} onSave={updatePet} onDelete={removePet} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

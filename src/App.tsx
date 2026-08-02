import { useRef, useState, useEffect } from 'react'
import './App.css'
import ReminderEditor from './ReminderEditor'
import VetVisitPanel from './VetVisitPanel'
import HealthTimeline from './HealthTimeline'
import MemoriesPage from './MemoriesPage'
import PetEditor from './PetEditor'
import CareCalendar from './CareCalendar'
import SettingsPage from './SettingsPage'
import ReminderCenterView from './components/ReminderCenterView'
import RelaxPage from './RelaxPage'
import CommunityHome from './community/CommunityHome'
import type { CareReminder, VoiceClip, MemoryEntry, Pet, ReminderKind, GrowthRecord } from './domain'
import {
  deletePetData,
  deleteReminder,
  saveMemory,
  savePet,
  saveReminder,
  saveVoice,
  deleteMemory,
  deleteGrowthRecord,
  saveGrowthRecord,
  restoreBackup,
  createBackup,
} from './device-store'
import {
  cancelCareReminder,
  scheduleCareReminder,
  scheduleLowStockReminder,
  scheduleSnooze,
} from './notifications'
import { CARE_ALERT_EVENT } from './audio-coordination'
import { openVetReport } from './vet-report'
import { BottomNav, type View } from './components/BottomNav'
import { usePets } from './hooks/usePets'
import { useAlarmController } from './hooks/useAlarmController'
import { CareHomeView } from './components/CareHomeView'
import SeniorCareView from './components/SeniorCareView'
import EventCenterView from './components/EventCenterView'
import VisualComparisonView from './components/VisualComparisonView'

export default function App() {
  const {
    pets,
    reminders,
    voices,
    memories,
    growthRecords,
    activePet,
    setActivePet,
    activeReminders,
    nextItem,
    todayItems,
    pet,
    customHomeCover,
    todayMedication,
    medicationDone,
    medicationMissed,
    medicationRate,
    vetVisits,
    refresh,
  } = usePets()

  useAlarmController(voices)

  const [editorKind, setEditorKind] = useState<ReminderKind | null>(null)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [toast, setToast] = useState('')
  const [openVetVisit, setOpenVetVisit] = useState<CareReminder | null>(null)
  const [editingReminder, setEditingReminder] = useState<CareReminder | null>(null)
  const [showCalendarView, setShowCalendarView] = useState(false)

  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash
    if (hash.startsWith('#/community')) return 'community'
    if (hash === '#/health') return 'health'
    if (hash === '#/memories') return 'memories'
    if (hash === '#/calendar') return 'calendar'
    if (hash === '#/settings') return 'settings'
    if (hash === '#/relax') return 'relax'
    if (hash === '#/senior') return 'senior'
    if (hash === '#/event') return 'event'
    if (hash === '#/visual-comparison') return 'visual-comparison'
    return 'care'
  })

  // Synchronize view changes to hash
  useEffect(() => {
    const hash = window.location.hash
    if (view === 'community') {
      if (!hash.startsWith('#/community')) {
        window.location.hash = '#/community'
      }
    } else {
      let targetHash = '#/' + view
      if (view === 'care') targetHash = '#/'
      if (hash !== targetHash) {
        window.location.hash = targetHash
      }
    }
  }, [view])

  // Synchronize hash changes back to view state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/community')) {
        setView('community')
      } else if (hash === '#/health') {
        setView('health')
      } else if (hash === '#/memories') {
        setView('memories')
      } else if (hash === '#/calendar') {
        setView('calendar')
      } else if (hash === '#/settings') {
        setView('settings')
      } else if (hash === '#/relax') {
        setView('relax')
      } else if (hash === '#/senior') {
        setView('senior')
      } else if (hash === '#/event') {
        setView('event')
      } else if (hash === '#/visual-comparison') {
        setView('visual-comparison')
      } else {
        setView('care')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [editingPet, setEditingPet] = useState<Pet | 'new' | null>(null)
  const restoreInput = useRef<HTMLInputElement>(null)

  const shown = activeReminders.filter(
    ({ next }) =>
      filter === 'all' ||
      (filter === 'today'
        ? next?.toDateString() === new Date().toDateString()
        : next && next.toDateString() !== new Date().toDateString()),
  )

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
    window.dispatchEvent(new CustomEvent(CARE_ALERT_EVENT, { detail: { phase: 'completed', notificationId: 0 } }))
    const previousStock = reminders.find((r) => r.id === reminder.id)
    const completedOccurrences = status === 'skipped'
      ? reminder.completedOccurrences
      : [...new Set([...reminder.completedOccurrences, reminder.id + '-' + occurrence.toISOString()])]
    const updated: CareReminder = {
      ...reminder,
      completedOccurrences,
      occurrenceRecords: [
        ...(reminder.occurrenceRecords || []).filter((item) => item.key !== (reminder.id + '-' + occurrence.toISOString())),
        { key: (reminder.id + '-' + occurrence.toISOString()), status, recordedAt: Date.now() },
      ],
    }
    if (updated.repeat === 'once') updated.enabled = false
    await saveReminder(updated)

    const completed = updated.completedOccurrences || []
    const initial = updated.medicationStock?.initialQuantity || 0
    const dose = updated.medicationStock?.doseQuantity || 1
    const threshold = updated.medicationStock?.lowStockThreshold || 0
    const remaining = Math.max(0, initial - completed.length * dose)
    const needsRefill = remaining <= threshold

    const targetPet = pets.find((item) => item.id === reminder.petId)
    if (targetPet && needsRefill && previousStock?.medicationStock && remaining > threshold) {
      await scheduleLowStockReminder(updated, targetPet, remaining)
    }
    await refresh()
    notify(
      needsRefill && status !== 'skipped'
        ? `已記錄，${reminder.title}只剩 ${remaining} ${reminder.medicationStock?.unit}`
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

  async function removeGrowth(record: { id: string }) {
    if (!window.confirm('確定刪除體重紀錄嗎？')) return
    await deleteGrowthRecord(record.id)
    await refresh()
    notify('成長紀錄已刪除')
  }

  async function snooze(reminder: CareReminder) {
    window.dispatchEvent(new CustomEvent(CARE_ALERT_EVENT, { detail: { phase: 'completed', notificationId: 0 } }))
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
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `毛孩生活中心-單機備份-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    notify('完整備份檔已下載；此檔案請用 App 的「恢復資料」開啟')
  }

  function exportVetPdf() {
    if (!pet) return notify('請先建立或選擇一隻毛孩')
    const opened = openVetReport({ pet, reminders, growthRecords })
    notify(opened ? '請在列印畫面選擇「儲存為 PDF」或分享' : '瀏覽器阻止開啟摘要，請允許彈出視窗後再試')
  }

  async function importData(file?: File) {
    if (!file) return
    const confirmed = window.confirm('確定要恢復資料嗎？這將會清除您目前裝置上的所有毛孩檔案、提醒、日記與成長紀錄，並覆蓋為備份檔中的資料。此動作無法復原。')
    if (!confirmed) return
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
          onExportVetReport={exportVetPdf}
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
        {showCalendarView ? (
          <div>
            <div style={{ padding: '16px', background: '#fbf8f3' }}>
              <button
                onClick={() => setShowCalendarView(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: '#173f3b',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ← 返回守護提醒中心
              </button>
            </div>
            <CareCalendar
              pet={pet}
              reminders={reminders}
              onBack={() => setShowCalendarView(false)}
              onComplete={(reminder, occurrence) => recordOccurrence(reminder, occurrence, 'completed')}
            />
          </div>
        ) : (
          <div>
            <div style={{ padding: '16px 16px 0 16px', background: '#fbf8f3', textAlign: 'right' }}>
              <button
                onClick={() => setShowCalendarView(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#d3a665',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                📅 切換至照護月曆
              </button>
            </div>
            <ReminderCenterView
              pets={pets}
              pet={pet}
              activePet={activePet}
              setActivePet={setActivePet}
              reminders={reminders}
              voices={voices}
              onBack={() => setView('care')}
              onComplete={async (reminder, occurrence) => {
                await recordOccurrence(reminder, occurrence, 'completed')
                await refresh()
              }}
              onSkip={async (reminder, occurrence) => {
                await recordOccurrence(reminder, occurrence, 'skipped')
                await refresh()
              }}
              onSnooze={async (reminder, _occurrence, minutes) => {
                if (pet) {
                  await scheduleSnooze(reminder, pet, minutes)
                  await refresh()
                }
              }}
              onDelete={async (reminderId) => {
                await deleteReminder(reminderId)
                await refresh()
                notify('提醒項目已成功刪除')
              }}
              onCreateNew={(kind) => setEditorKind(kind)}
              onEditExisting={(reminder) => setEditingReminder(reminder)}
            />
          </div>
        )}
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
          onExportVetReport={exportVetPdf}
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
  if (view === 'community') {
    return (
      <main className="app-shell">
        <CommunityHome onBack={() => setView('care')} />
        {nav}
      </main>
    )
  }
  if (view === 'senior') {
    return (
      <main className="app-shell">
        <SeniorCareView
          pet={pet}
          todayMedication={todayMedication}
          recordOccurrence={recordOccurrence}
          onBack={() => setView('care')}
        />
        {nav}
      </main>
    )
  }
  if (view === 'event') {
    return (
      <main className="app-shell">
        <EventCenterView
          pet={pet}
          onBack={() => setView('care')}
        />
        {nav}
      </main>
    )
  }
  if (view === 'visual-comparison') {
    return (
      <main className="app-shell">
        <VisualComparisonView
          pet={pet}
          onBack={() => setView('care')}
        />
        {nav}
      </main>
    )
  }

  return (
    <>
      <CareHomeView
        pets={pets}
        pet={pet}
        activePet={activePet}
        setActivePet={setActivePet}
        setEditingPet={setEditingPet}
        customHomeCover={customHomeCover}
        nextItem={nextItem}
        complete={complete}
        snooze={snooze}
        setView={setView}
        setEditorKind={setEditorKind}
        activeReminders={activeReminders}
        todayItems={todayItems}
        medicationDone={medicationDone}
        medicationMissed={medicationMissed}
        todayMedication={todayMedication}
        medicationRate={medicationRate}
        recordOccurrence={recordOccurrence}
        filter={filter}
        setFilter={setFilter}
        shown={shown}
        remove={remove}
        vetVisits={vetVisits}
        setOpenVetVisit={setOpenVetVisit}
        exportVetPdf={exportVetPdf}
        exportData={exportData}
        restoreInputRef={restoreInput}
        importData={importData}
        growthRecords={growthRecords}
        reminders={reminders}
        nav={nav}
      />
      {editorKind && pet && <ReminderEditor pets={pets} initialKind={editorKind} voices={voices} onClose={() => setEditorKind(null)} onSave={addReminder} />}
      {editingReminder && pet && <ReminderEditor pets={pets} initialKind={editingReminder.kind} voices={voices} editingReminder={editingReminder} onClose={() => setEditingReminder(null)} onSave={async (rem, voice) => { await addReminder(rem, voice); setEditingReminder(null); }} />}
      {openVetVisit && <VetVisitPanel reminder={openVetVisit} onClose={() => setOpenVetVisit(null)} onSave={saveVetVisit} />}
      {editingPet && <PetEditor pet={editingPet === 'new' ? undefined : editingPet} onClose={() => setEditingPet(null)} onSave={updatePet} onDelete={removePet} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

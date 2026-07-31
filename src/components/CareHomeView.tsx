import { useState, useEffect } from 'react'
import {
  BellRinging,
  CaretRight,
  CheckCircle,
  Clock,
  GearSix,
  Heartbeat,
  Images,
  LockKey,
  Package,
  PencilSimple,
  Plus,
} from '@phosphor-icons/react'
import type { CareReminder, Pet, ReminderKind } from '../domain'
import { kindIconAssets } from '../reminder-kind-assets'
import { photoPanPercent } from '../photo-position'
import {
  kindLabels,
  repeatLabels,
  occurrenceKey,
} from '../domain'
import brandMark from '../assets/brand-mark.webp'
import homeIsland from '../assets/home-island-v1.webp'
import healthFeatureIcon from '../assets/feature-icons/health-3d.webp'
import reminderFeatureIcon from '../assets/feature-icons/reminder-3d.webp'
import memoriesFeatureIcon from '../assets/feature-icons/memories-3d.webp'
import musicFeatureIcon from '../assets/feature-icons/music-3d.webp'

interface CareHomeViewProps {
  pets: Pet[]
  pet?: Pet
  activePet: string
  setActivePet: (id: string) => void
  setEditingPet: (pet: Pet | 'new' | null) => void
  customHomeCover: string
  nextItem: { reminder: CareReminder; next?: Date } | undefined
  complete: (item: { reminder: CareReminder; next?: Date }) => Promise<void>
  snooze: (reminder: CareReminder) => Promise<void>
  setView: (view: 'care' | 'health' | 'memories' | 'calendar' | 'settings' | 'relax' | 'community') => void
  setEditorKind: (kind: ReminderKind | null) => void
  activeReminders: { reminder: CareReminder; next?: Date }[]
  todayItems: { reminder: CareReminder; next?: Date }[]
  medicationDone: number
  medicationMissed: { reminder: CareReminder; occurrence: Date; status: string }[]
  todayMedication: { reminder: CareReminder; occurrence: Date; status: string }[]
  medicationRate: number
  recordOccurrence: (reminder: CareReminder, occurrence: Date, status: 'completed' | 'late' | 'skipped') => Promise<void>
  filter: 'today' | 'upcoming' | 'all'
  setFilter: (filter: 'today' | 'upcoming' | 'all') => void
  shown: { reminder: CareReminder; next?: Date }[]
  remove: (reminder: CareReminder) => Promise<void>
  vetVisits: CareReminder[]
  setOpenVetVisit: (reminder: CareReminder | null) => void
  exportVetPdf: () => void
  exportData: () => Promise<void>
  restoreInputRef: React.RefObject<HTMLInputElement | null>
  importData: (file?: File) => Promise<void>
  nav: React.ReactNode
}

export function CareHomeView({
  pets,
  pet,
  activePet,
  setActivePet,
  setEditingPet,
  customHomeCover,
  nextItem,
  complete,
  snooze,
  setView,
  setEditorKind,
  activeReminders,
  todayItems,
  medicationDone,
  medicationMissed,
  todayMedication,
  medicationRate,
  recordOccurrence,
  filter,
  setFilter,
  shown,
  remove,
  vetVisits,
  setOpenVetVisit,
  exportVetPdf,
  exportData,
  restoreInputRef,
  importData,
  nav,
}: CareHomeViewProps) {
  const lowStock = activeReminders
    .filter(({ reminder }) => reminder.kind === 'medication' && reminder.medicationStock)
    .map(({ reminder }) => {
      // Inline recalculation to avoid prop-drilling complex stock summary lists
      const completed = reminder.completedOccurrences || []
      const initial = reminder.medicationStock?.initialQuantity || 0
      const dose = reminder.medicationStock?.doseQuantity || 1
      const threshold = reminder.medicationStock?.lowStockThreshold || 0
      const remaining = Math.max(0, initial - completed.length * dose)
      const dailyTimesCount = reminder.dailyTimes?.length || 1
      const remainingDays = Math.ceil(remaining / (dose * dailyTimesCount))
      const needsRefill = remaining <= threshold
      return { reminder, summary: { remaining, remainingDays, needsRefill } }
    })
    .find(({ summary }) => summary.needsRefill)

  return (
    <main className="app-shell cozy-home">
      <header className="topbar">
        <div className="brand">
          <span><img src={brandMark} alt="毛寵健廚品牌標誌" /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <b>毛孩生活中心</b>
              <span style={{ fontSize: '10px', background: '#d3a665', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Phase 0 Test</span>
            </div>
            <small>安心陪伴每一天</small>
          </div>
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
        {pet && (
          <button className="edit-pet-tab" onClick={() => setEditingPet(pet)}>
            <i><PencilSimple size={20} weight="bold" /></i>
            <span><b>編輯檔案</b><small>照片與基本資料</small></span>
          </button>
        )}
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
          style={customHomeCover ? (() => {
            const position = { x: pet.coverPosition?.x ?? 50, y: pet.coverPosition?.y ?? 50 }
            const zoom = pet.coverPosition?.zoom ?? 1
            const pan = photoPanPercent(position, zoom)
            return {
              objectPosition: `${position.x}% ${position.y}%`,
              transform: `translate3d(${pan.x}%, ${pan.y}%, 0) scale(${zoom})`,
            }
          })() : undefined}
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
              <i className={kind}><img src={kindIconAssets[kind]} alt="" /></i>
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
              <i className={item.reminder.kind}><img src={kindIconAssets[item.reminder.kind]} alt="" /></i>
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
        <div className="backup-actions"><button className="vet-report-action" onClick={exportVetPdf}>獸醫摘要 PDF</button><button onClick={() => void exportData()}>完整備份檔</button><button onClick={() => restoreInputRef.current?.click()}>恢復資料</button><input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} style={{ display: 'none' }} /></div>
      </section>
      </>)}

      {nav}
    </main>
  )
}

// Minimal helper placeholder to avoid importing PetAvatar separately in parent
function PetAvatar({ pet }: { pet: Pet }) {
  const coverUrl = useBlobUrl(pet.avatarPhoto)
  return (
    <div className="pet-avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: '#eef5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
      {coverUrl ? <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pet.avatar || '🐶'}
    </div>
  )
}

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

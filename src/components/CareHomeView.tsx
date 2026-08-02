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
  PhoneCall,
  Heart,
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
import dailyPassport3d from '../assets/reminder-icons/daily-passport-3d.webp'

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
  setView: (view: 'care' | 'health' | 'memories' | 'calendar' | 'settings' | 'relax' | 'community' | 'senior' | 'event' | 'visual-comparison') => void
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

function calculateAge(birthDateString?: string) {
  if (!birthDateString) return ''
  const birth = new Date(birthDateString)
  if (isNaN(birth.getTime())) return ''
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--
    months += 12
  }
  if (years === 0) return `${months} 個月`
  if (months === 0) return `${years} 歲`
  return `${years} 歲 ${months} 個月`
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

  const petAge = pet?.birthDate ? calculateAge(pet.birthDate) : ''

  // Formatted companion status tags
  const healthAlertCount = (pet?.medicalNotes ? 1 : 0) + (pet?.emergencyContact ? 1 : 0)

  return (
    <main className="app-shell cozy-home">
      <header className="topbar">
        <div className="brand">
          <span><img src={brandMark} alt="毛寵健廚品牌標誌" /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <b>毛孩生活中心</b>
              <span style={{ fontSize: '10px', background: '#d3a665', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>App</span>
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
      {/* 🌟 UPGRADED PET HERO CARD */}
      <section className="pet-hero-container">
        <div className={`island-hero ${customHomeCover ? 'custom-pet-cover' : ''}`} aria-label={`${pet.name}的首頁封面`}>
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
        </div>

        {/* Floating Pet Info Card overlay */}
        <div className="pet-hero-overlay">
          <div className="pet-hero-avatar-wrapper">
            <PetAvatar pet={pet} scale={1.5} />
          </div>
          <div className="pet-hero-meta">
            <div className="pet-hero-title">
              <h2>{pet.name}</h2>
              <span className="pet-species-badge">{pet.species}</span>
            </div>
            <div className="pet-hero-stats">
              {petAge && <span className="stat-pill"><Heart size={14} weight="fill" /> {petAge}</span>}
              {pet.birthDate && <span className="stat-pill">🎂 {pet.birthDate}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* 🚨 EMERGENCY SHORTCUT SHIELD CARD */}
      {healthAlertCount > 0 && (
        <section className="emergency-shield-card">
          <div className="shield-header">
            <Heartbeat size={24} weight="fill" className="shield-icon" />
            <div>
              <h3>重要照護與緊急聯絡資訊</h3>
              <p>當面臨緊急情況時，此處資訊可供快速檢視</p>
            </div>
          </div>
          <div className="shield-body">
            {pet.medicalNotes && (
              <div className="shield-row">
                <strong>⚠️ 備註與過敏史：</strong>
                <span>{pet.medicalNotes}</span>
              </div>
            )}
            {pet.emergencyContact && (
              <div className="shield-row contact-row">
                <PhoneCall size={16} weight="bold" />
                <strong>緊急聯絡：</strong>
                <span>{pet.emergencyContact}</span>
              </div>
            )}
            {pet.vetHospital && (
              <div className="shield-row">
                <strong>🏥 常去醫院：</strong>
                <span>{pet.vetHospital}</span>
              </div>
            )}
            {pet.microchipNumber && (
              <div className="shield-row microchip-row">
                <strong>🆔 晶片號碼 ({pet.microchipStatus || '已登記'})：</strong>
                <span>{pet.microchipNumber}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* NEXT TASK HERO REMINDER */}
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

      {/* UPGRADED COMPANION ACTIONS CARD SYSTEM */}
      <section className="game-actions" aria-label="常用功能">
        <button className="health-action upgraded-card" onClick={() => setView('health')}>
          <div className="feature-card-header">
            <i><img src={healthFeatureIcon} alt="" /></i>
            <span className="card-badge">健康</span>
          </div>
          <b>健康紀錄</b>
          <small>追蹤體重趨勢與獸醫看診準備</small>
        </button>

        <button className="reminder-action upgraded-card" onClick={() => setEditorKind('medication')}>
          <div className="feature-card-header">
            <i><img src={reminderFeatureIcon} alt="" /></i>
            <span className="card-badge highlight">提醒</span>
          </div>
          <b>照護提醒</b>
          <small>設定餵藥、餵食與日常護理</small>
          {activeReminders.length > 0 && <span className="action-counter-dot">{activeReminders.length}</span>}
        </button>

        <button className="memory-action upgraded-card" onClick={() => setView('memories')}>
          <div className="feature-card-header">
            <i><img src={memoriesFeatureIcon} alt="" /></i>
            <span className="card-badge">回憶</span>
          </div>
          <b>回憶與日記</b>
          <small>記下心情、食慾與今日的生活故事</small>
        </button>

        <button className="music-action upgraded-card" onClick={() => setView('relax')}>
          <div className="feature-card-header">
            <i><img src={musicFeatureIcon} alt="" /></i>
            <span className="card-badge">舒壓</span>
          </div>
          <b>舒壓音樂</b>
          <small>精選離線白噪音與貓狗放鬆旋律</small>
        </button>

        <button className="senior-action upgraded-card" onClick={() => setView('senior')} style={{ background: '#fdfaf5', border: '1.5px solid #f0e2cf' }}>
          <div className="feature-card-header">
            <i><img src={dailyPassport3d} alt="" style={{ transform: 'scale(1.1)' }} /></i>
            <span className="card-badge" style={{ background: '#d3a665', color: '#fff' }}>高齡</span>
          </div>
          <b style={{ color: '#8c6020' }}>高齡照護中心</b>
          <small>每日生理觀察與早期異變警示</small>
        </button>

        <button className="event-action upgraded-card" onClick={() => setView('event')} style={{ background: '#fdf2f0', border: '1.5px solid #f9dedb' }}>
          <div className="feature-card-header">
            <i><img src={reminderFeatureIcon} alt="" style={{ filter: 'hue-rotate(320deg)' }} /></i>
            <span className="card-badge" style={{ background: '#e05a47', color: '#fff' }}>守護</span>
          </div>
          <b style={{ color: '#6d1d11' }}>異常事件記錄</b>
          <small>快速錄像拍下抽搐、嘔吐等突發異變</small>
        </button>

        <button className="visual-comparison-action upgraded-card" onClick={() => setView('visual-comparison')} style={{ background: '#f5f8fd', border: '1.5px solid #dbe6f9' }}>
          <div className="feature-card-header">
            <i><img src={memoriesFeatureIcon} alt="" style={{ filter: 'hue-rotate(180deg)' }} /></i>
            <span className="card-badge" style={{ background: '#478be0', color: '#fff' }}>比對</span>
          </div>
          <b style={{ color: '#113a6d' }}>視覺比對</b>
          <small>前後照片與影片對照，守護毛孩微小異變</small>
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

// Upgraded avatar display with custom sizing helper
function PetAvatar({ pet, scale = 1 }: { pet: Pet; scale?: number }) {
  const coverUrl = useBlobUrl(pet.avatarPhoto)
  const size = Math.round(38 * scale)
  return (
    <div
      className="pet-avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#eef5f3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(18 * scale)}px`,
        border: '3px solid #fff',
        boxShadow: '0 8px 18px rgba(91, 69, 46, 0.15)',
        flexShrink: 0,
      }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        pet.avatar || '🐶'
      )}
    </div>
  )
}

function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!blob) {
      setUrl('')
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

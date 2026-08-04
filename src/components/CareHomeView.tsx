import { useState, useEffect } from 'react'
import {
  CaretRight,
  CheckCircle,
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
import type { CareReminder, Pet, ReminderKind, GrowthRecord } from '../domain'
import { photoPanPercent } from '../photo-position'
import {
  occurrenceKey,
  occurrencesOnDate,
  occurrenceStatus,
} from '../domain'
import brandMark from '../assets/brand-mark.webp'
import homeIsland from '../assets/home-island-v1.webp'
import healthFeatureIcon from '../assets/feature-icons/health-3d.webp'
import reminderFeatureIcon from '../assets/feature-icons/reminder-3d.webp'
import memoriesFeatureIcon from '../assets/feature-icons/memories-3d.webp'
import musicFeatureIcon from '../assets/feature-icons/music-3d.webp'
import dailyPassport3d from '../assets/reminder-icons/daily-passport-3d.webp'
import { interpolate, useTranslation } from '../i18n/translations'
import type { TranslationKeys } from '../i18n/zh-TW'
import { formatDate, formatTime, formatWeight } from '../i18n/formatters'

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
  growthRecords: GrowthRecord[]
  reminders: CareReminder[]
  nav: React.ReactNode
}

function calculateAge(birthDateString: string | undefined, t: (key: TranslationKeys) => string) {
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
  if (years === 0) return interpolate(t('ageMonths'), { months })
  if (months === 0) return interpolate(t('ageYears'), { years })
  return interpolate(t('ageYearsMonths'), { years, months })
}

export function CareHomeView({
  pets,
  pet,
  activePet,
  setActivePet,
  setEditingPet,
  customHomeCover,
  nextItem: _nextItem,
  complete,
  snooze: _snooze,
  setView,
  setEditorKind,
  activeReminders,
  todayItems,
  medicationDone: _medicationDone,
  medicationMissed: _medicationMissed,
  todayMedication,
  medicationRate: _medicationRate,
  recordOccurrence: _recordOccurrence,
  filter: _filter,
  setFilter: _setFilter,
  shown: _shown,
  remove: _remove,
  vetVisits,
  setOpenVetVisit,
  exportVetPdf,
  exportData,
  restoreInputRef,
  importData,
  growthRecords,
  reminders,
  nav,
}: CareHomeViewProps) {
  const { t, locale } = useTranslation()
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

  const petAge = pet?.birthDate ? calculateAge(pet.birthDate, t) : ''
  const abnormalLabels: Record<string, string> = { seizure: t('abnormalSeizure'), vomiting: t('abnormalVomiting'), diarrhea: t('abnormalDiarrhea'), injury: t('abnormalInjury'), walking: t('abnormalWalking'), breathing: t('abnormalBreathing'), appetite: t('abnormalAppetite'), other: t('abnormalOther') }
  const comparisonLabels: Record<string, string> = { gait: t('comparisonGait'), spirit: t('comparisonSpirit'), skin: t('comparisonSkin'), wound: t('comparisonWound'), body: t('comparisonBody'), eating: t('comparisonEating'), seizure: t('comparisonSeizure'), breathing: t('comparisonBreathing'), other: t('speciesOther') }

  // Formatted companion status tags
  const healthAlertCount = (pet?.medicalNotes ? 1 : 0) + (pet?.emergencyContact ? 1 : 0)

  // --- GUARDIAN DAILY DASHBOARD MVP CALCULATIONS ---
  const safeReminders = reminders || []
  const safeGrowthRecords = growthRecords || []
  const safeActiveReminders = activeReminders || []
  const safeTodayMedication = todayMedication || []

  // 1. Reminders Count
  const todayOccurrences = safeReminders
    .filter((r) => r.petId === activePet && r.enabled)
    .flatMap((r) => occurrencesOnDate(r, new Date()))
  const todayRemindersCount = todayOccurrences.length

  // 2. Overdue count
  const overdueCount = safeActiveReminders.filter(
    (item) => item.next && item.next.getTime() < Date.now()
  ).length

  // 3. Whether medication was recorded today
  const hasMedToday = safeTodayMedication.some(
    (item) => item.status === 'completed' || item.status === 'late' || item.status === 'skipped'
  )

  // 4. Whether meal was recorded today
  const todayFeedingOccurrences = safeReminders
    .filter((r) => r.petId === activePet && r.kind === 'feeding')
    .flatMap((r) =>
      occurrencesOnDate(r, new Date()).map((occ) => ({
        reminder: r,
        occurrence: occ,
        status: occurrenceStatus(r, occ),
      }))
    )
  const hasMealToday = todayFeedingOccurrences.some(
    (item) => item.status === 'completed' || item.status === 'late' || item.status === 'skipped'
  )

  // 5. Most recent weight
  const petGrowth = safeGrowthRecords.filter((g) => g.petId === activePet)
  const latestWeight = petGrowth.length
    ? [...petGrowth].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  // 6. Most recent abnormal event record
  const getLatestEvent = () => {
    if (typeof localStorage === 'undefined' || !activePet) return null
    const saved = localStorage.getItem(`maohai-abnormal-events-${activePet}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]
        }
      } catch (e) {
        console.error(e)
      }
    }
    return null
  }
  const latestEvent = getLatestEvent()

  // 7. Recent activity stream builder (limit to 5)
  interface DashboardActivityItem {
    id: string
    type: 'reminders' | 'abnormal-event' | 'visual-comparison' | 'weight' | 'senior-care'
    date: Date
    title: string
    details: string
    icon: string
  }

  const getRecentActivities = (): DashboardActivityItem[] => {
    const items: DashboardActivityItem[] = []

    // Reminders
    safeActiveReminders.forEach(({ reminder }) => {
      reminder.occurrenceRecords?.forEach((rec) => {
        const timePart = rec.key.substring(rec.key.indexOf(':') + 1)
        const date = new Date(timePart)
        if (!isNaN(date.getTime())) {
          items.push({
            id: rec.key + '-' + rec.status,
            type: 'reminders',
            date,
            title: `✓ ${reminder.title}`,
            details: rec.status === 'completed' ? t('activityCompleted') : rec.status === 'skipped' ? t('activitySkipped') : t('btnTakenLate'),
            icon: '🔔',
          })
        }
      })
      reminder.completedOccurrences.forEach((key) => {
        const timePart = key.substring(key.indexOf(':') + 1)
        const date = new Date(timePart)
        if (!isNaN(date.getTime()) && !items.some((x) => x.id.startsWith(key))) {
          items.push({
            id: key + '-completed-legacy',
            type: 'reminders',
            date,
            title: `✓ ${reminder.title}`,
            details: t('activityCompleted'),
            icon: '🔔',
          })
        }
      })
    })

    // Weight Records
    safeGrowthRecords
      .filter((g) => g.petId === activePet)
      .forEach((g) => {
        items.push({
          id: g.id,
          type: 'weight',
          date: new Date(g.date + 'T12:00:00'),
          title: `⚖ ${interpolate(t('activityWeightTitle'), { weight: formatWeight(g.weightKg, locale) })}`,
          details: g.note || t('activityGrowthDefault'),
          icon: '⚖',
        })
      })

    // Abnormal Events
    if (typeof localStorage !== 'undefined' && activePet) {
      const savedEvents = localStorage.getItem(`maohai-abnormal-events-${activePet}`)
      if (savedEvents) {
        try {
          const parsed = JSON.parse(savedEvents)
          if (Array.isArray(parsed)) {
            parsed.forEach((ev) => {
              items.push({
                id: ev.id,
                type: 'abnormal-event',
                date: new Date(ev.timestamp),
                title: `🚨 ${interpolate(t('activityAbnormalTitle'), { category: abnormalLabels[ev.category] || t('abnormalOther') })}`,
                details: ev.notes || t('activityAbnormalDefault'),
                icon: '🚨',
              })
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      // Visual Comparisons
      const savedComps = localStorage.getItem(`maohai-visual-comparisons-${activePet}`)
      if (savedComps) {
        try {
          const parsed = JSON.parse(savedComps)
          if (Array.isArray(parsed)) {
            parsed.forEach((comp) => {
              items.push({
                id: comp.id,
                type: 'visual-comparison',
                date: new Date(comp.createdAt),
                title: `🔍 ${interpolate(t('activityComparisonTitle'), { category: comparisonLabels[comp.category] || t('speciesOther') })}`,
                details: comp.note || t('activityComparisonDefault'),
                icon: '🔍',
              })
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      // Senior Care daily records
      const savedSenior = localStorage.getItem(`maohai-senior-care-${activePet}`)
      if (savedSenior) {
        try {
          const parsed = JSON.parse(savedSenior)
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([dateStr, obs]: [string, any]) => {
              const timestamp = obs.savedAt || new Date(dateStr + 'T12:00:00').getTime()
              items.push({
                id: `senior-${dateStr}`,
                type: 'senior-care',
                date: new Date(timestamp),
                title: `🧓 ${t('activitySeniorTitle')}`,
                details: obs.notes || t('activitySeniorDefault'),
                icon: '🧓',
              })
            })
          }
        } catch (e) {
          console.error(e)
        }
      }
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  }

  return (
    <main className="app-shell cozy-home">
      <header className="topbar">
        <div className="brand">
          <span><img src={brandMark} alt={t('brandLogoAlt')} /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <b>{t('brandTitle')}</b>
              <span style={{ fontSize: '10px', background: '#d3a665', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>App</span>
            </div>
            <small>{t('brandSubtitle')}</small>
          </div>
        </div>
        <button className="more" aria-label={t('openSettings')} onClick={() => setView('settings')}>
          <GearSix size={23} weight="bold" />
        </button>
      </header>

      <nav className="pet-tabs cozy-pet-tabs" aria-label={t('selectPetAria')}>
        {pets.length > 1 && pets.map((item) => (
          <button
            key={item.id}
            className={item.id === activePet ? 'active' : ''}
            onClick={() => setActivePet(item.id)}
            style={{ minWidth: '120px', maxWidth: '180px' }}
          >
            <PetAvatar pet={item} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <b>{item.name}</b>
              <small>{item.species}</small>
            </span>
            {item.id === activePet && <CheckCircle size={19} weight="fill" />}
          </button>
        ))}
        <button className="add-pet" onClick={() => setEditingPet('new')}>
          <i><Plus size={20} weight="bold" /></i>
          <span><b>{t('addPet')}</b><small>{t('addPetSub')}</small></span>
        </button>
        {pet && (
          <button className="edit-pet-tab" onClick={() => setEditingPet(pet)}>
            <i><PencilSimple size={20} weight="bold" /></i>
            <span><b>{t('editPet')}</b><small>{t('editPetSub')}</small></span>
          </button>
        )}
      </nav>

      {!pet ? (
        <section className="first-pet-onboarding">
          <img src={brandMark} alt={t('brandLogoAlt')} />
          <span>{t('onboardingEyebrow')}</span>
          <h1>{t('onboardingTitle')}</h1>
          <p>{t('onboardingDesc')}</p>
          <button onClick={() => setEditingPet('new')}><Plus size={22} weight="bold" />{t('createFirstPet')}</button>
          <small><LockKey size={17} />{t('onboardingFootnote')}</small>
        </section>
      ) : (<>
      {/* 🌟 UPGRADED PET HERO CARD */}
      <section className="pet-hero-container">
        <div className={`island-hero ${customHomeCover ? 'custom-pet-cover' : ''}`} aria-label={interpolate(t('homeCoverAria'), { pet: pet.name })}>
          <img
            src={customHomeCover || homeIsland}
            alt={customHomeCover ? interpolate(t('homePhotoAlt'), { pet: pet.name }) : t('defaultHomePhotoAlt')}
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
          <button className="change-cover-photo" onClick={() => setEditingPet(pet)}><Images size={18} />{t('changeCoverPhoto')}</button>
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
              <h3>{t('emergencyCardTitle')}</h3>
              <p>{t('emergencyCardSub')}</p>
            </div>
          </div>
          <div className="shield-body">
            {pet.medicalNotes && (
              <div className="shield-row">
                <strong>{t('emergencyCardAlert')}</strong>
                <span>{pet.medicalNotes}</span>
              </div>
            )}
            {pet.emergencyContact && (
              <div className="shield-row contact-row">
                <PhoneCall size={16} weight="bold" />
                <strong>{t('emergencyCardContact')}</strong>
                <span>{pet.emergencyContact}</span>
              </div>
            )}
            {pet.vetHospital && (
              <div className="shield-row">
                <strong>{t('emergencyCardHospital')}</strong>
                <span>{pet.vetHospital}</span>
              </div>
            )}
            {pet.microchipNumber && (
              <div className="shield-row microchip-row">
                <strong>🆔 {interpolate(t('microchipDisplay'), { status: pet.microchipStatus || t('microchipStatusRegistered') })}</strong>
                <span>{pet.microchipNumber}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 📊 TODAY SUMMARY DASHBOARD CARD (SECTION 2) */}
      <section className="dashboard-summary-section" style={{ marginTop: '20px', marginBottom: '20px' }} aria-label={t('dashboardSummary')}>
        <h3 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('dashboardSummary')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>

          {/* Reminders & Overdue card */}
          <div style={{ background: '#fff', padding: '14px', borderRadius: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 10px rgba(111,78,55,0.02)' }}>
            <span style={{ fontSize: '11px', color: '#5e746f', fontWeight: 'bold', display: 'block' }}>{t('dashboardReminderSummary')}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '6px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#173f3b' }}>{todayRemindersCount}</span>
              <span style={{ fontSize: '12px', color: '#5e746f' }}>{interpolate(t('scheduledCount'), { count: todayRemindersCount }).replace(String(todayRemindersCount), '').trim()}</span>
            </div>
            <span style={{ fontSize: '12px', color: overdueCount > 0 ? '#e05a47' : '#5e746f', fontWeight: overdueCount > 0 ? 'bold' : 'normal' }}>
              {overdueCount > 0 ? `🚨 ${interpolate(t('overdueCount'), { count: overdueCount })}` : `✓ ${t('noOverdue')}`}
            </span>
          </div>

          {/* Today Record Status card (Medications & Meals) */}
          <div style={{ background: '#fff', padding: '14px', borderRadius: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 10px rgba(111,78,55,0.02)' }}>
            <span style={{ fontSize: '11px', color: '#5e746f', fontWeight: 'bold', display: 'block' }}>{t('mealMedicationProgress')}</span>
            <div style={{ margin: '8px 0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>💊 {t('medicationProgress')}</span>
                <span style={{ fontWeight: 'bold', color: hasMedToday ? '#173f3b' : '#5e746f' }}>
                  {hasMedToday ? t('recorded') : t('notRecordedToday')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>🥣 {t('mealProgress')}</span>
                <span style={{ fontWeight: 'bold', color: hasMealToday ? '#173f3b' : '#5e746f' }}>
                  {hasMealToday ? t('recorded') : t('notRecordedToday')}
                </span>
              </div>
            </div>
          </div>

          {/* Latest Weight card */}
          <div style={{ background: '#fff', padding: '14px', borderRadius: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 10px rgba(111,78,55,0.02)' }}>
            <span style={{ fontSize: '11px', color: '#5e746f', fontWeight: 'bold', display: 'block' }}>{t('latestWeight')}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '6px 0' }}>
              {latestWeight ? (
                <>
                  <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#173f3b' }}>{formatWeight(latestWeight.weightKg, locale)}</span>
                </>
              ) : (
                <span style={{ fontSize: '14px', color: '#a0b2ae', margin: '4px 0' }}>{t('noWeight')}</span>
              )}
            </div>
            {latestWeight && (
              <span style={{ fontSize: '11px', color: '#5e746f', display: 'block' }}>
                📅 {interpolate(t('recordedDate'), { date: formatDate(latestWeight.date, locale) })}
              </span>
            )}
          </div>

          {/* Latest Health Event card */}
          <div style={{ background: '#fff', padding: '14px', borderRadius: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 10px rgba(111,78,55,0.02)' }}>
            <span style={{ fontSize: '11px', color: '#5e746f', fontWeight: 'bold', display: 'block' }}>{t('latestAbnormal')}</span>
            <div style={{ margin: '6px 0' }}>
              {latestEvent ? (
                <>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e05a47', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🚨 {abnormalLabels[latestEvent.category] || t('abnormalOther')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#5e746f' }}>
                    {formatDate(latestEvent.timestamp, locale)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '14px', color: '#a0b2ae', display: 'block', margin: '4px 0' }}>{t('noAbnormal')}</span>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ⏰ TODAY REMINDERS OPERATION PANEL (SECTION 3) */}
      <section className="dashboard-reminders-section" style={{ marginBottom: '20px' }} aria-label={t('todayCareReminders')}>
        <h3 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('todayCareReminders')}
        </h3>

        {todayItems.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f' }}>
            🎉 <b>{t('allDoneTitle')}</b><p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#809692' }}>{t('allDoneBody')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayItems.map((item) => {
              const occurrenceTime = item.next ? formatTime(item.next, locale) : '--:--'
              const isOverdue = item.next && item.next.getTime() < Date.now()
              const key = item.next ? occurrenceKey(item.reminder.id, item.next) : ''
              const completed = item.reminder.completedOccurrences.includes(key)

              return (
                <div
                  key={item.reminder.id}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: isOverdue && !completed ? '1.5px solid #e05a47' : '1px solid #f2e9dc',
                    boxShadow: '0 4px 10px rgba(111,78,55,0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', background: isOverdue ? '#fdf2f0' : '#f5f8fd', color: isOverdue ? '#e05a47' : '#478be0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {isOverdue ? `⚠️ ${t('reminderStatusOverdue')}` : t('statusTodo')}
                      </span>
                      <span style={{ fontSize: '13px', color: '#5e746f', fontWeight: 'bold' }}>
                        🕒 {occurrenceTime}
                      </span>
                    </div>
                    <b style={{ fontSize: '15px', color: '#173f3b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.reminder.title}
                    </b>
                    <small style={{ fontSize: '12px', color: '#809692', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.reminder.dose || item.reminder.details || t('noDetailsDisplay')}
                    </small>
                  </div>

                  <button
                    onClick={() => complete(item)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#173f3b',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {t('btnComplete')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 🚀 QUICK ADD ACTIONS BOARD (SECTION 4) */}
      <section className="dashboard-quickadd-section" style={{ marginBottom: '20px' }} aria-label={t('quickCareEntry')}>
        <h3 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('quickCareEntry')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>

          <button
            onClick={() => setEditorKind('medication')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #c8e0db', background: '#fff', cursor: 'pointer', textAlign: 'left', minHeight: '48px' }}
          >
            <span style={{ fontSize: '18px' }}>💊</span>
            <span><b>{t('quickMedication')}</b></span>
          </button>

          <button
            onClick={() => setEditorKind('feeding')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #c8e0db', background: '#fff', cursor: 'pointer', textAlign: 'left', minHeight: '48px' }}
          >
            <span style={{ fontSize: '18px' }}>🥣</span>
            <span><b>{t('quickMeal')}</b></span>
          </button>

          <button
            onClick={() => setView('health')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #c8e0db', background: '#fff', cursor: 'pointer', textAlign: 'left', minHeight: '48px' }}
          >
            <span style={{ fontSize: '18px' }}>⚖</span>
            <span><b>{t('quickWeight')}</b></span>
          </button>

          <button
            onClick={() => setView('event')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #c8e0db', background: '#fff', cursor: 'pointer', textAlign: 'left', minHeight: '48px' }}
          >
            <span style={{ fontSize: '18px' }}>🚨</span>
            <span><b>{t('quickAbnormal')}</b></span>
          </button>

          <button
            onClick={() => setView('visual-comparison')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #c8e0db', background: '#fff', cursor: 'pointer', textAlign: 'left', minHeight: '48px', gridColumn: 'span 2' }}
          >
            <span style={{ fontSize: '18px' }}>🔍</span>
            <span><b>{t('quickComparison')}</b></span>
          </button>

        </div>
      </section>

      {/* 📜 RECENT ACTIVITY LIST (SECTION 5) */}
      <section className="dashboard-activity-section" style={{ marginBottom: '32px' }} aria-label={t('recentActivity')}>
        <h3 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('recentActivity')}
        </h3>

        {getRecentActivities().length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f', fontSize: '13px' }}>
            {t('recentActivityEmpty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', borderRadius: '16px', padding: '14px', border: '1px solid #f2e9dc' }}>
            {getRecentActivities().map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f9f6f0',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>{act.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                    <b style={{ fontSize: '14px', color: '#173f3b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.title}
                    </b>
                    <span style={{ fontSize: '11px', color: '#809692', flexShrink: 0 }}>
                      {formatDate(act.date, locale, { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#5e746f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {act.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. EXISTING HOME SECTIONS BELOW (Feature shortcuts, Low Stock Refill, Vet visits, and single-device data safety) */}
      <section className="game-actions" aria-label={t('commonFeatures')}>
        <button className="health-action upgraded-card" onClick={() => setView('health')}>
          <div className="feature-card-header">
            <i><img src={healthFeatureIcon} alt="" /></i>
            <span className="card-badge">{t('navHealth')}</span>
          </div>
          <b>{t('featureHealthTitle')}</b>
          <small>{t('featureHealthDesc')}</small>
        </button>

        <button className="reminder-action upgraded-card" onClick={() => setEditorKind('medication')}>
          <div className="feature-card-header">
            <i><img src={reminderFeatureIcon} alt="" /></i>
            <span className="card-badge highlight">{t('navReminders')}</span>
          </div>
          <b>{t('featureReminderTitle')}</b>
          <small>{t('featureReminderDesc')}</small>
          {activeReminders.length > 0 && <span className="action-counter-dot">{activeReminders.length}</span>}
        </button>

        <button className="memory-action upgraded-card" onClick={() => setView('memories')}>
          <div className="feature-card-header">
            <i><img src={memoriesFeatureIcon} alt="" /></i>
            <span className="card-badge">{t('badgeMemories')}</span>
          </div>
          <b>{t('featureMemoriesTitle')}</b>
          <small>{t('featureMemoriesDesc')}</small>
        </button>

        <button className="music-action upgraded-card" onClick={() => setView('relax')}>
          <div className="feature-card-header">
            <i><img src={musicFeatureIcon} alt="" /></i>
            <span className="card-badge">{t('badgeRelax')}</span>
          </div>
          <b>{t('featureRelaxTitle')}</b>
          <small>{t('featureRelaxDesc')}</small>
        </button>

        <button className="senior-action upgraded-card" onClick={() => setView('senior')} style={{ background: '#fdfaf5', border: '1.5px solid #f0e2cf' }}>
          <div className="feature-card-header">
            <i><img src={dailyPassport3d} alt="" style={{ transform: 'scale(1.1)' }} /></i>
            <span className="card-badge" style={{ background: '#d3a665', color: '#fff' }}>{t('seniorBadge')}</span>
          </div>
          <b style={{ color: '#8c6020' }}>{t('seniorCenter')}</b><small>{t('seniorCenterDesc')}</small>
        </button>

        <button className="event-action upgraded-card" onClick={() => setView('event')} style={{ background: '#fdf2f0', border: '1.5px solid #f9dedb' }}>
          <div className="feature-card-header">
            <i><img src={reminderFeatureIcon} alt="" style={{ filter: 'hue-rotate(320deg)' }} /></i>
            <span className="card-badge" style={{ background: '#e05a47', color: '#fff' }}>{t('guardianBadge')}</span>
          </div>
          <b style={{ color: '#6d1d11' }}>{t('abnormalCenter')}</b><small>{t('abnormalCenterDesc')}</small>
        </button>

        <button className="visual-comparison-action upgraded-card" onClick={() => setView('visual-comparison')} style={{ background: '#f5f8fd', border: '1.5px solid #dbe6f9' }}>
          <div className="feature-card-header">
            <i><img src={memoriesFeatureIcon} alt="" style={{ filter: 'hue-rotate(180deg)' }} /></i>
            <span className="card-badge" style={{ background: '#478be0', color: '#fff' }}>{t('comparisonBadge')}</span>
          </div>
          <b style={{ color: '#113a6d' }}>{t('comparisonCenter')}</b><small>{t('comparisonCenterDesc')}</small>
        </button>
      </section>

      {lowStock && (
        <button className="stock-alert" onClick={() => setEditorKind('medication')}>
          <i><Package size={30} weight="duotone" /></i>
          <span><b>{interpolate(t('stockTitle'), { title: lowStock.reminder.title })}</b><small>{interpolate(t('stockSummary'), { remaining: lowStock.summary.remaining, unit: lowStock.reminder.medicationStock?.unit || '', days: lowStock.summary.remainingDays })}</small></span>
          <CaretRight size={22} weight="bold" />
        </button>
      )}

      {vetVisits.length > 0 && (
        <section className="visit-section">
          <div className="section-title"><div><span className="eyebrow">VET VISITS</span><h2>{t('vetSectionTitle')}</h2></div><small>{t('vetSectionSub')}</small></div>
          <div className="visit-list">
            {vetVisits.map((visit) => {
              const total = (visit.vetVisit?.preparationItems.length || 0) + (visit.vetVisit?.questions.length || 0)
              const done = [...(visit.vetVisit?.preparationItems || []), ...(visit.vetVisit?.questions || [])].filter((item) => item.completed).length
              return (
                <button key={visit.id} onClick={() => setOpenVetVisit(visit)}>
                  <i><Heartbeat size={22} weight="duotone" /></i>
                  <span><b>{visit.title}</b><small>{interpolate(t('visitPreparationSummary'), { date: formatDate(visit.startDate, locale), time: visit.time, done, total })}</small></span>
                  <em>{visit.vetVisit?.diagnosis ? t('vetVisitDiagnosisDone') : t('vetVisitCheckPreparation')} <CaretRight size={15} /></em>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="data-safety">
        <div><i><LockKey size={24} weight="duotone" /></i><span><b>{t('dataSafetyTitle')}</b><small>{t('dataSafetySub')}</small></span></div>
        <div className="backup-actions"><button className="vet-report-action" onClick={exportVetPdf}>{t('btnExportPdf')}</button><button onClick={() => void exportData()}>{t('btnExportData')}</button><button onClick={() => restoreInputRef.current?.click()}>{t('btnImportData')}</button><input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} style={{ display: 'none' }} /></div>
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

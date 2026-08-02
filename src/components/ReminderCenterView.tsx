import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Plus,
  Play,
  Pause,
  Trash,
  PencilSimple,
  SpeakerHigh,
} from '@phosphor-icons/react'
import type { Pet, CareReminder, ReminderKind, VoiceClip } from '../domain'
import { kindLabels, repeatLabels } from '../domain'
import { classifyReminderOccurrences, type ClassifiedOccurrence, type ReminderCenterTab } from '../services/ReminderSelectorService'

interface ReminderCenterViewProps {
  pets: Pet[]
  pet?: Pet
  activePet: string
  setActivePet: (id: string) => void
  reminders: CareReminder[]
  voices: VoiceClip[]
  onBack: () => void
  onComplete: (reminder: CareReminder, occurrence: Date) => Promise<void>
  onSkip: (reminder: CareReminder, occurrence: Date) => Promise<void>
  onSnooze: (reminder: CareReminder, occurrence: Date, minutes: number) => Promise<void>
  onDelete: (reminderId: string) => Promise<void>
  onCreateNew: (kind: ReminderKind) => void
  onEditExisting: (reminder: CareReminder) => void
}

const KIND_FILTERS: { key: ReminderKind | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: '全部類型', icon: '📋' },
  { key: 'medication', label: '吃藥', icon: '💊' },
  { key: 'feeding', label: '吃飯', icon: '🥣' },
  { key: 'vet', label: '看醫生', icon: '🏥' },
  { key: 'vaccine', label: '疫苗', icon: '💉' },
  { key: 'care', label: '日常照護', icon: '♡' },
]

export default function ReminderCenterView({
  pets,
  pet,
  activePet,
  setActivePet,
  reminders,
  voices,
  onBack,
  onComplete,
  onSkip,
  onSnooze,
  onDelete,
  onCreateNew,
  onEditExisting,
}: ReminderCenterViewProps) {
  const [activeTab, setActiveTab] = useState<ReminderCenterTab>('today')
  const [activeKind, setActiveKind] = useState<ReminderKind | 'all'>('all')

  // Audio preview lifecycle states
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewUrlRef = useRef<string>('')
  const previewTimeoutRef = useRef<number | undefined>(undefined)

  const stopPreview = () => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = undefined
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
    setPlayingClipId(null)
  }

  const playVoice = (clip: VoiceClip) => {
    stopPreview()
    try {
      const url = URL.createObjectURL(clip.blob)
      const audio = new Audio(url)
      previewUrlRef.current = url
      previewAudioRef.current = audio
      setPlayingClipId(clip.id)

      const startPlaybackTime = Date.now()

      const playAndLoop = () => {
        audio.play().catch(() => stopPreview())
        audio.onended = () => {
          if (Date.now() - startPlaybackTime < 30000) {
            audio.currentTime = 0
            audio.play().catch(() => stopPreview())
          } else {
            stopPreview()
          }
        }
      }

      playAndLoop()
      previewTimeoutRef.current = window.setTimeout(stopPreview, 31000) as any
    } catch (err) {
      console.error('Audio preview failed', err)
      stopPreview()
    }
  }

  // Cleanup preview url and timers on unmount
  useEffect(() => {
    return () => stopPreview()
  }, [])

  if (!pet) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#fbf8f3', minHeight: '100vh', color: '#173f3b' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="返回">
            <ArrowLeft size={24} color="#173f3b" />
          </button>
          <h1 style={{ margin: 0, fontSize: '20px' }}>提醒中心</h1>
        </header>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px 16px', border: '1px solid #f2e9dc' }}>
          <h3>⚠️ 未選擇毛孩</h3>
          <p>請先回到今日看板建立或點選一隻毛孩檔案。</p>
        </div>
      </div>
    )
  }

  // Aggregate and classify occurrences using the shared selector service
  const classified = classifyReminderOccurrences(reminders, pet.id)

  const getFilteredList = (tab: ReminderCenterTab) => {
    const rawList = classified[tab]
    if (activeKind === 'all') return rawList
    return rawList.filter((item) => item.reminder.kind === activeKind)
  }

  const filteredList = getFilteredList(activeTab)

  const handleDeleteReminder = async (id: string) => {
    if (window.confirm('確定要永久刪除此項照護提醒嗎？此動作將會一併取消後續的所有預排日程。')) {
      await onDelete(id)
    }
  }

  const handleSnoozeMinutes = async (occ: ClassifiedOccurrence, minutes: number) => {
    await onSnooze(occ.reminder, occ.occurrence, minutes)
    alert(`🕒 已成功延後提醒 ${minutes} 分鐘。`)
  }

  const renderSnoozeMenu = (occ: ClassifiedOccurrence) => {
    return (
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => handleSnoozeMinutes(occ, 10)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #dce7e4', background: '#fdf8f0', color: '#8c6020', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          延後 10 分
        </button>
        <button
          onClick={() => handleSnoozeMinutes(occ, 30)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #dce7e4', background: '#fdf8f0', color: '#8c6020', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          延後 30 分
        </button>
        <button
          onClick={() => handleSnoozeMinutes(occ, 60)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #dce7e4', background: '#fdf8f0', color: '#8c6020', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          延後 1 小時
        </button>
      </div>
    )
  }

  return (
    <div className="reminder-center-container" style={{ padding: '16px', paddingBottom: '90px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left', color: '#173f3b' }}>

      {/* Header and Back Navigation */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label="返回今日看板">
          <ArrowLeft size={24} color="#173f3b" />
        </button>
        <div>
          <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>REMINDER CENTER</span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet.name} 的守護提醒中心
          </h1>
        </div>
      </header>

      {/* Pet switching filter list (Only visible when pets.length > 1) */}
      {pets.length > 1 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            切換守護對象 (Switch Pet)
          </label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
            {pets.map((p) => {
              const isActive = p.id === activePet
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePet(p.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: isActive ? '2px solid #173f3b' : '1px solid #dce7e4',
                    background: isActive ? '#eef5f3' : '#fff',
                    color: '#173f3b',
                    fontSize: '13px',
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Status Classification Tabs with Badges */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
        {(['today', 'overdue', 'upcoming', 'completed', 'skipped', 'all'] as ReminderCenterTab[]).map((tab) => {
          const isSelected = activeTab === tab
          const count = classified[tab].length
          const tabLabel: Record<string, string> = {
            today: '今天',
            overdue: '逾期未完',
            upcoming: '未來預排',
            completed: '已完成',
            skipped: '已略過',
            all: '全部日程',
          }

          let badgeBg = '#f5f5f5'
          let badgeColor = '#5e746f'
          if (tab === 'overdue' && count > 0) {
            badgeBg = '#fdf2f0'
            badgeColor = '#e05a47'
          } else if (tab === 'today') {
            badgeBg = '#eef5f3'
            badgeColor = '#173f3b'
          }

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: isSelected ? '2px solid #173f3b' : '1px solid #f2e9dc',
                background: isSelected ? '#173f3b' : '#fff',
                color: isSelected ? '#fff' : '#173f3b',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 10px rgba(111,78,55,0.02)',
              }}
            >
              <span>{tabLabel[tab]}</span>
              <span style={{ fontSize: '11px', background: isSelected ? 'rgba(255,255,255,0.2)' : badgeBg, color: isSelected ? '#fff' : badgeColor, padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Reminder Category Filter Row */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px' }}>
        {KIND_FILTERS.map((f) => {
          const isSelected = activeKind === f.key
          return (
            <button
              key={f.key}
              onClick={() => setActiveKind(f.key)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: isSelected ? '1.5px solid #d3a665' : '1px solid #dce7e4',
                background: isSelected ? '#fdf8f0' : '#fff',
                color: isSelected ? '#8c6020' : '#5e746f',
                fontSize: '12.5px',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.icon} {f.label}
            </button>
          )
        })}
      </div>

      {/* Quick Create Link Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <b style={{ fontSize: '15px' }}>📋 照護行程列表</b>
        <button
          onClick={() => onCreateNew('medication')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: '#173f3b',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} weight="bold" /> 新增提醒
        </button>
      </div>

      {/* Main Reminder List / Empty States */}
      {filteredList.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px 16px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f' }}>
          <Calendar size={36} color="#a0b2ae" style={{ marginBottom: '10px' }} />
          <h3>沒有符合篩選條件的提醒項目</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#809692' }}>
            設定一些吃藥、吃飯、看醫生、疫苗或日常照護提醒，行程會自動排定在這裡。
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredList.map((occ) => {
            const isCompleted = occ.status === 'completed' || occ.status === 'late'
            const isSkipped = occ.status === 'skipped'
            const isOverdue = occ.occurrence < new Date() && occ.status === 'missed'

            const timeStr = occ.occurrence.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
            const dateStr = occ.occurrence.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' })

            // Look up loop audio clip reference
            const voiceId = occ.reminder.voiceClipId
            const voiceClip = voiceId ? voices.find((v) => v.id === voiceId) : null
            const isAudioPlaying = playingClipId === voiceId && voiceId

            return (
              <article
                key={occ.id}
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  padding: '16px',
                  border: isOverdue ? '1.5px solid #e05a47' : '1.5px solid #f2e9dc',
                  boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', background: '#f5f5f5', color: '#5e746f', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {kindLabels[occ.reminder.kind]}
                      </span>
                      {isOverdue && (
                        <span style={{ fontSize: '11px', background: '#fdf2f0', color: '#e05a47', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          ⚠️ 逾期
                        </span>
                      )}
                      {isCompleted && (
                        <span style={{ fontSize: '11px', background: '#eef5f3', color: '#173f3b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          ✓ 已完成
                        </span>
                      )}
                      {isSkipped && (
                        <span style={{ fontSize: '11px', background: '#f5f5f5', color: '#a0b2ae', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          已略過
                        </span>
                      )}
                    </div>
                    <b style={{ fontSize: '16px', color: '#173f3b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {occ.reminder.title}
                    </b>
                  </div>

                  {/* Actions Button Panel */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => onEditExisting(occ.reminder)}
                      style={{ padding: '6px', borderRadius: '8px', border: '1px solid #dce7e4', background: '#fff', color: '#173f3b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="編輯提醒項目"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(occ.reminder.id)}
                      style={{ padding: '6px', borderRadius: '8px', border: '1px solid #f9dedb', background: '#fff', color: '#e05a47', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="刪除提醒"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Body Row (Meta, dates, repeat, dose) */}
                <div style={{ fontSize: '13.5px', color: '#5e746f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    📅 {dateStr}・🕒 {timeStr}・({repeatLabels[occ.reminder.repeat]})
                  </div>
                  {(occ.reminder.dose || occ.reminder.details) && (
                    <div style={{ color: '#263b37', background: '#fdfaf5', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #d3a665', fontSize: '13px', marginTop: '4px' }}>
                      {occ.reminder.dose || occ.reminder.details}
                    </div>
                  )}
                </div>

                {/* Looping Custom Audio Preview Section */}
                {voiceClip && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fcfbf7', padding: '8px 12px', borderRadius: '12px', border: '1px solid #f2e9dc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8c6020' }}>
                      <SpeakerHigh size={16} />
                      <span>🎵 專屬語音：{voiceClip.name} (Loop 至少30秒)</span>
                    </div>
                    <button
                      onClick={() => isAudioPlaying ? stopPreview() : playVoice(voiceClip)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#d3a665',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isAudioPlaying ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                      {isAudioPlaying ? '停止' : '試聽'}
                    </button>
                  </div>
                )}

                {/* Operations Buttons Row (Complete, Skip, Snooze) */}
                {!isCompleted && !isSkipped && (
                  <div style={{ borderTop: '1px dashed #f2e9dc', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onComplete(occ.reminder, occ.occurrence)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#173f3b',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={16} weight="fill" /> 標記完成
                      </button>
                      <button
                        onClick={() => onSkip(occ.reminder, occ.occurrence)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: '1.5px solid #dce7e4',
                          background: '#fff',
                          color: '#5e746f',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        本次略過
                      </button>
                    </div>

                    {/* Snooze / Delay Section */}
                    {renderSnoozeMenu(occ)}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

    </div>
  )
}

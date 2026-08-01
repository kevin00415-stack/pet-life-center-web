import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Camera,
  VideoCamera,
} from '@phosphor-icons/react'
import type { Pet } from '../domain'

interface EventCenterViewProps {
  pet?: Pet
  onBack: () => void
}

interface AbnormalEvent {
  id: string
  petId: string
  category: 'seizure' | 'vomiting' | 'diarrhea' | 'injury' | 'walking' | 'breathing' | 'appetite' | 'other'
  notes: string
  hasPhoto: boolean
  hasVideo: boolean
  timestamp: number
}

const CATEGORIES = [
  { key: 'seizure', label: '癲癇/抽搐 (Seizure)', icon: '🧠' },
  { key: 'vomiting', label: '嘔吐/噁心 (Vomiting)', icon: '🤮' },
  { key: 'diarrhea', label: '拉肚子/腹瀉 (Diarrhea)', icon: '🚽' },
  { key: 'injury', label: '外傷/受傷 (Injury)', icon: '🩹' },
  { key: 'walking', label: '走路異常 (Walking)', icon: '🐕' },
  { key: 'breathing', label: '呼吸急促/困難 (Breathing)', icon: '🫁' },
  { key: 'appetite', label: '食慾不振 (Appetite Loss)', icon: '🥣' },
  { key: 'other', label: '其他異常 (Other)', icon: '⚠️' },
] as const

export default function EventCenterView({ pet, onBack }: EventCenterViewProps) {
  const [category, setCategory] = useState<AbnormalEvent['category']>('other')
  const [notes, setNotes] = useState('')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [history, setHistory] = useState<AbnormalEvent[]>([])

  const storageKey = pet ? `maohai-abnormal-events-${pet.id}` : ''

  // Load history of abnormal events for the active pet
  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse abnormal events history', e)
      }
    } else {
      setHistory([])
    }
  }, [storageKey])

  const handleSave = () => {
    if (!storageKey || !pet) return

    const newEvent: AbnormalEvent = {
      id: 'abnormal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      petId: pet.id,
      category,
      notes: notes.trim() || '未填寫詳細說明',
      hasPhoto,
      hasVideo,
      timestamp: Date.now(),
    }

    const updatedHistory = [newEvent, ...history]
    setHistory(updatedHistory)
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory))

    // Clear form inputs
    setCategory('other')
    setNotes('')
    setHasPhoto(false)
    setHasVideo(false)

    alert('⚠️ 異常事件已成功記錄並自動同步至健康時間軸！')
  }

  return (
    <div className="event-center-container" style={{ padding: '16px', paddingBottom: '90px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label="返回今日看板">
          <ArrowLeft size={24} color="#173f3b" />
        </button>
        <div>
          <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>GUARDIAN EVENT CENTER</span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet?.name || '毛孩'}的異常事件中心
          </h1>
        </div>
      </header>

      {/* Philosophy banner */}
      <div style={{ background: '#fdf2f0', border: '1.5px solid #f9dedb', borderRadius: '14px', padding: '16px', marginBottom: '20px', color: '#6d1d11', fontSize: '14px', lineHeight: '1.6' }}>
        📢 <b>重要守護提醒：</b>
        此功能用於<b>「即時保留現場證據與異變時間紀錄」</b>以供後續看診。
        本系統不提供任何醫療診斷或 AI 分析，若有急症請務必即刻聯繫專業獸醫。
      </div>

      {/* Select Event Type Category Grid */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          選擇異常類型 (Select Event Type)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {CATEGORIES.map((item) => {
            const isSelected = category === item.key
            return (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 12px',
                  borderRadius: '14px',
                  border: isSelected ? '2.5px solid #e05a47' : '1.5px solid #f2e9dc',
                  background: isSelected ? '#fdf2f0' : '#fff',
                  color: isSelected ? '#e05a47' : '#173f3b',
                  fontSize: '14px',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 10px rgba(111, 78, 55, 0.02)',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span>{item.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Media Recording Placeholders (Requirement 4 & 5) */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          現場證據保留 (Media Upload - Placeholder)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {/* Photo Box */}
          <button
            onClick={() => setHasPhoto(!hasPhoto)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px 12px',
              borderRadius: '16px',
              border: '1.5px dashed #dce7e4',
              background: hasPhoto ? '#eef5f3' : '#fff',
              color: hasPhoto ? '#173f3b' : '#5e746f',
              cursor: 'pointer',
            }}
          >
            <Camera size={28} weight={hasPhoto ? 'fill' : 'regular'} />
            <b style={{ fontSize: '13px' }}>{hasPhoto ? '✅ 已附加模擬照片' : '📷 拍下現場照片'}</b>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>Capacitor 鏡頭對接 (預留)</span>
          </button>

          {/* Video Box */}
          <button
            onClick={() => setHasVideo(!hasVideo)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px 12px',
              borderRadius: '16px',
              border: '1.5px dashed #dce7e4',
              background: hasVideo ? '#eef5f3' : '#fff',
              color: hasVideo ? '#173f3b' : '#5e746f',
              cursor: 'pointer',
            }}
          >
            <VideoCamera size={28} weight={hasVideo ? 'fill' : 'regular'} />
            <b style={{ fontSize: '13px' }}>{hasVideo ? '✅ 已附加模擬影片' : '🎥 錄製現場影片'}</b>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>Capacitor 錄影對接 (預留)</span>
          </button>
        </div>
      </section>

      {/* Quick Notes Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          快速狀況備忘 (Quick Note)
        </h2>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例如：抽搐持續了約一分鐘，眼神有些渙散，口吐白沫，之後慢慢恢復神智..."
            style={{
              width: '100%',
              minHeight: '90px',
              border: '1.5px solid #dce7e4',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '15px',
              color: '#263b37',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          background: '#e05a47',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 18px rgba(224, 90, 71, 0.15)',
          marginBottom: '32px',
        }}
      >
        儲存並自動同步至健康時間軸
      </button>

      {/* History timeline within Event Center */}
      <section>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          歷史異常事件 (Historical Events)
        </h2>

        {history.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f' }}>
            尚無任何異常事件紀錄。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((ev) => {
              const matchedCat = CATEGORIES.find((c) => c.key === ev.category)
              const dateStr = new Date(ev.timestamp).toLocaleString('zh-TW', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })

              return (
                <article
                  key={ev.id}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f2e9dc',
                    boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#173f3b' }}>
                      {matchedCat?.icon} {matchedCat?.label.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '12px', color: '#5e746f' }}>
                      🕒 {dateStr}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '14px', color: '#263b37', lineHeight: '1.5', background: '#fdfaf5', padding: '10px', borderRadius: '10px', borderLeft: '3px solid #e05a47' }}>
                    {ev.notes}
                  </p>

                  {(ev.hasPhoto || ev.hasVideo) && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      {ev.hasPhoto && <span style={{ fontSize: '11px', background: '#eef5f3', color: '#173f3b', padding: '3px 8px', borderRadius: '6px' }}>📷 模擬照片附屬</span>}
                      {ev.hasVideo && <span style={{ fontSize: '11px', background: '#eef5f3', color: '#173f3b', padding: '3px 8px', borderRadius: '6px' }}>🎥 模擬影片附屬</span>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

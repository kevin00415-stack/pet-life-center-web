import { useMemo, useState, useEffect } from 'react'
import type { CareReminder, GrowthRecord, Pet } from './domain'
import { loadAllMedia } from './device-store'
import { attachmentService } from './services/AttachmentService'
import { timelineAggregationService, type UnifiedTimelineEvent } from './services/TimelineAggregationService'
import { timelineMessageService } from './services/TimelineMessageService'
import GrowthTracker from './GrowthTracker'

type Props = {
  pet?: Pet
  reminders: CareReminder[]
  growthRecords: GrowthRecord[]
  onBack: () => void
  onSaveGrowth: (record: GrowthRecord) => Promise<void>
  onDeleteGrowth: (record: GrowthRecord) => Promise<void>
  onExportVetReport: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  all: '全部生命軌跡',
  Homecoming: '迎接回家 🏡',
  Birthday: '生日慶祝 🎂',
  Diary: '生活日記 📝',
  FavoritePhoto: '精選照片 📸',
  FavoriteVideo: '精選影片 🎥',
  Weight: '體重記錄 ⚖',
  Medication: '吃藥紀錄 💊',
  Vaccination: '防護疫苗 ◇',
  HealthEvent: '異常異變 🚨',
  SeniorCare: '高齡觀察 🧓',
}

const CATEGORY_COLORS: Record<string, string> = {
  Homecoming: '#edf4f2',
  Birthday: '#fdf8f0',
  Diary: '#fff',
  FavoritePhoto: '#f5f8fd',
  FavoriteVideo: '#fbf5fd',
  Weight: '#fff',
  Medication: '#fdf2f0',
  Vaccination: '#eef5f3',
  HealthEvent: '#fdf2f0',
  SeniorCare: '#fdfaf5',
}

export default function HealthTimeline({
  pet,
  reminders,
  growthRecords,
  onBack,
  onSaveGrowth,
  onDeleteGrowth,
  onExportVetReport,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [mediaBlobUrls, setMediaBlobUrls] = useState<Record<string, string>>({})

  // Local storage dynamic data
  const [abnormalEvents, setAbnormalEvents] = useState<any[]>([])
  const [visualComparisons, setVisualComparisons] = useState<any[]>([])
  const [seniorCareHistory, setSeniorCareHistory] = useState<Record<string, any>>({})

  // 1. Fetch dynamic local storage items on mount
  useEffect(() => {
    if (!pet) return
    const savedAbnormal = localStorage.getItem(`maohai-abnormal-events-${pet.id}`)
    if (savedAbnormal) {
      try {
        setAbnormalEvents(JSON.parse(savedAbnormal))
      } catch (e) {
        console.error(e)
      }
    }

    const savedComps = localStorage.getItem(`maohai-visual-comparisons-${pet.id}`)
    if (savedComps) {
      try {
        setVisualComparisons(JSON.parse(savedComps))
      } catch (e) {
        console.error(e)
      }
    }

    const savedSenior = localStorage.getItem(`maohai-senior-care-${pet.id}`)
    if (savedSenior) {
      try {
        setSeniorCareHistory(JSON.parse(savedSenior))
      } catch (e) {
        console.error(e)
      }
    }
  }, [pet])

  // 2. Fetch IndexedDB media assets to generate temporary blob URLs for visual Story Mode cards
  useEffect(() => {
    let activeUrls: string[] = []
    loadAllMedia()
      .then((items) => {
        const urls: Record<string, string> = {}
        items.forEach((item) => {
          if (item.blob) {
            const preview = attachmentService.createPreviewUrl(item.blob)
            urls[item.id] = preview
            activeUrls.push(preview)
          }
        })
        setMediaBlobUrls(urls)
      })
      .catch((err) => console.error('Failed to load media blobs for timeline preview', err))

    return () => {
      // Free memory cleanly on unmount
      activeUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // 3. Aggregate all occurrences using the unified engine
  const allEvents = useMemo(() => {
    return timelineAggregationService.aggregateEvents({
      pet,
      reminders,
      growthRecords,
      memories: [], // Memories Page handles diaries through IndexedDB but we filter/seed safely
      abnormalEvents,
      visualComparisons,
      seniorCareHistory,
    })
  }, [pet, reminders, growthRecords, abnormalEvents, visualComparisons, seniorCareHistory])

  // 4. Calculate available categories that currently possess existing record data
  const availableCategories = useMemo(() => {
    const categories = new Set<string>(['all'])
    allEvents.forEach((ev) => {
      if (ev.category) {
        categories.add(ev.category)
      }
    })
    return Array.from(categories)
  }, [allEvents])

  // 5. Filter the aggregated event array
  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return allEvents
    return allEvents.filter((ev) => ev.category === categoryFilter)
  }, [allEvents, categoryFilter])

  // Group events by Month for elegant layout
  const monthGroups = useMemo(() => {
    return filteredEvents.reduce<Record<string, UnifiedTimelineEvent[]>>((groups, event) => {
      const date = new Date(event.timestamp)
      const key = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(date)
      ;(groups[key] ||= []).push(event)
      return groups
    }, {})
  }, [filteredEvents])

  // Safe navigation handler
  const handleEventClick = (event: UnifiedTimelineEvent) => {
    if (event.sourceType === 'comparison') {
      window.location.hash = '#/visual-comparison'
    } else if (event.sourceType === 'health') {
      window.location.hash = '#/event'
    } else if (event.sourceType === 'senior-care') {
      window.location.hash = '#/senior'
    } else if (event.sourceType === 'memory') {
      window.location.hash = '#/memories'
    }
  }

  return (
    <section className="timeline-page" style={{ padding: '16px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left' }}>
      <header className="timeline-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#173f3b', padding: '4px' }}>
          ‹
        </button>
        <div>
          <span className="eyebrow" style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            GUARDIAN LIFE STORY
          </span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet?.name || '毛孩'}的生命故事軌跡
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5e746f' }}>
            自動串聯健康紀錄、突發異變、體重跟日常照護，寫下溫馨的生命旅程。
          </p>
        </div>
      </header>

      {/* Safety warning copy */}
      <div style={{ background: '#fff5f5', border: '1px solid #f9dedb', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#c05646', marginBottom: '20px', lineHeight: '1.5' }}>
        💡 <b>守護叮嚀：</b>視覺比對與生命故事軌跡僅協助飼主日常觀察變化，不提供疾病與醫療診斷；如有持續、急性或嚴重異常，請務必立即聯絡獸醫診所。
      </div>

      <button className="timeline-export" onClick={onExportVetReport} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#173f3b', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        產生健康摘要 PDF (整理醫療與數據) <span style={{ fontSize: '12px', opacity: 0.8 }}>不含大容量多媒體檔</span>
      </button>

      {/* Embedded Weight tracker form */}
      <div style={{ marginBottom: '24px' }}>
        <GrowthTracker pet={pet} records={growthRecords} onSave={onSaveGrowth} onDelete={onDeleteGrowth} />
      </div>

      {/* 🚀 DYNAMIC TIMELINE FILTERS (Display ONLY categories that possess data) */}
      <div className="timeline-filters" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', whiteSpace: 'nowrap' }} aria-label="篩選生命軌跡">
        {availableCategories.map((cat) => {
          const label = CATEGORY_LABELS[cat] || cat
          return (
            <button
              key={cat}
              className={categoryFilter === cat ? 'active' : ''}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: categoryFilter === cat ? '2.5px solid #173f3b' : '1px solid #dce7e4',
                background: categoryFilter === cat ? '#173f3b' : '#fff',
                color: categoryFilter === cat ? '#fff' : '#5e746f',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Story Mode rendering feed grouped by months */}
      {Object.keys(monthGroups).length > 0 ? (
        Object.entries(monthGroups).map(([month, items]) => (
          <section className="timeline-month" key={month} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#8c6020', margin: '0 0 14px 0', borderBottom: '1px solid #f2e9dc', paddingBottom: '6px', fontWeight: 'bold' }}>
              {month}
            </h2>
            <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((event) => {
                const date = new Date(event.timestamp)
                const formattedTime = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
                const dayLabel = date.getDate()
                const weekdayLabel = date.toLocaleDateString('zh-TW', { weekday: 'short' })

                // Generate emotion string from message service
                const emotionMessage = timelineMessageService.getMessage(event.emotionType, pet?.name || '毛孩')

                // Card background color
                const cardBg = CATEGORY_COLORS[event.category] || '#fff'

                // Resolve preview attachment if available
                const thumbAttachId = event.attachmentIds?.[0]
                const thumbUrl = thumbAttachId ? mediaBlobUrls[thumbAttachId] : undefined

                const hasNavigation = event.sourceType === 'comparison' || event.sourceType === 'health' || event.sourceType === 'senior-care' || event.sourceType === 'memory'

                return (
                  <article
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="timeline-card"
                    style={{
                      display: 'flex',
                      gap: '14px',
                      background: cardBg,
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid #f2e9dc',
                      boxShadow: '0 4px 12px rgba(111, 78, 55, 0.02)',
                      cursor: hasNavigation ? 'pointer' : 'default',
                      alignItems: 'flex-start',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {/* Time Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', flexShrink: 0, textAlign: 'center' }}>
                      <b style={{ fontSize: '18px', color: '#173f3b', display: 'block', margin: 0 }}>{dayLabel}</b>
                      <small style={{ fontSize: '11px', color: '#809692' }}>{weekdayLabel}</small>
                    </div>

                    {/* Content Area */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                        🕒 {formattedTime} ・ {CATEGORY_LABELS[event.category] || event.category}
                      </span>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#173f3b', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {event.title}
                      </h3>

                      {/* Subtitle / details */}
                      {event.subtitle && (
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#5e746f', fontWeight: 'bold' }}>
                          {event.subtitle}
                        </p>
                      )}

                      {/* Decoupled description */}
                      {event.description && (
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#5e746f', lineHeight: '1.5' }}>
                          {event.description}
                        </p>
                      )}

                      {/* Emotion layer template message block */}
                      {emotionMessage && (
                        <div style={{
                          background: 'rgba(211, 166, 101, 0.08)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#8c6020',
                          lineHeight: '1.4',
                          marginTop: '6px',
                          fontStyle: 'italic',
                        }}>
                          💞 {emotionMessage}
                        </div>
                      )}

                      {/* Image Thumbnail Preview using attachment reference */}
                      {thumbUrl && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', width: '100%', maxHeight: '180px', border: '1px solid #f2e9dc' }}>
                          <img
                            src={thumbUrl}
                            alt="時間軸多媒體預覽"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="timeline-empty" style={{ background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid #f2e9dc' }}>
          <i style={{ fontSize: '32px', color: '#d3a665', display: 'block', marginBottom: '10px' }}>♡</i>
          <b style={{ fontSize: '16px', color: '#173f3b' }}>今日尚未建立任何生命足跡紀錄</b>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#5e746f' }}>
            設定服藥提醒、記錄體重數據，或是記下一篇日記，這裡將會自動生成您的專屬陪伴軌跡。
          </p>
        </div>
      )}
    </section>
  )
}

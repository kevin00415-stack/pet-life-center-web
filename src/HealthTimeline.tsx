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
  all: '全部生命故事',
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
  Homecoming: '#fdfaf5',
  Birthday: '#fdf8f0',
  Diary: '#fff',
  FavoritePhoto: '#fcfaf2',
  FavoriteVideo: '#fbf8fd',
  Weight: '#fff',
  Medication: '#fefbf7',
  Vaccination: '#fcfdfd',
  HealthEvent: '#fffcfc',
  SeniorCare: '#fdfbf7',
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

  // Fetch dynamic local storage items on mount
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

  // Fetch IndexedDB media assets to generate temporary blob URLs for visual Story Mode cards
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

  // Aggregate all occurrences using the unified engine
  const allEvents = useMemo(() => {
    return timelineAggregationService.aggregateEvents({
      pet,
      reminders,
      growthRecords,
      memories: [],
      abnormalEvents,
      visualComparisons,
      seniorCareHistory,
    })
  }, [pet, reminders, growthRecords, abnormalEvents, visualComparisons, seniorCareHistory])

  // Helper: "On This Day" (當年的今日) moments aggregator
  const onThisDayEvents = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentDate = today.getDate()
    const currentYear = today.getFullYear()

    return allEvents.filter((event) => {
      const date = new Date(event.timestamp)
      return (
        date.getMonth() === currentMonth &&
        date.getDate() === currentDate &&
        date.getFullYear() < currentYear
      )
    })
  }, [allEvents])

  // Helper: Detect if a memory is a Favorite / Curated high-priority Highlight
  const isFavoriteMemory = (event: UnifiedTimelineEvent) => {
    const category = event.category
    return (
      category === 'FavoriteMemory' ||
      category === 'FavoritePhoto' ||
      category === 'FavoriteVideo' ||
      event.importance === 'high'
    )
  }

  // Calculate available categories that currently possess existing record data
  const availableCategories = useMemo(() => {
    const categories = new Set<string>(['all'])
    allEvents.forEach((ev) => {
      if (ev.category) {
        categories.add(ev.category)
      }
    })
    return Array.from(categories)
  }, [allEvents])

  // Filter the aggregated event array
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

  // Function to naturally clean up database prefixes/labels in notes/subtitles
  const cleanStoryText = (text?: string) => {
    if (!text) return ''
    return text
      .replace(/^(備忘|備註|說明|Notes|Note|Details|Details:|備忘錄)\s*[:：]?\s*/gi, '')
      .replace(/^過去\s*vs\s*現在\s*\|\s*/gi, '')
      .trim()
  }

  return (
    <section className="timeline-page" style={{ padding: '16px', background: '#fcf9f2', minHeight: '100vh', textAlign: 'left', fontFamily: 'inherit' }}>
      <header className="timeline-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '26px', color: '#173f3b', padding: '4px' }}>
          ‹
        </button>
        <div>
          <span className="eyebrow" style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            PET LIFE ALBUM
          </span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet?.name || '毛孩'}的生命故事相簿
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#5e746f' }}>
            珍藏生活的每一刻。這裡自動匯聚體重、健康、異變與日常護理，織成溫煦的家庭手札。
          </p>
        </div>
      </header>

      {/* Safety warning copy in warm calm layout */}
      <div style={{ background: '#fffcf4', border: '1px solid #f2e1c1', borderRadius: '14px', padding: '14px', fontSize: '12px', color: '#8c6020', marginBottom: '20px', lineHeight: '1.5', boxShadow: '0 2px 8px rgba(139,96,32,0.02)' }}>
        💡 <b>陪伴溫馨提示：</b>視覺比對與生命故事軌跡僅協助日常細心觀察變化，不提供疾病與醫療診斷；如有任何急性或不適異狀，請務必立即尋求獸醫診所診療。
      </div>

      {/* Reusable "On This Day" Spotlight Area */}
      {onThisDayEvents.length > 0 && (
        <section style={{
          background: 'linear-gradient(135deg, #fdf4f0 0%, #fefbf7 100%)',
          border: '1.5px solid #f6e3da',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 6px 18px rgba(111,78,55,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '22px' }}>✨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#8c4f2b', fontWeight: 'bold' }}>
                當年的今天 (On This Day)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9d7660' }}>
                重溫過去與 {pet?.name} 的這一天，那些值得細細回味的溫暖時光：
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {onThisDayEvents.map((event) => {
              const eventDate = new Date(event.timestamp)
              const yearsAgo = new Date().getFullYear() - eventDate.getFullYear()
              const previewId = event.attachmentIds?.[0]
              const previewUrl = previewId ? mediaBlobUrls[previewId] : undefined

              return (
                <div
                  key={`on-this-day-${event.id}`}
                  onClick={() => handleEventClick(event)}
                  style={{
                    background: '#fff',
                    borderRadius: '14px',
                    padding: '14px',
                    border: '1px solid #f9ebe4',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#8c4f2b', fontWeight: 'bold' }}>
                      ⏳ {yearsAgo} 年前的今天 ({eventDate.getFullYear()} 年)
                    </span>
                    <h4 style={{ margin: '4px 0', fontSize: '14px', color: '#173f3b', fontWeight: 'bold' }}>
                      {event.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#5e746f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cleanStoryText(event.subtitle || event.description)}
                    </p>
                  </div>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <button className="timeline-export" onClick={onExportVetReport} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#173f3b', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(23,63,59,0.1)' }}>
        產生健康數據摘要 PDF 報告 <span style={{ fontSize: '12px', opacity: 0.8 }}>不含大容量多媒體檔</span>
      </button>

      {/* Embedded Weight tracker form */}
      <div style={{ marginBottom: '24px' }}>
        <GrowthTracker pet={pet} records={growthRecords} onSave={onSaveGrowth} onDelete={onDeleteGrowth} />
      </div>

      {/* Timeline Dynamic category filters */}
      <div className="timeline-filters" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', whiteSpace: 'nowrap' }} aria-label="篩選生命軌跡">
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

      {/* Family Photo Journal / Apple Photos styled card list */}
      {Object.keys(monthGroups).length > 0 ? (
        Object.entries(monthGroups).map(([month, items]) => (
          <section className="timeline-month" key={month} style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '15px', color: '#8c6020', margin: '0 0 16px 0', borderBottom: '1.5px solid #eedfc8', paddingBottom: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              {month}
            </h2>
            <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {items.map((event) => {
                const date = new Date(event.timestamp)
                const formattedTime = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
                const dayLabel = date.getDate()
                const weekdayLabel = date.toLocaleDateString('zh-TW', { weekday: 'short' })

                // Generate emotion message from message service
                const emotionMessage = timelineMessageService.getMessage(event.emotionType, pet?.name || '毛孩')

                // Card background with warm album layout
                const cardBg = CATEGORY_COLORS[event.category] || '#fff'

                // Resolve preview attachment if available
                const thumbAttachId = event.attachmentIds?.[0]
                const thumbUrl = thumbAttachId ? mediaBlobUrls[thumbAttachId] : undefined

                const isFavorite = isFavoriteMemory(event)
                const hasNavigation = event.sourceType === 'comparison' || event.sourceType === 'health' || event.sourceType === 'senior-care' || event.sourceType === 'memory'

                return (
                  <article
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="timeline-card story-mode-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column', // Album priority: vertical stacked presentation
                      background: cardBg,
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: isFavorite ? '2px solid #eedfc8' : '1px solid #eedfc8',
                      boxShadow: isFavorite ? '0 8px 24px rgba(211,166,101,0.08)' : '0 4px 14px rgba(111,78,55,0.015)',
                      cursor: hasNavigation ? 'pointer' : 'default',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {/* Primary Visual Element Priority: LARGE PHOTO / VIDEO PREVIEW FIRST */}
                    {thumbUrl && (
                      <div style={{
                        width: '100%',
                        height: '240px',
                        overflow: 'hidden',
                        background: '#f2eae1',
                        position: 'relative',
                      }}>
                        <img
                          src={thumbUrl}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {/* Play Indicator if it's a video event */}
                        {event.category === 'FavoriteVideo' && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(23,63,59,0.7)',
                            color: '#fff',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}>
                            ▶
                          </div>
                        )}
                        {/* Star Indicator Overlay */}
                        {isFavorite && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: '#fff',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          }}>
                            ⭐
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Content Details Padding */}
                    <div style={{ padding: '20px' }}>
                      {/* Date & Category header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold' }}>
                          📅 {date.getFullYear()}年{date.getMonth()+1}月{dayLabel}日 ({weekdayLabel}) {formattedTime}
                        </span>
                        {/* Render icon badge and favorite memory highlight indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', background: '#f4ede1', color: '#8c6020', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                          {isFavorite && !thumbUrl && (
                            <span style={{ fontSize: '14px' }} title="珍貴回憶">⭐</span>
                          )}
                        </div>
                      </div>

                      {/* Event Title */}
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#173f3b', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {event.title}
                      </h3>

                      {/* Owner Story / Description: Displays NATURALLY as Cozy Narrative Paragraphs */}
                      {(event.subtitle || event.description) && (
                        <div style={{
                          margin: '0 0 12px 0',
                          fontSize: '14px',
                          color: '#4a5d59',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-line',
                        }}>
                          {cleanStoryText(event.subtitle ? `${event.subtitle}\n${event.description}` : event.description)}
                        </div>
                      )}

                      {/* Emotion Layer accent box */}
                      {emotionMessage && (
                        <div style={{
                          background: '#fdfaf5',
                          borderLeft: '3px solid #d3a665',
                          borderRadius: '0 8px 8px 0',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: '#8c6020',
                          lineHeight: '1.5',
                          fontStyle: 'italic',
                          marginTop: '8px',
                        }}>
                          💞 {emotionMessage}
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
        <div className="timeline-empty" style={{ background: '#fff', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', border: '1px solid #eedfc8', boxShadow: '0 4px 14px rgba(111,78,55,0.01)' }}>
          <i style={{ fontSize: '36px', color: '#d3a665', display: 'block', marginBottom: '12px' }}>♡</i>
          <b style={{ fontSize: '16px', color: '#173f3b', fontWeight: 'bold' }}>今天又是平靜美好的一天</b>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#5e746f', lineHeight: '1.5' }}>
            設定一個服藥提醒、記下一段成長體重，或是拍一張生活日記相片，陪伴的點滴就會自動呈現在這裡，匯聚成溫馨的生命手札。
          </p>
        </div>
      )}
    </section>
  )
}

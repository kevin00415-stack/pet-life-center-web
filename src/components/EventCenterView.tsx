import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Camera,
  VideoCamera,
  Trash,
  Image,
} from '@phosphor-icons/react'
import type { Pet } from '../domain'
import { sharedMediaService } from '../services/SharedMediaService'
import {
  loadAllMedia,
  saveMediaItem,
  deleteMediaItem,
  type MediaStorageItem,
} from '../device-store'
import { interpolate, useTranslation } from '../i18n/translations'
import { formatDate, formatTime } from '../i18n/formatters'

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
  mediaIds?: string[]
}

interface PendingMedia {
  id: string
  file: File
  type: 'photo' | 'video'
  previewUrl: string
}

export default function EventCenterView({ pet, onBack }: EventCenterViewProps) {
  const { t, locale } = useTranslation()
  const categories = [
    { key: 'seizure', label: t('abnormalSeizure'), icon: '🧠' }, { key: 'vomiting', label: t('abnormalVomiting'), icon: '🤮' }, { key: 'diarrhea', label: t('abnormalDiarrhea'), icon: '🚽' }, { key: 'injury', label: t('abnormalInjury'), icon: '🩹' }, { key: 'walking', label: t('abnormalWalking'), icon: '🐕' }, { key: 'breathing', label: t('abnormalBreathing'), icon: '🫁' }, { key: 'appetite', label: t('abnormalAppetite'), icon: '🥣' }, { key: 'other', label: t('abnormalOther'), icon: '⚠️' },
  ] as const
  const [category, setCategory] = useState<AbnormalEvent['category']>('other')
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState<AbnormalEvent[]>([])
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([])
  const [validationError, setValidationError] = useState('')
  const [savedMedia, setSavedMedia] = useState<Record<string, { blob: Blob; url: string }>>({})

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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

  // Load saved media items from IndexedDB
  useEffect(() => {
    let activeUrls: string[] = []
    const loadMediaData = async () => {
      try {
        const allMedia = await loadAllMedia()
        const petMedia = allMedia.filter((item) => item.metadata.petId === pet?.id)

        const mediaMap: Record<string, { blob: Blob; url: string }> = {}
        petMedia.forEach((item) => {
          const url = URL.createObjectURL(item.blob)
          activeUrls.push(url)
          mediaMap[item.id] = {
            blob: item.blob,
            url,
          }
        })
        setSavedMedia(mediaMap)
      } catch (err) {
        console.error('Error loading media database', err)
      }
    }

    if (pet?.id) {
      loadMediaData()
    }

    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [pet?.id, history])

  // Cleanup pending preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingMedia.forEach((item) => {
        sharedMediaService.revokePreviewUrl(item.previewUrl)
      })
    }
  }, [pendingMedia])

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'photo' | 'video') => {
    setValidationError('')
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = sharedMediaService.validateMedia(file)
    if (!validation.valid) {
      setValidationError(validation.error || t('eventValidationFailed'))
      return
    }

    const determinedType = preferredType || (file.type.startsWith('image/') ? 'photo' : 'video')
    const previewUrl = sharedMediaService.createPreviewUrl(file)

    const newPending: PendingMedia = {
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: determinedType,
      previewUrl,
    }

    setPendingMedia((prev) => [...prev, newPending])

    // Clear the input value so the same file can be selected again
    e.target.value = ''
  }

  const handleRemovePending = (id: string, url: string) => {
    sharedMediaService.revokePreviewUrl(url)
    setPendingMedia((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (!storageKey || !pet) return

    const finalMediaIds: string[] = []
    const hasPhoto = pendingMedia.some((m) => m.type === 'photo')
    const hasVideo = pendingMedia.some((m) => m.type === 'video')

    const newEventId = 'abnormal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)

    // Save each pending media item to IndexedDB
    for (const pending of pendingMedia) {
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      finalMediaIds.push(mediaId)

      const metadata = sharedMediaService.createMetadata({
        id: mediaId,
        petId: pet.id,
        type: pending.type,
        mimeType: pending.file.type,
        fileName: pending.file.name,
        fileSize: pending.file.size,
        source: 'file', // Can be 'camera' or 'gallery' in full native integration
        context: 'abnormal-event',
        entityType: 'abnormal-event',
        entityId: newEventId,
      })

      const storageItem: MediaStorageItem = {
        id: mediaId,
        metadata,
        blob: pending.file,
      }

      try {
        await saveMediaItem(storageItem)
      } catch (err) {
        console.error('Failed to save media item to IndexedDB', err)
        setValidationError(t('eventSaveMediaFailed'))
        return
      }
    }

    const newEvent: AbnormalEvent = {
      id: newEventId,
      petId: pet.id,
      category,
      notes: notes.trim() || '未填寫詳細說明',
      hasPhoto,
      hasVideo,
      timestamp: Date.now(),
      mediaIds: finalMediaIds,
    }

    const updatedHistory = [newEvent, ...history]
    setHistory(updatedHistory)
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory))

    // Clear inputs and pending states
    setCategory('other')
    setNotes('')
    setPendingMedia([])
    setValidationError('')

    alert(t('eventSaved'))
  }

  const handleDeleteEvent = async (event: AbnormalEvent) => {
    if (!storageKey || !window.confirm(t('eventConfirmDelete'))) return

    // Cascade delete any linked media from IndexedDB
    if (event.mediaIds && event.mediaIds.length > 0) {
      for (const mediaId of event.mediaIds) {
        try {
          await deleteMediaItem(mediaId)
        } catch (err) {
          console.error(`Failed to delete media item ${mediaId}`, err)
        }
      }
    }

    const updatedHistory = history.filter((item) => item.id !== event.id)
    setHistory(updatedHistory)
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory))
  }

  return (
    <div className="event-center-container" style={{ padding: '16px', paddingBottom: '90px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left' }}>
      {/* Hidden native HTML5 file inputs for zero-overhead direct media capture */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleMediaFileChange(e, 'photo')}
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        ref={videoInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleMediaFileChange(e, 'video')}
      />
      <input
        type="file"
        accept="image/*,video/*"
        ref={galleryInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleMediaFileChange(e)}
      />

      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label={t('reminderBackDashboard')}>
          <ArrowLeft size={24} color="#173f3b" />
        </button>
        <div>
          <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('eventRecord')}</span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {interpolate(t('eventTitle'), { pet: pet?.name || t('genericPet') })}
          </h1>
        </div>
      </header>

      {/* Philosophy banner */}
      <div style={{ background: '#fdf2f0', border: '1.5px solid #f9dedb', borderRadius: '14px', padding: '16px', marginBottom: '20px', color: '#6d1d11', fontSize: '14px', lineHeight: '1.6' }}>
        📢 <b>{t('eventSafetyTitle')}</b>{t('eventSafetyBody')}
      </div>

      {/* Select Event Type Category Grid */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('eventChooseType')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {categories.map((item) => {
            const isSelected = category === item.key
            return (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                className={`${item.key}_btn`}
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

      {/* Media Capture Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('eventEvidence')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {/* Photo Box */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 8px',
              borderRadius: '12px',
              border: '1.5px dashed #dce7e4',
              background: '#fff',
              color: '#173f3b',
              cursor: 'pointer',
            }}
          >
            <Camera size={24} color="#e05a47" />
            <b style={{ fontSize: '12px' }}>{t('eventTakePhoto')}</b>
          </button>

          {/* Video Box */}
          <button
            onClick={() => videoInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 8px',
              borderRadius: '12px',
              border: '1.5px dashed #dce7e4',
              background: '#fff',
              color: '#173f3b',
              cursor: 'pointer',
            }}
          >
            <VideoCamera size={24} color="#e05a47" />
            <b style={{ fontSize: '12px' }}>{t('eventRecordVideo')}</b>
          </button>

          {/* Gallery Box */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 8px',
              borderRadius: '12px',
              border: '1.5px dashed #dce7e4',
              background: '#fff',
              color: '#173f3b',
              cursor: 'pointer',
            }}
          >
            <Image size={24} color="#e05a47" />
            <b style={{ fontSize: '12px' }}>{t('eventChooseGallery')}</b>
          </button>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <p style={{ margin: '10px 0 0 0', color: '#e05a47', fontSize: '13px', fontWeight: 'bold' }}>
            ⚠️ {validationError}
          </p>
        )}

        {/* Previews of captured unsaved files */}
        {pendingMedia.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <h3 style={{ fontSize: '13px', color: '#5e746f', marginBottom: '8px' }}>{t('eventPendingPreview')}</h3>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {pendingMedia.map((media) => (
                <div key={media.id} style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #dce7e4' }}>
                  {media.type === 'photo' ? (
                    <img src={media.previewUrl} alt="Pending Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <video src={media.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                  )}
                  <button
                    onClick={() => handleRemovePending(media.id, media.previewUrl)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '2px 0' }}>
                    {media.type === 'photo' ? t('settingsPhotos') : t('memoryVideoAria')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Quick Notes Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('eventQuickNotes')}
        </h2>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('eventNotesPlaceholder')}
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
        {t('eventSaveAndSync')}
      </button>

      {/* History timeline within Event Center */}
      <section>
        <h2 style={{ fontSize: '17px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #e05a47', paddingLeft: '8px', fontWeight: 'bold' }}>
          {t('eventHistory')}
        </h2>

        {history.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f' }}>
            {t('eventHistoryEmpty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((ev) => {
              const matchedCat = categories.find((c) => c.key === ev.category)
              const dateStr = `${formatDate(ev.timestamp, locale, { month: 'numeric', day: 'numeric' })} ${formatTime(ev.timestamp, locale, { hour: '2-digit', minute: '2-digit', hour12: false })}`

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
                    <button
                      onClick={() => handleDeleteEvent(ev)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#e05a47', fontSize: '13px' }}
                    >
                      <Trash size={16} /> {t('eventDeleteRecord')}
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '14px', color: '#263b37', lineHeight: '1.5', background: '#fdfaf5', padding: '10px', borderRadius: '10px', borderLeft: '3px solid #e05a47' }}>
                    {ev.notes === '未填寫詳細說明' ? t('eventGeneratedNoDetails') : ev.notes}
                  </p>

                  {/* Real Saved media player/viewer inside History items */}
                  {ev.mediaIds && ev.mediaIds.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {ev.mediaIds.map((mediaId) => {
                        const media = savedMedia[mediaId]
                        if (!media) return null
                        const isPhoto = media.blob.type.startsWith('image/')
                        return (
                          <div key={mediaId} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dce7e4', flexShrink: 0 }}>
                            {isPhoto ? (
                              <img src={media.url} alt="Evidence photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(media.url, '_blank')} />
                            ) : (
                              <video src={media.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '3px 0' }}>
                              {isPhoto ? `📷 ${t('eventScenePhoto')}` : `🎥 ${t('eventSceneVideo')}`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#5e746f' }}>
                    🕒 {t('eventRecordedAt')}: {dateStr}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Camera,
  VideoCamera,
  Trash,
  Plus,
  Image,
  FloppyDisk,
  Warning,
  Rows,
  Sliders,
  Play,
  Pause,
} from '@phosphor-icons/react'
import type { Pet } from '../domain'
import { sharedMediaService } from '../services/SharedMediaService'
import {
  loadAllMedia,
  saveMediaItem,
  deleteMediaItem,
  type MediaStorageItem,
} from '../device-store'
import {
  getVisualComparisons,
  saveVisualComparison,
  deleteVisualComparison,
  VISUAL_COMPARISON_CATEGORIES,
  type VisualComparisonRecord,
} from '../services/VisualComparisonService'

interface VisualComparisonViewProps {
  pet?: Pet
  onBack: () => void
}

export default function VisualComparisonView({ pet, onBack }: VisualComparisonViewProps) {
  const [mediaList, setMediaList] = useState<MediaStorageItem[]>([])
  const [savedMedia, setSavedMedia] = useState<Record<string, { blob: Blob; url: string }>>({})
  const [comparisons, setComparisons] = useState<VisualComparisonRecord[]>(() => pet ? getVisualComparisons(pet.id) : [])

  // Selection state
  const [leftMediaId, setLeftMediaId] = useState<string>('')
  const [rightMediaId, setRightMediaId] = useState<string>('')

  // Form states
  const [category, setCategory] = useState<string>('other')
  const [note, setNote] = useState<string>('')

  // Display modes
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side')
  const [sliderValue, setSliderValue] = useState<number>(50)
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)

  // Upload/Verification States
  const [validationError, setValidationError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // Video playback sync state
  const leftVideoRef = useRef<HTMLVideoElement>(null)
  const rightVideoRef = useRef<HTMLVideoElement>(null)
  const [videosPlaying, setVideosPlaying] = useState<boolean>(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // 1. Load comparisons and IndexedDB media on mount or when pet changes
  const loadAllData = async () => {
    if (!pet) return
    try {
      // Load comparisons
      const list = getVisualComparisons(pet.id)
      setComparisons(list)

      // Load all media from IndexedDB
      const allMedia = await loadAllMedia()
      const petMedia = allMedia.filter((item) => item.metadata.petId === pet.id)
      // Sort petMedia by creation time descending (newest first)
      petMedia.sort((a, b) => b.metadata.createdAt - a.metadata.createdAt)
      setMediaList(petMedia)

      // Generate object URLs for previews
      const mediaMap: Record<string, { blob: Blob; url: string }> = {}
      petMedia.forEach((item) => {
        const url = URL.createObjectURL(item.blob)
        mediaMap[item.id] = {
          blob: item.blob,
          url,
        }
      })
      setSavedMedia((prev) => {
        // Clean up previous URLs to prevent leaks
        Object.values(prev).forEach((v) => URL.revokeObjectURL(v.url))
        return mediaMap
      })
    } catch (err) {
      console.error('Failed to load media or comparisons', err)
    }
  }

  useEffect(() => {
    loadAllData()
    return () => {
      // Cleanup preview URLs on unmount
      setSavedMedia((prev) => {
        Object.values(prev).forEach((v) => URL.revokeObjectURL(v.url))
        return {}
      })
    }
  }, [pet?.id])

  // Handle uploading new media item directly in this view
  const handleAddMedia = async (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'photo' | 'video') => {
    setValidationError('')
    if (!pet) {
      setValidationError('請先選擇或建立毛孩檔案。')
      return
    }

    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = sharedMediaService.validateMedia(file)
    if (!validation.valid) {
      setValidationError(validation.error || '不支援的檔案。')
      return
    }

    setIsUploading(true)
    const determinedType = preferredType || (file.type.startsWith('image/') ? 'photo' : 'video')
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const metadata = sharedMediaService.createMetadata({
      id: mediaId,
      petId: pet.id,
      type: determinedType as 'photo' | 'video',
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
      source: 'file',
      context: 'visual-comparison',
      entityType: 'visual-comparison',
      entityId: 'none',
    })

    const storageItem: MediaStorageItem = {
      id: mediaId,
      metadata,
      blob: file,
    }

    try {
      await saveMediaItem(storageItem)
      await loadAllData()
      // Auto select the newly added item to right slot if empty, else left slot
      if (!rightMediaId) {
        setRightMediaId(mediaId)
      } else if (!leftMediaId) {
        setLeftMediaId(mediaId)
      }
    } catch (err) {
      console.error('Failed to save comparison source media', err)
      setValidationError('儲存媒體檔案至本機資料庫時發生錯誤。')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  // Handle delete a source attachment from DB
  const handleDeleteSourceMedia = async (mediaId: string) => {
    if (!window.confirm('確定要從裝置中刪除此張/段比對素材嗎？這也將會使使用了此素材的舊比對紀錄無法預覽。')) return
    try {
      await deleteMediaItem(mediaId)
      if (leftMediaId === mediaId) setLeftMediaId('')
      if (rightMediaId === mediaId) setRightMediaId('')
      await loadAllData()
    } catch (err) {
      console.error('Failed to delete media item', err)
    }
  }

  // Verification helper for media pairing
  const leftItem = leftMediaId ? mediaList.find((m) => m.id === leftMediaId) : null
  const rightItem = rightMediaId ? mediaList.find((m) => m.id === rightMediaId) : null

  const isTypeMismatch = leftItem && rightItem && leftItem.metadata.type !== rightItem.metadata.type
  const isDuplicatePair = leftMediaId && rightMediaId && leftMediaId === rightMediaId

  // Determine standard type of paired comparison
  const pairedType = leftItem?.metadata.type || rightItem?.metadata.type

  // Save visual comparison record
  const handleSaveComparison = () => {
    if (!pet) return
    if (!leftMediaId || !rightMediaId) {
      setValidationError('請務必選擇兩個不同的素材進行比對。')
      return
    }
    if (isTypeMismatch) {
      setValidationError('無法混合照片與影片進行比對。請更換為相同類型的素材。')
      return
    }
    if (isDuplicatePair) {
      setValidationError('請選擇兩個不同的素材進行比對。')
      return
    }

    const newRecord: VisualComparisonRecord = {
      id: `comparison-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      petId: pet.id,
      createdAt: Date.now(),
      category,
      leftAttachmentId: leftMediaId,
      rightAttachmentId: rightMediaId,
      note: note.trim(),
      mediaType: pairedType as 'photo' | 'video',
    }

    saveVisualComparison(pet.id, newRecord)
    setComparisons(getVisualComparisons(pet.id))
    setNote('')
    setLeftMediaId('')
    setRightMediaId('')
    setValidationError('')
    alert('🎉 視覺比對紀錄已成功保存，並同步更新到健康時間軸！')
  }

  const handleDeleteComparison = (id: string) => {
    if (!pet || !window.confirm('確定要刪除這筆視覺比對紀錄嗎？素材檔案不會被刪除。')) return
    deleteVisualComparison(pet.id, id)
    setComparisons(getVisualComparisons(pet.id))
  }

  // Sync control for double video players
  const handleTogglePlayVideos = () => {
    const lVid = leftVideoRef.current
    const rVid = rightVideoRef.current
    if (!lVid || !rVid) return

    if (videosPlaying) {
      lVid.pause()
      rVid.pause()
      setVideosPlaying(false)
    } else {
      // Synchronized seek to beginning if one is ended
      if (lVid.ended || lVid.currentTime === lVid.duration) lVid.currentTime = 0
      if (rVid.ended || rVid.currentTime === rVid.duration) rVid.currentTime = 0

      lVid.play().catch(() => {})
      rVid.play().catch(() => {})
      setVideosPlaying(true)
    }
  }

  if (!pet) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#fbf8f3', minHeight: '100vh', color: '#173f3b' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="返回今日看板">
            <ArrowLeft size={24} color="#173f3b" />
          </button>
          <h1 style={{ margin: 0, fontSize: '20px' }}>視覺比對</h1>
        </header>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px 16px', border: '1px solid #f2e9dc' }}>
          <h3>⚠️ 未選擇毛孩</h3>
          <p>請先回到今日看板建立或點選一隻毛孩檔案，才能為其記錄視覺比對。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="visual-comparison-container" style={{ padding: '16px', paddingBottom: '90px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left', color: '#173f3b' }}>
      {/* Hidden Capturing Inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleAddMedia(e, 'photo')}
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        ref={videoInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleAddMedia(e, 'video')}
      />
      <input
        type="file"
        accept="image/*,video/*"
        ref={galleryInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleAddMedia(e)}
      />

      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label="返回今日看板">
          <ArrowLeft size={24} color="#173f3b" />
        </button>
        <div>
          <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>VISUAL COMPARISON</span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet.name} 的視覺比對
          </h1>
        </div>
      </header>

      {/* Safety statement Banner */}
      <div style={{ background: '#edf4f2', border: '1.5px solid #dce7e4', borderRadius: '14px', padding: '14px', marginBottom: '20px', fontSize: '13.5px', lineHeight: '1.6', color: '#2b4d45' }}>
        ⚠️ <b>視覺安全提示：</b>
        視覺比對僅協助飼主觀察變化，不提供疾病診斷；如有持續或急性異常，請聯絡獸醫。
      </div>

      {/* Segment 1: Pairing Studio */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          建立新比對 (Choose Past & Present)
        </h2>

        {/* Selected Pair Preview Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Left item slot */}
          <div style={{ background: '#fff', borderRadius: '16px', border: leftMediaId ? '2px solid #d3a665' : '1.5px dashed #dce7e4', padding: '12px', textAlign: 'center', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8c6020', background: '#fdf8f0', padding: '3px 8px', borderRadius: '20px', alignSelf: 'center', marginBottom: '8px' }}>
              過去 (Past)
            </span>

            {leftItem && savedMedia[leftMediaId] ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {leftItem.metadata.type === 'photo' ? (
                  <img
                    src={savedMedia[leftMediaId].url}
                    alt="Left photo preview"
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer' }}
                    onClick={() => setFullscreenUrl(savedMedia[leftMediaId].url)}
                  />
                ) : (
                  <video
                    src={savedMedia[leftMediaId].url}
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px' }}
                    muted
                    playsInline
                  />
                )}
                <small style={{ fontSize: '11px', color: '#5e746f', marginTop: '6px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                  📅 {new Date(leftItem.metadata.createdAt).toLocaleDateString('zh-TW')}
                </small>
                <button
                  onClick={() => setLeftMediaId('')}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#a0b2ae' }}>
                <Plus size={24} />
                <span style={{ fontSize: '12px', marginTop: '6px' }}>選擇過去照片或影片</span>
              </div>
            )}
          </div>

          {/* Right item slot */}
          <div style={{ background: '#fff', borderRadius: '16px', border: rightMediaId ? '2px solid #d3a665' : '1.5px dashed #dce7e4', padding: '12px', textAlign: 'center', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#173f3b', background: '#eef5f3', padding: '3px 8px', borderRadius: '20px', alignSelf: 'center', marginBottom: '8px' }}>
              現在 (Present)
            </span>

            {rightItem && savedMedia[rightMediaId] ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {rightItem.metadata.type === 'photo' ? (
                  <img
                    src={savedMedia[rightMediaId].url}
                    alt="Right photo preview"
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer' }}
                    onClick={() => setFullscreenUrl(savedMedia[rightMediaId].url)}
                  />
                ) : (
                  <video
                    src={savedMedia[rightMediaId].url}
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '10px' }}
                    muted
                    playsInline
                  />
                )}
                <small style={{ fontSize: '11px', color: '#5e746f', marginTop: '6px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                  📅 {new Date(rightItem.metadata.createdAt).toLocaleDateString('zh-TW')}
                </small>
                <button
                  onClick={() => setRightMediaId('')}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#a0b2ae' }}>
                <Plus size={24} />
                <span style={{ fontSize: '12px', marginTop: '6px' }}>選擇現在照片或影片</span>
              </div>
            )}
          </div>
        </div>

        {/* Type Mismatch Warning */}
        {isTypeMismatch && (
          <div style={{ background: '#fff5f5', border: '1px solid #e05a47', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', color: '#e05a47', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Warning size={18} weight="fill" />
            <span><b>格式不符：</b> 暫不支援照片與影片混合比對，請選擇同類型的素材。</span>
          </div>
        )}

        {isDuplicatePair && (
          <div style={{ background: '#fff5f5', border: '1px solid #e05a47', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', color: '#e05a47', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Warning size={18} weight="fill" />
            <span><b>素材重複：</b> 過去與現在不可選擇同一張照片或同一段影片。</span>
          </div>
        )}

        {/* Live Interactive Comparison Box (Only shown when paired and valid) */}
        {leftItem && rightItem && !isTypeMismatch && !isDuplicatePair && (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', border: '1px solid #f2e9dc', marginBottom: '16px', boxShadow: '0 4px 16px rgba(111, 78, 55, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <b style={{ fontSize: '15px' }}>🔍 即時互動比對：</b>
              {pairedType === 'photo' && (
                <div style={{ display: 'flex', background: '#f5f5f5', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                  <button
                    onClick={() => setComparisonMode('side-by-side')}
                    style={{ padding: '6px 12px', border: 'none', background: comparisonMode === 'side-by-side' ? '#fff' : 'none', color: '#173f3b', fontSize: '12px', borderRadius: '6px', fontWeight: comparisonMode === 'side-by-side' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Rows size={14} /> 左右
                  </button>
                  <button
                    onClick={() => setComparisonMode('slider')}
                    style={{ padding: '6px 12px', border: 'none', background: comparisonMode === 'slider' ? '#fff' : 'none', color: '#173f3b', fontSize: '12px', borderRadius: '6px', fontWeight: comparisonMode === 'slider' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Sliders size={14} /> 重疊滑動
                  </button>
                </div>
              )}
            </div>

            {/* Photos Comparison Player Container */}
            {pairedType === 'photo' && (
              <div style={{ position: 'relative', width: '100%', height: '240px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                {comparisonMode === 'side-by-side' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '1px', background: '#333' }}>
                    <div style={{ position: 'relative', height: '100%' }}>
                      <img src={savedMedia[leftMediaId]?.url} alt="Past" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}>過去: {new Date(leftItem.metadata.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ position: 'relative', height: '100%' }}>
                      <img src={savedMedia[rightMediaId]?.url} alt="Present" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}>現在: {new Date(rightItem.metadata.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* Background image: Right (Present) */}
                    <img src={savedMedia[rightMediaId]?.url} alt="Present" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                    <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', zIndex: 1 }}>現在: {new Date(rightItem.metadata.createdAt).toLocaleDateString()}</span>

                    {/* Sliding overlay image: Left (Past) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: `${sliderValue}%`, height: '100%', overflow: 'hidden', borderRight: '2px solid #fff' }}>
                      <img
                        src={savedMedia[leftMediaId]?.url}
                        alt="Past"
                        style={{
                          // Calculate width as exactly 100% of parent container to overlay correctly
                          width: '100%',
                          height: '240px',
                          objectFit: 'contain',
                          maxWidth: 'none',
                        }}
                      />
                      <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>過去: {new Date(leftItem.metadata.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Interactive slider */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderValue}
                      onChange={(e) => setSliderValue(Number(e.target.value))}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        opacity: 0,
                        cursor: 'ew-resize',
                        zIndex: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Videos Comparison Player Container */}
            {pairedType === 'video' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#000', borderRadius: '12px', padding: '4px', overflow: 'hidden' }}>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={leftVideoRef}
                      src={savedMedia[leftMediaId]?.url}
                      style={{ width: '100%', height: '160px', objectFit: 'contain' }}
                      playsInline
                    />
                    <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px' }}>過去: {new Date(leftItem.metadata.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <video
                      ref={rightVideoRef}
                      src={savedMedia[rightMediaId]?.url}
                      style={{ width: '100%', height: '160px', objectFit: 'contain' }}
                      playsInline
                    />
                    <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px' }}>現在: {new Date(rightItem.metadata.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Video controls */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    onClick={handleTogglePlayVideos}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 20px',
                      borderRadius: '20px',
                      border: 'none',
                      background: '#173f3b',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {videosPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                    {videosPlaying ? '暫停播放' : '同步播放'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Form for Category & Notes */}
        {leftItem && rightItem && !isTypeMismatch && !isDuplicatePair && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', marginBottom: '16px' }}>
            {/* Category selection list */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                比對重點類別 (Select Category)
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {VISUAL_COMPARISON_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid #d3a665' : '1px solid #dce7e4',
                        background: isSelected ? '#fdf8f0' : '#fff',
                        color: isSelected ? '#8c6020' : '#5e746f',
                        fontSize: '13px',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes textarea */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                飼主親身觀察備忘 (Owner Note - Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => {
                  setValidationError('')
                  setNote(e.target.value)
                }}
                placeholder="例如：今天走路抖動比上次明顯，吃藥後有減緩..."
                style={{
                  width: '100%',
                  minHeight: '70px',
                  border: '1.5px solid #dce7e4',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: '#263b37',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {validationError && (
              <p style={{ color: '#e05a47', fontSize: '12px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                ⚠️ {validationError}
              </p>
            )}

            {/* Save Comparison button */}
            <button
              onClick={handleSaveComparison}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#d3a665',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 14px rgba(211, 166, 101, 0.2)',
              }}
            >
              <FloppyDisk size={18} /> 保存此視覺比對紀錄
            </button>
          </div>
        )}

        {/* Media Asset Pool Section */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', border: '1px solid #f2e9dc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
              素材媒體池 (Media Library)
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dce7e4', background: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="拍照"
              >
                <Camera size={14} color="#d3a665" /> 拍照
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dce7e4', background: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="錄影"
              >
                <VideoCamera size={14} color="#d3a665" /> 錄影
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dce7e4', background: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="選擇"
              >
                <Image size={14} color="#d3a665" /> 相簿
              </button>
            </div>
          </div>

          {isUploading && (
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#d3a665', fontWeight: 'bold' }}>
              ⏳ 素材處理中...
            </p>
          )}

          {mediaList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#a0b2ae', fontSize: '13px' }}>
              目前素材池尚無任何照片或影片。
              <br />
              <span style={{ fontSize: '12px', color: '#5e746f' }}>
                💡 請點選上方按鈕新增照片或錄影，作為對比素材！
              </span>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#5e746f' }}>
                💡 請分別點擊卡片左、右下角的<b>「設過去」</b>、<b>「設現在」</b>來配置比對素材：
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {mediaList.map((item) => {
                  const mediaUrl = savedMedia[item.id]?.url
                  const isPhoto = item.metadata.type === 'photo'

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#fcfcfc',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #eef3f1',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Media element */}
                      <div style={{ width: '100%', height: '70px', background: '#eef5f3', overflow: 'hidden', position: 'relative' }}>
                        {mediaUrl ? (
                          isPhoto ? (
                            <img src={mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                          )
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ⚠️
                          </div>
                        )}

                        {/* Delete asset button */}
                        <button
                          onClick={() => handleDeleteSourceMedia(item.id)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.85)', color: '#e05a47', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="刪除"
                        >
                          ×
                        </button>
                      </div>

                      {/* Display dates & slots buttons */}
                      <div style={{ padding: '6px 4px', background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '9px', color: '#5e746f', textAlign: 'center', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {new Date(item.metadata.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} ({isPhoto ? '照片' : '影片'})
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                          <button
                            onClick={() => {
                              setValidationError('')
                              setLeftMediaId(item.id)
                            }}
                            style={{
                              padding: '3px 0',
                              fontSize: '10px',
                              background: leftMediaId === item.id ? '#fdf8f0' : '#f5f5f5',
                              border: leftMediaId === item.id ? '1px solid #d3a665' : 'none',
                              color: leftMediaId === item.id ? '#8c6020' : '#173f3b',
                              fontWeight: leftMediaId === item.id ? 'bold' : 'normal',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            設過去
                          </button>
                          <button
                            onClick={() => {
                              setValidationError('')
                              setRightMediaId(item.id)
                            }}
                            style={{
                              padding: '3px 0',
                              fontSize: '10px',
                              background: rightMediaId === item.id ? '#eef5f3' : '#f5f5f5',
                              border: rightMediaId === item.id ? '1px solid #173f3b' : 'none',
                              color: rightMediaId === item.id ? '#173f3b' : '#173f3b',
                              fontWeight: rightMediaId === item.id ? 'bold' : 'normal',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            設現在
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Segment 2: Historical Comparisons History */}
      <section>
        <h2 style={{ fontSize: '16px', color: '#173f3b', marginBottom: '12px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          歷史比對紀錄 (Historical Comparisons)
        </h2>

        {comparisons.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f', fontSize: '13.5px' }}>
            尚無任何比對歷史紀錄。快去上方挑選素材，保存你的第一筆對比紀錄吧！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comparisons.map((comp) => {
              const leftMeta = mediaList.find((m) => m.id === comp.leftAttachmentId)?.metadata
              const rightMeta = mediaList.find((m) => m.id === comp.rightAttachmentId)?.metadata

              const isLeftMissing = !leftMeta || !savedMedia[comp.leftAttachmentId]
              const isRightMissing = !rightMeta || !savedMedia[comp.rightAttachmentId]

              const compCat = VISUAL_COMPARISON_CATEGORIES.find((c) => c.key === comp.category) || { label: '其他', icon: '⚠️' }

              return (
                <article
                  key={comp.id}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f2e9dc',
                    boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#173f3b' }}>
                      {compCat.icon} {compCat.label} 比對
                    </span>
                    <button
                      onClick={() => handleDeleteComparison(comp.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#e05a47', fontSize: '13px' }}
                    >
                      <Trash size={15} /> 刪除
                    </button>
                  </div>

                  {comp.note && (
                    <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: '#263b37', background: '#fdfaf5', padding: '10px', borderRadius: '10px', borderLeft: '3px solid #d3a665', lineHeight: '1.5' }}>
                      {comp.note}
                    </p>
                  )}

                  {/* Render paired thumbnails if exist */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Left thumbnail */}
                    <div style={{ border: '1px solid #dce7e4', borderRadius: '10px', overflow: 'hidden', background: '#f9f9f9', height: '100px', position: 'relative' }}>
                      {isLeftMissing ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#9e3224', background: '#fdf2f0', padding: '6px', textAlign: 'center' }}>
                          ⚠️ 素材已丟失
                        </div>
                      ) : (
                        <>
                          {leftMeta.type === 'photo' ? (
                            <img src={savedMedia[comp.leftAttachmentId].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <video src={savedMedia[comp.leftAttachmentId].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                          )}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '2px 0' }}>
                            過去: {new Date(leftMeta.createdAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right thumbnail */}
                    <div style={{ border: '1px solid #dce7e4', borderRadius: '10px', overflow: 'hidden', background: '#f9f9f9', height: '100px', position: 'relative' }}>
                      {isRightMissing ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#9e3224', background: '#fdf2f0', padding: '6px', textAlign: 'center' }}>
                          ⚠️ 素材已丟失
                        </div>
                      ) : (
                        <>
                          {rightMeta.type === 'photo' ? (
                            <img src={savedMedia[comp.rightAttachmentId].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <video src={savedMedia[comp.rightAttachmentId].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                          )}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '9px', textAlign: 'center', padding: '2px 0' }}>
                            現在: {new Date(rightMeta.createdAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '10.5px', color: '#5e746f', textAlign: 'right' }}>
                    📅 比對建立時間: {new Date(comp.createdAt).toLocaleString()}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Fullscreen Photo Lightbox Modal */}
      {fullscreenUrl && (
        <div
          onClick={() => setFullscreenUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          <img src={fullscreenUrl} alt="Fullscreen View" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Image, Trash } from '@phosphor-icons/react'
import type { Pet } from './domain'
import { prepareLocalPhoto } from './local-photo'
import { centerPhotoTransform, movePhotoPosition, nudgePhotoPosition, photoPanPercent } from './photo-position'

type Props = { pet?: Pet; onClose: () => void; onSave: (pet: Pet) => Promise<void>; onDelete?: (pet: Pet) => Promise<void> }
type CropTarget = 'avatar' | 'cover'
type DragState = {
  target: CropTarget
  pointerId: number
  clientX: number
  clientY: number
  startX: number
  startY: number
  width: number
  height: number
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

export default function PetEditor({ pet, onClose, onSave, onDelete }: Props) {
  const [source, setSource] = useState<Blob | undefined>(pet?.avatarPhoto)
  const [cover, setCover] = useState<Blob | undefined>(pet?.coverPhoto)
  const url = useBlobUrl(source)
  const coverUrl = useBlobUrl(cover)
  const [x, setX] = useState(pet?.avatarPosition?.x ?? 50)
  const [y, setY] = useState(pet?.avatarPosition?.y ?? 50)
  const [zoom, setZoom] = useState(pet?.avatarPosition?.zoom ?? 1)
  const [coverX, setCoverX] = useState(pet?.coverPosition?.x ?? 50)
  const [coverY, setCoverY] = useState(pet?.coverPosition?.y ?? 50)
  const [coverZoom, setCoverZoom] = useState(pet?.coverPosition?.zoom ?? 1)
  const [saving, setSaving] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState<CropTarget | null>(null)
  const avatarPreview = useRef<HTMLDivElement | null>(null)
  const coverPreview = useRef<HTMLDivElement | null>(null)
  const avatarPan = photoPanPercent({ x, y }, zoom)
  const coverPan = photoPanPercent({ x: coverX, y: coverY }, coverZoom)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => {
    const preventCropScroll = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
    }
    const elements = [avatarPreview.current, coverPreview.current].filter((element): element is HTMLDivElement => Boolean(element))
    elements.forEach((element) => element.addEventListener('touchmove', preventCropScroll, { passive: false }))
    return () => elements.forEach((element) => element.removeEventListener('touchmove', preventCropScroll))
  }, [url, coverUrl])

  async function chooseAvatar(file?: File) {
    if (!file) return
    setPreparing(true)
    setPhotoError('')
    try {
      setSource(await prepareLocalPhoto(file))
      setX(50)
      setY(50)
      setZoom(1)
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : '照片處理失敗，請改選較小的照片。')
    } finally {
      setPreparing(false)
    }
  }

  async function chooseCover(file?: File) {
    if (!file) return
    setPreparing(true)
    setPhotoError('')
    try {
      setCover(await prepareLocalPhoto(file))
      setCoverX(50)
      setCoverY(50)
      setCoverZoom(1)
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : '照片處理失敗，請改選較小的照片。')
    } finally {
      setPreparing(false)
    }
  }

  function startDrag(target: CropTarget, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const currentX = target === 'avatar' ? x : coverX
    const currentY = target === 'avatar' ? y : coverY
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      target,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: currentX,
      startY: currentY,
      width: bounds.width,
      height: bounds.height,
    }
    setDragging(target)
  }

  function continueDrag(target: CropTarget, event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.target !== target || current.pointerId !== event.pointerId) return
    const next = movePhotoPosition(
      { x: current.startX, y: current.startY },
      event.clientX - current.clientX,
      event.clientY - current.clientY,
      current.width,
      current.height,
    )
    if (target === 'avatar') {
      setX(next.x)
      setY(next.y)
    } else {
      setCoverX(next.x)
      setCoverY(next.y)
    }
    event.preventDefault()
    event.stopPropagation()
  }

  function finishDrag(target: CropTarget, event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.target !== target || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    setDragging(null)
  }

  function nudge(target: CropTarget, event: KeyboardEvent<HTMLDivElement>) {
    if (!event.key.startsWith('Arrow')) return
    const current = target === 'avatar' ? { x, y } : { x: coverX, y: coverY }
    const next = nudgePhotoPosition(current, event.key)
    if (target === 'avatar') {
      setX(next.x)
      setY(next.y)
    } else {
      setCoverX(next.x)
      setCoverY(next.y)
    }
    event.preventDefault()
  }

  function recenter(target: CropTarget) {
    const centered = centerPhotoTransform()
    drag.current = null
    setDragging(null)
    if (target === 'avatar') {
      setX(centered.x)
      setY(centered.y)
      setZoom(centered.zoom)
    } else {
      setCoverX(centered.x)
      setCoverY(centered.y)
      setCoverZoom(centered.zoom)
    }
  }

  async function submit(formData: FormData) {
    setSaving(true)
    const species = String(formData.get('species'))
    await onSave({
      id: pet?.id || crypto.randomUUID(),
      name: String(formData.get('name')),
      species,
      birthDate: String(formData.get('birthDate') || ''),
      avatar: pet?.avatar || (species === '貓咪' ? '🐱' : species === '兔兔' ? '🐰' : species === '鳥類' ? '🐦' : '🐶'),
      avatarPhoto: source,
      avatarMimeType: source?.type,
      avatarPosition: { x, y, zoom },
      coverPhoto: cover,
      coverMimeType: cover?.type,
      coverPosition: { x: coverX, y: coverY, zoom: coverZoom },
      microchipNumber: String(formData.get('microchipNumber') || ''),
      microchipStatus: String(formData.get('microchipStatus') || '未植入'),
      lastScanDate: String(formData.get('lastScanDate') || ''),
      emergencyContact: String(formData.get('emergencyContact') || ''),
      vetHospital: String(formData.get('vetHospital') || ''),
      medicalNotes: String(formData.get('medicalNotes') || ''),
    })
    setSaving(false)
  }

  return <div className="sheet-backdrop"><section className="editor-sheet pet-editor"><header><div><span>LOCAL PET PROFILE</span><h2>{pet ? '編輯毛孩檔案' : '建立我的毛孩'}</h2></div><button className="close" onClick={onClose}>×</button></header><form action={submit}>
    <div className="avatar-workspace">
      <div
        ref={avatarPreview}
        className={`avatar-preview ${url ? 'draggable-photo' : ''} ${dragging === 'avatar' ? 'dragging' : ''}`}
        tabIndex={url ? 0 : undefined}
        aria-label={url ? '頭像裁切預覽，按住照片拖曳位置，或使用方向鍵微調' : undefined}
        onPointerDown={(event) => url && startDrag('avatar', event)}
        onPointerMove={(event) => continueDrag('avatar', event)}
        onPointerUp={(event) => finishDrag('avatar', event)}
        onPointerCancel={(event) => finishDrag('avatar', event)}
        onKeyDown={(event) => nudge('avatar', event)}
      >
        {url ? <>
          <img
            draggable={false}
            src={url}
            alt="頭像裁切預覽"
            style={{
              objectPosition: `${x}% ${y}%`,
              transform: `translate3d(${avatarPan.x}%, ${avatarPan.y}%, 0) scale(${zoom})`,
              transformOrigin: '50% 50%',
            }}
          />
          <span className="drag-photo-hint" aria-hidden="true">按住拖曳</span>
        </> : <span>{pet?.avatar || '🐾'}</span>}
      </div>
      <div>
        <label className="photo-picker"><Image />{preparing ? '照片處理中…' : '選擇頭像照片'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={preparing} onChange={(event) => void chooseAvatar(event.target.files?.[0])} /></label>
        {source && <button type="button" className="remove-avatar" onClick={() => setSource(undefined)}>改用圖示</button>}
      </div>
    </div>
    {photoError && <p className="field-error photo-error">{photoError}</p>}
    {source && <fieldset className="crop-controls">
      <legend>調整頭像</legend>
      <p>照片已在手機本機縮小處理。按住照片上下左右拖曳，大小使用下方滑桿調整。</p>
      <div className="crop-toolbar"><button type="button" onClick={() => recenter('avatar')}>恢復置中與大小</button></div>
      <label>照片大小 <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
    </fieldset>}
    <fieldset className="cover-editor">
      <legend>首頁封面照片</legend>
      <p>選圖後會在手機本機自動縮小，再按住照片拖曳取景。</p>
      <div
        ref={coverPreview}
        className={`cover-preview ${coverUrl ? 'draggable-photo' : ''} ${dragging === 'cover' ? 'dragging' : ''}`}
        tabIndex={coverUrl ? 0 : undefined}
        aria-label={coverUrl ? '首頁封面裁切預覽，按住照片拖曳位置，或使用方向鍵微調' : undefined}
        onPointerDown={(event) => coverUrl && startDrag('cover', event)}
        onPointerMove={(event) => continueDrag('cover', event)}
        onPointerUp={(event) => finishDrag('cover', event)}
        onPointerCancel={(event) => finishDrag('cover', event)}
        onKeyDown={(event) => nudge('cover', event)}
      >
        {coverUrl ? <>
          <img
            draggable={false}
            src={coverUrl}
            alt="首頁封面預覽"
            style={{
              objectPosition: `${coverX}% ${coverY}%`,
              transform: `translate3d(${coverPan.x}%, ${coverPan.y}%, 0) scale(${coverZoom})`,
              transformOrigin: '50% 50%',
            }}
          />
          <span className="drag-photo-hint" aria-hidden="true">按住拖曳</span>
        </> : <span><Image size={34} />尚未選擇首頁照片</span>}
      </div>
      <div className="cover-actions">
        <label className="photo-picker"><Image />{preparing ? '照片處理中…' : '選擇首頁照片'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={preparing} onChange={(event) => void chooseCover(event.target.files?.[0])} /></label>
        {cover && <button type="button" className="remove-avatar" onClick={() => setCover(undefined)}>移除封面</button>}
      </div>
      {cover && <div className="cover-controls">
        <div className="crop-toolbar"><button type="button" onClick={() => recenter('cover')}>恢復置中與大小</button></div>
        <label>照片大小<input type="range" min="1" max="2" step=".05" value={coverZoom} onChange={(event) => setCoverZoom(Number(event.target.value))} /></label>
      </div>}
    </fieldset>
    {/* 🐶 Basic Information */}
    <div className="cozy-editor-card card-basic premium-editor-card">
      <h3>🐶 核心基本資料</h3>
      <div className="two-fields">
        <label className="required-field">名字 (必填)
          <input name="name" defaultValue={pet?.name} required placeholder="例如：哈吉" style={{ fontSize: '16px', padding: '10px 12px', borderLeft: '4px solid var(--honey)' }} />
        </label>
        <label>種類
          <select name="species" defaultValue={pet?.species || '狗狗'} style={{ fontSize: '16px', padding: '10px 12px' }}>
            <option>狗狗</option>
            <option>貓咪</option>
            <option>兔兔</option>
            <option>鳥類</option>
            <option>其他</option>
          </select>
        </label>
      </div>
      <label>生日（選填）
        <input type="date" name="birthDate" defaultValue={pet?.birthDate} style={{ fontSize: '16px', padding: '10px 12px' }} />
      </label>
    </div>

    {/* 💉 Medical Information */}
    <div className="cozy-editor-card card-medical">
      <h3>💉 醫療與晶片資訊</h3>
      <div className="two-fields">
        <label>晶片號碼（選填）
          <input name="microchipNumber" defaultValue={pet?.microchipNumber} placeholder="例如：900138291..." style={{ fontSize: '16px', padding: '10px 12px' }} />
        </label>
        <label>晶片登記狀態
          <select name="microchipStatus" defaultValue={pet?.microchipStatus || '未植入'} style={{ fontSize: '16px', padding: '10px 12px' }}>
            <option>已登記</option>
            <option>未登記</option>
            <option>未植入</option>
          </select>
        </label>
      </div>
      <label>最後掃描日期（選填）
        <input type="date" name="lastScanDate" defaultValue={pet?.lastScanDate} style={{ fontSize: '16px', padding: '10px 12px' }} />
      </label>
      <label>主治醫院 / 醫師（選填）
        <input name="vetHospital" defaultValue={pet?.vetHospital} placeholder="例如：安心動物醫院 林醫師" style={{ fontSize: '16px', padding: '10px 12px' }} />
      </label>
    </div>

    {/* 📞 Emergency */}
    <div className="cozy-editor-card card-emergency">
      <h3>📞 緊急聯絡</h3>
      <label>緊急聯絡人與電話（選填）
        <input name="emergencyContact" defaultValue={pet?.emergencyContact} placeholder="例如：媽媽 0912-345-678" style={{ fontSize: '16px', padding: '10px 12px' }} />
      </label>
    </div>

    {/* 📝 Notes */}
    <div className="cozy-editor-card card-notes">
      <h3>📝 備註與過敏史</h3>
      <label>醫療備註事項（選填）
        <textarea name="medicalNotes" defaultValue={pet?.medicalNotes} placeholder="例如：對盤尼西林過敏、不喜歡剪指甲" style={{ fontSize: '16px', padding: '10px 12px', minHeight: '90px', fontFamily: 'inherit', lineHeight: '1.5' }} />
      </label>
    </div>

    <div className="privacy-note" style={{ fontSize: '13px', color: '#888', margin: '14px 0', textAlign: 'center' }}>毛孩照片與資料只保存在這台裝置</div>

    <button className="save-reminder" disabled={saving} style={{ fontSize: '17px', padding: '14px', borderRadius: '12px', fontWeight: 'bold' }}>
      {saving ? '正在保存…' : '保存毛孩檔案'}
    </button>

    {pet && onDelete && (
      <button type="button" className="delete-pet" onClick={() => void onDelete(pet)} style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', fontSize: '14px' }}>
        <Trash /> 刪除這隻毛孩與相關紀錄
      </button>
    )}
  </form></section></div>
}

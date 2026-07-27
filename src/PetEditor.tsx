import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Image, Trash } from '@phosphor-icons/react'
import type { Pet } from './domain'
import { movePhotoPosition, nudgePhotoPosition } from './photo-position'

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
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState<CropTarget | null>(null)

  function chooseAvatar(file?: File) {
    setSource(file)
    if (!file) return
    setX(50)
    setY(50)
    setZoom(1)
  }

  function chooseCover(file?: File) {
    setCover(file)
    if (!file) return
    setCoverX(50)
    setCoverY(50)
    setCoverZoom(1)
  }

  function startDrag(target: CropTarget, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const currentX = target === 'avatar' ? x : coverX
    const currentY = target === 'avatar' ? y : coverY
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
  }

  function finishDrag(target: CropTarget, event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.target !== target || current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
    })
    setSaving(false)
  }

  return <div className="sheet-backdrop"><section className="editor-sheet pet-editor"><header><div><span>LOCAL PET PROFILE</span><h2>{pet ? '編輯毛孩檔案' : '建立我的毛孩'}</h2></div><button className="close" onClick={onClose}>×</button></header><form action={submit}>
    <div className="avatar-workspace">
      <div
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
          <img draggable={false} src={url} alt="頭像裁切預覽" style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }} />
          <span className="drag-photo-hint" aria-hidden="true">按住拖曳</span>
        </> : <span>{pet?.avatar || '🐾'}</span>}
      </div>
      <div>
        <label className="photo-picker"><Image />選擇頭像照片<input type="file" accept="image/*" onChange={(event) => chooseAvatar(event.target.files?.[0])} /></label>
        {source && <button type="button" className="remove-avatar" onClick={() => setSource(undefined)}>改用圖示</button>}
      </div>
    </div>
    {source && <fieldset className="crop-controls">
      <legend>調整頭像</legend>
      <p>按住照片上下左右拖曳，讓毛孩置中；大小使用下方滑桿調整。</p>
      <div className="crop-toolbar"><button type="button" onClick={() => { setX(50); setY(50) }}>重新置中</button></div>
      <label>照片大小 <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
    </fieldset>}
    <fieldset className="cover-editor">
      <legend>首頁封面照片</legend>
      <p>照片會裁切填滿首頁相框。選擇後按住照片拖曳取景，再用滑桿調整大小。</p>
      <div
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
          <img draggable={false} src={coverUrl} alt="首頁封面預覽" style={{ objectPosition: `${coverX}% ${coverY}%`, transform: `scale(${coverZoom})` }} />
          <span className="drag-photo-hint" aria-hidden="true">按住拖曳</span>
        </> : <span><Image size={34} />尚未選擇首頁照片</span>}
      </div>
      <div className="cover-actions">
        <label className="photo-picker"><Image />選擇首頁照片<input type="file" accept="image/*" onChange={(event) => chooseCover(event.target.files?.[0])} /></label>
        {cover && <button type="button" className="remove-avatar" onClick={() => setCover(undefined)}>移除封面</button>}
      </div>
      {cover && <div className="cover-controls">
        <div className="crop-toolbar"><button type="button" onClick={() => { setCoverX(50); setCoverY(50) }}>重新置中</button></div>
        <label>照片大小<input type="range" min="1" max="2" step=".05" value={coverZoom} onChange={(event) => setCoverZoom(Number(event.target.value))} /></label>
      </div>}
    </fieldset>
    <div className="two-fields"><label>名字<input name="name" defaultValue={pet?.name} required placeholder="毛孩名字" /></label><label>種類<select name="species" defaultValue={pet?.species || '狗狗'}><option>狗狗</option><option>貓咪</option><option>兔兔</option><option>鳥類</option><option>其他</option></select></label></div><label>生日（選填）<input type="date" name="birthDate" defaultValue={pet?.birthDate} /></label><div className="privacy-note">毛孩照片與資料只保存在這台裝置</div><button className="save-reminder" disabled={saving}>{saving ? '正在保存…' : '保存毛孩檔案'}</button>
    {pet && onDelete && <button type="button" className="delete-pet" onClick={() => void onDelete(pet)}><Trash />刪除這隻毛孩與相關紀錄</button>}
  </form></section></div>
}

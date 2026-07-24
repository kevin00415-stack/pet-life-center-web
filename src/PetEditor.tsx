import { useEffect, useState } from 'react'
import { Image, Trash } from '@phosphor-icons/react'
import type { Pet } from './domain'

type Props = { pet?: Pet; onClose: () => void; onSave: (pet: Pet) => Promise<void>; onDelete?: (pet: Pet) => Promise<void> }

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
    <div className="avatar-workspace"><div className="avatar-preview">{url ? <img src={url} alt="頭像裁切預覽" style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }} /> : <span>{pet?.avatar || '🐾'}</span>}</div><div><label className="photo-picker"><Image />選擇頭像照片<input type="file" accept="image/*" onChange={(event) => setSource(event.target.files?.[0])} /></label>{source && <button type="button" className="remove-avatar" onClick={() => setSource(undefined)}>改用圖示</button>}</div></div>
    {source && <fieldset className="crop-controls"><legend>調整頭像置中範圍</legend><label>左右位置 <input type="range" min="0" max="100" value={x} onChange={(event) => setX(Number(event.target.value))} /></label><label>上下位置 <input type="range" min="0" max="100" value={y} onChange={(event) => setY(Number(event.target.value))} /></label><label>照片縮放 <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label></fieldset>}
    <fieldset className="cover-editor"><legend>首頁封面照片</legend><p>這張照片會完整顯示在首頁上方，你可以替每隻毛孩設定不同封面。</p><div className="cover-preview">{coverUrl ? <img src={coverUrl} alt="首頁封面預覽" style={{ objectPosition: `${coverX}% ${coverY}%`, transform: `scale(${coverZoom})` }} /> : <span><Image size={34} />尚未選擇首頁照片</span>}</div><div className="cover-actions"><label className="photo-picker"><Image />選擇首頁照片<input type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0])} /></label>{cover && <button type="button" className="remove-avatar" onClick={() => setCover(undefined)}>移除封面</button>}</div>{cover && <div className="cover-controls"><label>左右位置<input type="range" min="0" max="100" value={coverX} onChange={(event) => setCoverX(Number(event.target.value))} /></label><label>上下位置<input type="range" min="0" max="100" value={coverY} onChange={(event) => setCoverY(Number(event.target.value))} /></label><label>照片縮放<input type="range" min="1" max="2" step=".05" value={coverZoom} onChange={(event) => setCoverZoom(Number(event.target.value))} /></label></div>}</fieldset>
    <div className="two-fields"><label>名字<input name="name" defaultValue={pet?.name} required placeholder="毛孩名字" /></label><label>種類<select name="species" defaultValue={pet?.species || '狗狗'}><option>狗狗</option><option>貓咪</option><option>兔兔</option><option>鳥類</option><option>其他</option></select></label></div><label>生日（選填）<input type="date" name="birthDate" defaultValue={pet?.birthDate} /></label><div className="privacy-note">毛孩照片與資料只保存在這台裝置</div><button className="save-reminder" disabled={saving}>{saving ? '正在保存…' : '保存毛孩檔案'}</button>
    {pet && onDelete && <button type="button" className="delete-pet" onClick={() => void onDelete(pet)}><Trash />刪除這隻毛孩與相關紀錄</button>}
  </form></section></div>
}

import { useEffect, useMemo, useState } from 'react'
import { Camera, FilmStrip, Plus, Trash } from '@phosphor-icons/react'
import type { MemoryEntry, MemoryMood, MemoryPhoto, MemoryVideo, Pet } from './domain'
import { localDateKey } from './domain'

type Props = { pet?: Pet; memories: MemoryEntry[]; onBack: () => void; onSave: (memory: MemoryEntry) => Promise<void>; onDelete: (memory: MemoryEntry) => Promise<void> }
const moods: Array<[MemoryMood, string, string]> = [['happy', '開心', '☀'], ['calm', '平靜', '☁'], ['funny', '好笑', '☺'], ['brave', '勇敢', '★'], ['miss', '想念', '♡']]
const MAX_VIDEO_BYTES = 150 * 1024 * 1024

function PhotoThumb({ photo }: { photo: MemoryPhoto }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const next = URL.createObjectURL(photo.blob); setUrl(next); return () => URL.revokeObjectURL(next) }, [photo])
  return url ? <img src={url} alt={photo.name || '毛孩回憶照片'} /> : null
}

function VideoPlayer({ video, compact = false }: { video: MemoryVideo; compact?: boolean }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const next = URL.createObjectURL(video.blob); setUrl(next); return () => URL.revokeObjectURL(next) }, [video])
  return url ? <video className={compact ? 'compact' : ''} src={url} controls preload="metadata" playsInline aria-label={video.name || '毛孩回憶影片'} /> : null
}

async function optimizePhoto(file: File): Promise<MemoryPhoto> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value || file), 'image/jpeg', .82))
    bitmap.close()
    return { id: crypto.randomUUID(), blob, mimeType: blob.type, name: file.name }
  } catch { return { id: crypto.randomUUID(), blob: file, mimeType: file.type, name: file.name } }
}

export default function MemoriesPage({ pet, memories, onBack, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [mood, setMood] = useState<MemoryMood>('happy')
  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [videos, setVideos] = useState<MemoryVideo[]>([])
  const [mediaError, setMediaError] = useState('')
  const [saving, setSaving] = useState(false)
  const entries = useMemo(() => memories.filter((memory) => memory.petId === pet?.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [memories, pet?.id])

  async function submit(formData: FormData) {
    if (!pet) return
    setSaving(true)
    await onSave({ id: crypto.randomUUID(), petId: pet.id, date: String(formData.get('date')), title: String(formData.get('title')), note: String(formData.get('note') || ''), mood, photos, videos, createdAt: Date.now() })
    setPhotos([]); setVideos([]); setMood('happy'); setMediaError(''); setEditing(false); setSaving(false)
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return
    const available = Math.max(0, 5 - photos.length)
    const added = await Promise.all(Array.from(files).slice(0, available).map(optimizePhoto))
    setPhotos((current) => [...current, ...added])
  }
  function addVideos(files: FileList | null) {
    if (!files) return
    setMediaError('')
    const available = Math.max(0, 2 - videos.length)
    const selected = Array.from(files).slice(0, available)
    const oversized = selected.find((file) => file.size > MAX_VIDEO_BYTES)
    if (oversized) return setMediaError(`「${oversized.name}」超過150 MB，請選較短的影片。`)
    const added = selected.map<MemoryVideo>((file) => ({ id: crypto.randomUUID(), blob: file, mimeType: file.type, name: file.name, size: file.size }))
    setVideos((current) => [...current, ...added])
  }

  return <section className="memories-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">OFFLINE PET MEMORIES</span><h1>{pet?.name || '毛孩'}的生活回憶</h1><p>照片、影片與故事都保存在手機，陪你記住一起生活的每一天。</p></div></header>
    <button className="new-memory" onClick={() => setEditing(true)}><Plus weight="bold" />記錄今天的回憶</button>
    {entries.length ? <div className="memory-list">{entries.map((memory) => <article key={memory.id}>
      {(memory.videos?.length || 0) > 0 && <div className="memory-videos"><VideoPlayer video={memory.videos![0]} compact />{memory.videos!.length > 1 && <span>另有 {memory.videos!.length - 1} 段影片</span>}</div>}
      {memory.photos.length > 0 && <div className={`memory-photos count-${Math.min(3, memory.photos.length)}`}>{memory.photos.slice(0, 3).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}{memory.photos.length > 3 && <em>＋{memory.photos.length - 3}</em>}</div>}
      <div className="memory-copy"><div><time>{new Date(`${memory.date}T12:00:00`).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</time><span>{moods.find(([value]) => value === memory.mood)?.[2]} {moods.find(([value]) => value === memory.mood)?.[1]}</span></div><h2>{memory.title}</h2>{memory.note && <p>{memory.note}</p>}<button onClick={() => void onDelete(memory)}><Trash />刪除</button></div>
    </article>)}</div> : <div className="timeline-empty"><FilmStrip size={30} /><b>第一篇回憶，等你寫下來</b><p>散步、第一次到家、生日或只是今天可愛的模樣，都值得保存。</p></div>}
    {editing && <div className="sheet-backdrop"><section className="editor-sheet memory-editor"><header><div><span>NEW LOCAL MEMORY</span><h2>新增生活回憶</h2></div><button className="close" onClick={() => setEditing(false)}>×</button></header><form action={submit}>
      <div className="two-fields"><label>日期<input type="date" name="date" defaultValue={localDateKey()} required /></label><label>標題<input name="title" required placeholder="例如：第一次去海邊" /></label></div>
      <fieldset><legend>今天的心情</legend><div className="mood-picker">{moods.map(([value, label, icon]) => <button type="button" key={value} className={mood === value ? 'active' : ''} onClick={() => setMood(value)}><i>{icon}</i><span>{label}</span></button>)}</div></fieldset>
      <label>寫下這一天<textarea name="note" placeholder="今天發生了什麼？最想記住的是什麼？" /></label>
      <fieldset><legend>照片（最多5張）</legend><label className="photo-picker"><Camera />從手機選擇照片<input type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.target.files)} /></label>{photos.length > 0 && <div className="photo-previews">{photos.map((photo) => <div key={photo.id}><PhotoThumb photo={photo} /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}>×</button></div>)}</div>}</fieldset>
      <fieldset><legend>影片（最多2段）</legend><label className="photo-picker"><FilmStrip />從手機選擇影片<input type="file" accept="video/*" multiple onChange={(event) => addVideos(event.target.files)} /></label>{videos.length > 0 && <div className="video-previews">{videos.map((video) => <div key={video.id}><VideoPlayer video={video} /><button type="button" onClick={() => setVideos((current) => current.filter((item) => item.id !== video.id))}>移除</button><small>{video.name}・{Math.ceil(video.size / 1024 / 1024)} MB</small></div>)}</div>}{mediaError && <p className="field-error">{mediaError}</p>}<p className="local-photo-note">影片不會上傳；每段上限150 MB。影片會增加手機與備份檔容量，建議保留短片精華。</p></fieldset>
      <button className="save-reminder" disabled={saving}>{saving ? '正在保存…' : '保存這篇回憶'}</button>
    </form></section></div>}
  </section>
}

import { useEffect, useMemo, useState } from 'react'
import { Camera, FilmStrip, Plus, Trash, Sparkle, Heart } from '@phosphor-icons/react'
import type { MemoryEntry, MemoryMood, MemoryPhoto, MemoryVideo, Pet } from './domain'
import { localDateKey } from './domain'

type Props = { pet?: Pet; memories: MemoryEntry[]; onBack: () => void; onSave: (memory: MemoryEntry) => Promise<void>; onDelete: (memory: MemoryEntry) => Promise<void> }
const moods: Array<[MemoryMood, string, string]> = [['happy', '開心', '☀'], ['calm', '平靜', '☁'], ['funny', '好笑', '☺'], ['brave', '勇敢', '★'], ['miss', '想念', '♡']]
const MAX_VIDEO_BYTES = 150 * 1024 * 1024

interface JournalStats {
  appetite?: string
  water?: string
  exercise?: string
  sleep?: string
  urination?: string
  defecation?: string
  vomiting?: string
  medication?: string
  body?: string
}

function parseJournalStats(note: string): { stats: JournalStats | null; cleanNote: string } {
  if (!note) return { stats: null, cleanNote: '' }
  const marker = '--- DAILY JOURNAL STATS ---'
  const index = note.indexOf(marker)
  if (index === -1) return { stats: null, cleanNote: note }

  const endMarker = '-------------------------'
  const endIndex = note.indexOf(endMarker, index + marker.length)
  if (endIndex === -1) return { stats: null, cleanNote: note }

  const statsString = note.slice(index + marker.length, endIndex).trim()
  const cleanNote = note.slice(endIndex + endMarker.length).trim()

  const stats: JournalStats = {}
  statsString.split('|').forEach(part => {
    const [key, value] = part.split(':').map(s => s.trim())
    if (key && value) {
      if (key === 'Appetite') stats.appetite = value
      if (key === 'Water') stats.water = value
      if (key === 'Exercise') stats.exercise = value
      if (key === 'Sleep') stats.sleep = value
      if (key === 'Urination') stats.urination = value
      if (key === 'Defecation') stats.defecation = value
      if (key === 'Vomiting') stats.vomiting = value
      if (key === 'Medication') stats.medication = value
      if (key === 'Body') stats.body = value
    }
  })

  return { stats, cleanNote }
}

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

  // Custom Visual Journal States
  const [mood, setMood] = useState<MemoryMood>('happy')
  const [appetite, setAppetite] = useState('😋 正常')
  const [water, setWater] = useState('💧 正常')
  const [exercise, setExercise] = useState('🐕 活力充沛')
  const [sleep, setSleep] = useState('😴 熟睡')
  const [urination, setUrination] = useState('🚽 尿量正常')
  const [defecation, setDefecation] = useState('💩 便便正常')
  const [vomiting, setVomiting] = useState('🟢 無嘔吐')
  const [medication, setMedication] = useState('💊 已服藥')
  const [body, setBody] = useState('✨ 精神極佳')

  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [videos, setVideos] = useState<MemoryVideo[]>([])
  const [mediaError, setMediaError] = useState('')
  const [saving, setSaving] = useState(false)
  const entries = useMemo(() => memories.filter((memory) => memory.petId === pet?.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [memories, pet?.id])

  async function submit(formData: FormData) {
    if (!pet) return
    setSaving(true)

    // Construct the structured serialized stats string inside note
    const statsBlock = `--- DAILY JOURNAL STATS ---
Appetite: ${appetite} | Water: ${water} | Exercise: ${exercise} | Sleep: ${sleep} | Urination: ${urination} | Defecation: ${defecation} | Vomiting: ${vomiting} | Medication: ${medication} | Body: ${body}
-------------------------`

    const rawNote = String(formData.get('note') || '')
    const finalNote = statsBlock + '\n' + rawNote

    await onSave({
      id: crypto.randomUUID(),
      petId: pet.id,
      date: String(formData.get('date')),
      title: String(formData.get('title')),
      note: finalNote,
      mood,
      photos,
      videos,
      createdAt: Date.now()
    })

    // Reset states
    setPhotos([]); setVideos([]); setMood('happy'); setMediaError(''); setEditing(false); setSaving(false)
    // Reset visual choices
    setAppetite('😋 正常')
    setWater('💧 正常')
    setExercise('🐕 活力充沛')
    setSleep('😴 熟睡')
    setUrination('🚽 尿量正常')
    setDefecation('💩 便便正常')
    setVomiting('🟢 無嘔吐')
    setMedication('💊 已服藥')
    setBody('✨ 精神極佳')
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

  return <section className="memories-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">OFFLINE PET MEMORIES</span><h1>{pet?.name || '毛孩'}的生活回憶與日記</h1><p>照片、影片、與日常健康日記都保存在這台手機，輕鬆記下陪伴的每一天。</p></div></header>
    <button className="new-memory" onClick={() => setEditing(true)}><Plus weight="bold" />記錄今天的健康日記與故事</button>
    {entries.length ? <div className="memory-list">{entries.map((memory) => {
      const { stats, cleanNote } = parseJournalStats(memory.note)
      return (
        <article key={memory.id} className="upgraded-diary-card">
          {(memory.videos?.length || 0) > 0 && <div className="memory-videos"><VideoPlayer video={memory.videos![0]} compact />{memory.videos!.length > 1 && <span>另有 {memory.videos!.length - 1} 段影片</span>}</div>}
          {memory.photos.length > 0 && <div className={`memory-photos count-${Math.min(3, memory.photos.length)}`}>{memory.photos.slice(0, 3).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}{memory.photos.length > 3 && <em>＋{memory.photos.length - 3}</em>}</div>}

          <div className="memory-copy">
            <div className="diary-card-header">
              <time>{new Date(`${memory.date}T12:00:00`).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
              <span className="mood-badge">{moods.find(([value]) => value === memory.mood)?.[2]} {moods.find(([value]) => value === memory.mood)?.[1]}</span>
            </div>

            <h2>{memory.title}</h2>

            {/* Visual journal stats grid */}
            {stats && (
              <div className="visual-journal-grid">
                {stats.appetite && <span className="journal-pill"><Sparkle size={12} weight="fill" style={{color:'#d5a14e'}} /> 食慾: {stats.appetite}</span>}
                {stats.water && <span className="journal-pill">🥤 飲水: {stats.water}</span>}
                {stats.exercise && <span className="journal-pill">🏃 活力: {stats.exercise}</span>}
                {stats.sleep && <span className="journal-pill">🌙 睡眠: {stats.sleep}</span>}
                {stats.urination && <span className="journal-pill">🚽 排尿: {stats.urination}</span>}
                {stats.defecation && <span className="journal-pill">💩 排便: {stats.defecation}</span>}
                {stats.vomiting && stats.vomiting !== '🟢 無嘔吐' && <span className="journal-pill danger-pill">⚠️ 嘔吐: {stats.vomiting}</span>}
                {stats.medication && <span className="journal-pill">💊 服藥: {stats.medication}</span>}
                {stats.body && <span className="journal-pill"><Heart size={12} weight="fill" style={{color:'#e28e83'}} /> 精神: {stats.body}</span>}
              </div>
            )}

            {cleanNote && <p className="clean-note-text">{cleanNote}</p>}

            <button className="delete-diary-btn" onClick={() => void onDelete(memory)}><Trash /> 刪除日記</button>
          </div>
        </article>
      )
    })}</div> : <div className="timeline-empty"><FilmStrip size={30} /><b>第一篇日記與回憶，等你們寫下來</b><p>散步、第一次到家、生日、或是今天食慾精神狀況，都值得記下來。</p></div>}

    {editing && <div className="sheet-backdrop"><section className="editor-sheet memory-editor visual-journal-editor"><header><div><span>NEW LOCAL JOURNAL</span><h2>新增今日健康日記與回憶</h2></div><button className="close" onClick={() => setEditing(false)}>×</button></header><form action={submit}>
      <div className="two-fields"><label>日期<input type="date" name="date" defaultValue={localDateKey()} required /></label><label>日記標題<input name="title" required placeholder="例如：今天精神很好！" /></label></div>

      {/* Visual Mood Section */}
      <fieldset className="journal-fieldset"><legend>今天的心情</legend><div className="mood-picker">{moods.map(([value, label, icon]) => <button type="button" key={value} className={mood === value ? 'active' : ''} onClick={() => setMood(value)}><i>{icon}</i><span>{label}</span></button>)}</div></fieldset>

      {/* Visual logger sections with large touch targets */}
      <div className="visual-logger-container">
        <h3>📊 今日生理指標與健康指標</h3>

        {/* Appetite */}
        <div className="logger-row">
          <span className="logger-label">😋 今日食慾</span>
          <div className="logger-options">
            {['😋 正常', '🧊 食慾差', '🍖 旺盛', '🛑 禁食'].map(opt => (
              <button type="button" key={opt} className={appetite === opt ? 'active' : ''} onClick={() => setAppetite(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Water */}
        <div className="logger-row">
          <span className="logger-label">💧 飲水狀況</span>
          <div className="logger-options">
            {['💧 正常', '🥛 喝水少', '🥤 喝水多'].map(opt => (
              <button type="button" key={opt} className={water === opt ? 'active' : ''} onClick={() => setWater(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Exercise */}
        <div className="logger-row">
          <span className="logger-label">🏃 運動活力</span>
          <div className="logger-options">
            {['🐕 活力充沛', '💤 正常安靜', '🛌 休息'].map(opt => (
              <button type="button" key={opt} className={exercise === opt ? 'active' : ''} onClick={() => setExercise(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className="logger-row">
          <span className="logger-label">🌙 睡眠品質</span>
          <div className="logger-options">
            {['😴 熟睡', '🌀 易醒易驚', '🌟 穩定'].map(opt => (
              <button type="button" key={opt} className={sleep === opt ? 'active' : ''} onClick={() => setSleep(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Urination */}
        <div className="logger-row">
          <span className="logger-label">🚽 排尿狀況</span>
          <div className="logger-options">
            {['🚽 尿量正常', '🧻 頻尿', '❌ 無排尿'].map(opt => (
              <button type="button" key={opt} className={urination === opt ? 'active' : ''} onClick={() => setUrination(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Defecation */}
        <div className="logger-row">
          <span className="logger-label">💩 排便狀況</span>
          <div className="logger-options">
            {['💩 便便正常', '💧 軟便拉稀', '🪨 便秘'].map(opt => (
              <button type="button" key={opt} className={defecation === opt ? 'active' : ''} onClick={() => setDefecation(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Vomiting */}
        <div className="logger-row">
          <span className="logger-label">🟢 嘔吐次數</span>
          <div className="logger-options">
            {['🟢 無嘔吐', '⚠️ 嘔吐一次', '🚨 頻繁嘔吐'].map(opt => (
              <button type="button" key={opt} className={vomiting === opt ? 'active' : ''} onClick={() => setVomiting(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Medication */}
        <div className="logger-row">
          <span className="logger-label">💊 服藥完成</span>
          <div className="logger-options">
            {['💊 已服藥', '❌ 未服藥', '➖ 免服藥'].map(opt => (
              <button type="button" key={opt} className={medication === opt ? 'active' : ''} onClick={() => setMedication(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Body Condition */}
        <div className="logger-row">
          <span className="logger-label">✨ 整體精神</span>
          <div className="logger-options">
            {['✨ 精神極佳', '🥀 疲憊', '🦠 搔癢', '🩺 穩定'].map(opt => (
              <button type="button" key={opt} className={body === opt ? 'active' : ''} onClick={() => setBody(opt)}>{opt}</button>
            ))}
          </div>
        </div>
      </div>

      <label>寫下這一天（選填）<textarea name="note" placeholder="今天發生了什麼有趣或值得記住的事？最想記錄的是什麼？" style={{minHeight:'100px'}} /></label>

      <fieldset className="journal-fieldset"><legend>照片（最多5張）</legend><label className="photo-picker"><Camera />從手機選擇照片<input type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.target.files)} /></label>{photos.length > 0 && <div className="photo-previews">{photos.map((photo) => <div key={photo.id}><PhotoThumb photo={photo} /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}>×</button></div>)}</div>}</fieldset>

      <fieldset className="journal-fieldset"><legend>影片（最多2段）</legend><label className="photo-picker"><FilmStrip />從手機選擇影片<input type="file" accept="video/*" multiple onChange={(event) => addVideos(event.target.files)} /></label>{videos.length > 0 && <div className="video-previews">{videos.map((video) => <div key={video.id}><VideoPlayer video={video} /><button type="button" onClick={() => setVideos((current) => current.filter((item) => item.id !== video.id))}>移除</button><small>{video.name}・{Math.ceil(video.size / 1024 / 1024)} MB</small></div>)}</div>}{mediaError && <p className="field-error">{mediaError}</p>}<p className="local-photo-note">影片不會上傳；每段上限150 MB。影片會增加手機與備份檔容量，建議保留短片精華。</p></fieldset>

      <button className="save-reminder" disabled={saving}>{saving ? '正在保存…' : '保存這篇健康日記'}</button>
    </form></section></div>}
  </section>
}

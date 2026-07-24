import { useEffect, useRef, useState } from 'react'
import { FileAudio, Microphone, Play } from '@phosphor-icons/react'
import type { CareReminder, Pet, ReminderKind, RepeatRule, VoiceClip } from './domain'
import { kindIcons, kindLabels, localDateKey, repeatLabels } from './domain'

type Props = { pets: Pet[]; initialKind: ReminderKind; voices: VoiceClip[]; onClose: () => void; onSave: (reminder: CareReminder, voice?: VoiceClip) => Promise<void> }
const examples: Record<ReminderKind, string> = { medication: '心臟藥', feeding: '早餐', vet: '心臟科回診', vaccine: '年度疫苗', care: '量體重' }

export default function ReminderEditor({ pets, initialKind, voices, onClose, onSave }: Props) {
  const [kind, setKind] = useState(initialKind)
  const [repeat, setRepeat] = useState<RepeatRule>(initialKind === 'medication' || initialKind === 'feeding' ? 'daily' : 'once')
  const [times, setTimes] = useState(['08:00'])
  const [sound, setSound] = useState<CareReminder['sound']>('system')
  const [selectedVoice, setSelectedVoice] = useState(voices[0]?.id || '')
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState<VoiceClip | null>(null)
  const [recordingError, setRecordingError] = useState('')
  const [audioError, setAudioError] = useState('')
  const [saving, setSaving] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  function changeKind(next: ReminderKind) {
    setKind(next)
    setRepeat(next === 'medication' || next === 'feeding' ? 'daily' : 'once')
  }
  const repeatOptions: RepeatRule[] = kind === 'medication' || kind === 'feeding' ? ['once', 'daily'] : kind === 'vet' ? ['once'] : kind === 'vaccine' ? ['once', 'yearly'] : ['once', 'weekly', 'monthly', 'quarterly', 'yearly']

  async function startRecording() {
    setRecordingError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setRecordingError('這台裝置目前無法使用錄音功能')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      const chunks: BlobPart[] = []
      streamRef.current = stream
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const clip: VoiceClip = { id: crypto.randomUUID(), name: '該吃藥囉', blob, mimeType: blob.type, durationMs: Math.min(30_000, Date.now() - startedAtRef.current), createdAt: Date.now(), source: 'recording' }
        setRecorded(clip)
        setSelectedVoice(clip.id)
        setSound('voice')
        setRecording(false)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      setRecording(true)
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 30_000)
    } catch { setRecordingError('請允許麥克風權限後再錄一次') }
  }

  function stopRecording() { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }
  function playVoice(clip: VoiceClip) {
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    const cleanup = () => URL.revokeObjectURL(url)
    const stopAtThirtySeconds = window.setTimeout(() => { audio.pause(); audio.currentTime = 0; cleanup() }, 30_000)
    audio.onended = () => { window.clearTimeout(stopAtThirtySeconds); cleanup() }
    void audio.play()
  }
  function importAudio(file?: File) {
    if (!file) return
    setAudioError('')
    if (!file.type.startsWith('audio/')) return setAudioError('請選擇聲音或音樂檔案。')
    if (file.size > 20 * 1024 * 1024) return setAudioError('音檔超過20 MB，請選擇較短的聲音或音樂。')
    const clip: VoiceClip = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '') || '自訂提醒音', blob: file, mimeType: file.type, durationMs: 30_000, createdAt: Date.now(), source: 'file' }
    setRecorded(clip)
    setSelectedVoice(clip.id)
    setSound('voice')
  }

  async function submit(formData: FormData) {
    const checklist = (name: string) => String(formData.get(name) || '').split('\n').map((text) => text.trim()).filter(Boolean).map((text) => ({ id: crypto.randomUUID(), text, completed: false }))
    const reminder: CareReminder = {
      id: crypto.randomUUID(), petId: String(formData.get('petId')), kind,
      title: String(formData.get('title')), details: String(formData.get('details') || ''), dose: String(formData.get('dose') || ''),
      startDate: String(formData.get('startDate')), time: times[0], dailyTimes: repeat === 'daily' ? [...times].sort() : [times[0]], repeat,
      endDate: repeat !== 'once' ? String(formData.get('endDate') || '') : undefined,
      advanceMinutes: kind === 'vet' ? [1440, 120, 0] : [0], sound,
      voiceClipId: sound === 'voice' ? selectedVoice || recorded?.id : undefined,
      enabled: true, completedOccurrences: [], createdAt: Date.now(),
      medicationStock: kind === 'medication' && Number(formData.get('stockQuantity')) > 0 ? {
        initialQuantity: Number(formData.get('stockQuantity')),
        doseQuantity: Number(formData.get('doseQuantity')) || 1,
        unit: String(formData.get('stockUnit') || '顆'),
        lowStockThreshold: Number(formData.get('lowStockThreshold')) || 3,
      } : undefined,
      vetVisit: kind === 'vet' ? { preparationItems: checklist('preparationItems'), questions: checklist('questions') } : undefined,
    }
    setSaving(true)
    await onSave(reminder, recorded || undefined)
    setSaving(false)
  }

  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header><div><span>LOCAL CARE REMINDER</span><h2 id="editor-title">新增照護提醒</h2></div><button className="close" onClick={onClose} aria-label="關閉">×</button></header>
      <form action={submit}>
        <div className="kind-picker">{(Object.keys(kindLabels) as ReminderKind[]).map((item) => <button type="button" key={item} className={kind === item ? 'active' : ''} onClick={() => changeKind(item)}><i>{kindIcons[item]}</i><span>{kindLabels[item]}</span></button>)}</div>
        <div className="two-fields"><label>哪一位毛孩？<select name="petId">{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label><label>提醒名稱<input name="title" required placeholder={`例如：${examples[kind]}`} /></label></div>
        {kind === 'medication' && <label>藥品與劑量<input name="dose" placeholder="例如：心臟藥半顆，飯後服用" /></label>}
        {kind === 'medication' && <fieldset className="stock-editor"><legend>藥品庫存（選填）</legend><p>每次記錄「已完成」或「已補吃」後，自動扣除庫存。</p><div className="stock-fields"><label>目前庫存<input name="stockQuantity" type="number" min="0" step="0.5" placeholder="例如：30" /></label><label>每次用量<input name="doseQuantity" type="number" min="0.1" step="0.1" defaultValue="1" /></label><label>單位<select name="stockUnit" defaultValue="顆"><option>顆</option><option>包</option><option>錠</option><option>毫升</option><option>克</option></select></label><label>剩多少時提醒補藥<input name="lowStockThreshold" type="number" min="0" step="0.5" defaultValue="3" /></label></div></fieldset>}
        {kind === 'feeding' && <label>餐點與份量<input name="dose" placeholder="例如：乾飼料80克＋一杯水" /></label>}
        {kind === 'vet' && <fieldset className="vet-editor"><legend>看診前準備</legend><div className="two-fields"><label>要攜帶或準備的物品<textarea name="preparationItems" defaultValue={'健保／醫療資料\n目前服用的藥品\n近期照片或影片'} placeholder="每行一項" /></label><label>想詢問醫師的問題<textarea name="questions" placeholder={'每行一題，例如：\n最近食慾下降是否需要檢查？'} /></label></div><p>建立後可逐項勾選，問題與看診後紀錄都只存在手機。</p></fieldset>}
        <div className="two-fields"><label>{repeat === 'once' ? '日期' : '開始日期'}<input name="startDate" type="date" min={localDateKey()} defaultValue={localDateKey()} required /></label>{repeat !== 'once' && <label>結束日期（選填）<input name="endDate" type="date" min={localDateKey()} /></label>}</div>
        <fieldset><legend>提醒週期</legend><div className={`segmented repeat-count-${repeatOptions.length}`}>{repeatOptions.map((option) => <button type="button" key={option} className={repeat === option ? 'active' : ''} onClick={() => setRepeat(option)}>{repeatLabels[option]}</button>)}</div></fieldset>
        <fieldset><legend>{repeat === 'daily' ? '每天提醒時間' : '提醒時間'}</legend><div className="time-list">{times.map((time, index) => <div key={index}><input type="time" value={time} onChange={(event) => setTimes((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} required />{index > 0 && <button type="button" onClick={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))}>移除</button>}</div>)}{repeat === 'daily' && times.length < 5 && <button className="add-time" type="button" onClick={() => setTimes((current) => [...current, '12:00'])}>＋ 加一個{kind === 'feeding' ? '吃飯' : kind === 'medication' ? '服藥' : '提醒'}時間</button>}</div></fieldset>
        <fieldset className="sound-field"><legend>提醒聲音</legend><div className="sound-options"><button type="button" className={sound === 'system' ? 'active' : ''} onClick={() => setSound('system')}><span><b>系統提示音</b><small>使用手機預設聲音</small></span></button><button type="button" className={sound === 'voice' ? 'active' : ''} onClick={() => setSound('voice')}><span><b>我的聲音或音樂</b><small>錄音，或從手機選擇音檔</small></span></button></div>
          {sound === 'voice' && <div className="voice-recorder"><div className="voice-copy"><b>專屬提醒聲</b><small>最多播放30秒，只保存在這台手機</small></div><div className="voice-actions">{recording ? <button type="button" className="recording" onClick={stopRecording}><Microphone />停止錄音</button> : <button type="button" onClick={startRecording}><Microphone />開始錄音</button>}<label className="audio-file-picker"><FileAudio />匯入聲音或音樂<input type="file" accept="audio/*" onChange={(event) => importAudio(event.target.files?.[0])} /></label></div>{recorded && <button type="button" className="audio-preview" onClick={() => playVoice(recorded)}><Play weight="fill" />試聽「{recorded.name}」（最多30秒）</button>}{!recorded && voices.length > 0 && <select value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)}>{voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</select>}{recordingError && <p className="field-error">{recordingError}</p>}{audioError && <p className="field-error">{audioError}</p>}<p className="system-sound-note">App開啟時可播放自訂音檔；鎖屏或App完全關閉時，通知聲仍受 iPhone／Android 系統限制。</p></div>}
        </fieldset>
        <label>備註<textarea name="details" placeholder={kind === 'feeding' ? '例如：需要加水、保健粉或觀察食慾……' : '例如：飯後服用、攜帶檢查報告、想詢問醫師的問題……'} /></label>
        <div className="privacy-note">🔒 所有提醒、用藥與錄音都只保存在這台裝置</div>
        <button className="save-reminder" type="submit" disabled={saving}>{saving ? '正在保存…' : `保存${kindLabels[kind]}提醒`}</button>
      </form>
    </section>
  </div>
}

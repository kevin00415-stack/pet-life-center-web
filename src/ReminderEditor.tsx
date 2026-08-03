import { useEffect, useRef, useState } from 'react'
import { FileAudio, Microphone, Pause, Play } from '@phosphor-icons/react'
import type { CareReminder, Pet, ReminderKind, RepeatRule, VoiceClip } from './domain'
import { localDateKey } from './domain'
import { kindIconAssets } from './reminder-kind-assets'
import { interpolate, useTranslation } from './i18n/translations'

type Props = {
  pets: Pet[]
  initialKind: ReminderKind
  voices: VoiceClip[]
  onClose: () => void
  onSave: (reminder: CareReminder, voice?: VoiceClip) => Promise<void>
  editingReminder?: CareReminder
}
export default function ReminderEditor({ pets, initialKind, voices, onClose, onSave, editingReminder }: Props) {
  const { t } = useTranslation()
  const kindLabels: Record<ReminderKind, string> = { medication: t('kindMedication'), feeding: t('kindFeeding'), vet: t('kindVet'), vaccine: t('kindVaccine'), care: t('kindCare') }
  const repeatLabels: Record<RepeatRule, string> = { once: t('repeatOnce'), daily: t('repeatDaily'), weekly: t('repeatWeekly'), monthly: t('repeatMonthly'), quarterly: t('repeatQuarterly'), yearly: t('repeatYearly') }
  const examples: Record<ReminderKind, string> = { medication: t('reminderExampleMedication'), feeding: t('reminderExampleFeeding'), vet: t('reminderExampleVet'), vaccine: t('reminderExampleVaccine'), care: t('reminderExampleCare') }
  const [kind, setKind] = useState(editingReminder ? editingReminder.kind : initialKind)
  const [repeat, setRepeat] = useState<RepeatRule>(editingReminder ? editingReminder.repeat : (initialKind === 'medication' || initialKind === 'feeding' ? 'daily' : 'once'))
  const [times, setTimes] = useState(editingReminder ? (editingReminder.repeat === 'daily' ? editingReminder.dailyTimes : [editingReminder.time]) : ['08:00'])
  const [sound, setSound] = useState<CareReminder['sound']>(editingReminder ? editingReminder.sound : 'system')
  const [selectedVoice, setSelectedVoice] = useState(editingReminder ? editingReminder.voiceClipId || '' : (voices[0]?.id || ''))
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState<VoiceClip | null>(null)
  const [recordingError, setRecordingError] = useState('')
  const [audioError, setAudioError] = useState('')
  const [saving, setSaving] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewUrlRef = useRef('')
  const previewTimerRef = useRef<number | undefined>(undefined)
  const systemPreviewRef = useRef<AudioContext | null>(null)
  const [previewing, setPreviewing] = useState<'system' | string | null>(null)

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    stopPreview()
  }, [])

  function changeKind(next: ReminderKind) {
    setKind(next)
    setRepeat(next === 'medication' || next === 'feeding' ? 'daily' : 'once')
  }
  const repeatOptions: RepeatRule[] = kind === 'medication' || kind === 'feeding' ? ['once', 'daily'] : kind === 'vet' ? ['once'] : kind === 'vaccine' ? ['once', 'yearly'] : ['once', 'weekly', 'monthly', 'quarterly', 'yearly']

  async function startRecording() {
    setRecordingError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setRecordingError(t('reminderRecordingUnsupported'))
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
        const clip: VoiceClip = { id: crypto.randomUUID(), name: t('reminderRecordedClipName'), blob, mimeType: blob.type, durationMs: Math.min(30_000, Date.now() - startedAtRef.current), createdAt: Date.now(), source: 'recording' }
        setRecorded(clip)
        setSelectedVoice(clip.id)
        setSound('voice')
        setRecording(false)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      setRecording(true)
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 30_000)
    } catch { setRecordingError(t('reminderMicrophonePermission')) }
  }

  function stopRecording() { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }
  function stopPreview() {
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current)
    previewTimerRef.current = undefined
    previewAudioRef.current?.pause()
    previewAudioRef.current = null
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ''
    if (systemPreviewRef.current) void systemPreviewRef.current.close()
    systemPreviewRef.current = null
    setPreviewing(null)
  }
  function playSystemPreview() {
    stopPreview()
    setAudioError('')
    try {
      const context = new AudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(659.25, now)
      oscillator.frequency.setValueAtTime(783.99, now + .22)
      oscillator.frequency.setValueAtTime(987.77, now + .44)
      gain.gain.setValueAtTime(.0001, now)
      gain.gain.exponentialRampToValueAtTime(.16, now + .03)
      gain.gain.exponentialRampToValueAtTime(.0001, now + .85)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => {
        if (systemPreviewRef.current === context) {
          systemPreviewRef.current = null
          setPreviewing(null)
        }
        void context.close()
      }
      systemPreviewRef.current = context
      setPreviewing('system')
      oscillator.start(now)
      oscillator.stop(now + .9)
    } catch {
      setAudioError(t('reminderPreviewUnsupported'))
    }
  }
  function playVoice(clip: VoiceClip) {
    stopPreview()
    setAudioError('')
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    previewUrlRef.current = url
    previewAudioRef.current = audio
    setPreviewing(clip.id)
    previewTimerRef.current = window.setTimeout(stopPreview, 30_000)
    audio.onended = stopPreview
    audio.onerror = () => { stopPreview(); setAudioError(t('reminderAudioInvalid')) }
    void audio.play().catch(() => { stopPreview(); setAudioError(t('reminderPlaybackBlocked')) })
  }
  function importAudio(file?: File) {
    if (!file) return
    stopPreview()
    setAudioError('')
    if (!file.type.startsWith('audio/')) return setAudioError(t('reminderChooseAudio'))
    if (file.size > 20 * 1024 * 1024) return setAudioError(t('reminderAudioTooLarge'))
    const clip: VoiceClip = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '') || t('reminderCustomClipName'), blob: file, mimeType: file.type, durationMs: 30_000, createdAt: Date.now(), source: 'file' }
    setRecorded(clip)
    setSelectedVoice(clip.id)
    setSound('voice')
  }

  async function submit(formData: FormData) {
    const checklist = (name: string) => String(formData.get(name) || '').split('\n').map((text) => text.trim()).filter(Boolean).map((text) => ({ id: crypto.randomUUID(), text, completed: false }))
    const reminder: CareReminder = {
      id: editingReminder ? editingReminder.id : crypto.randomUUID(),
      petId: String(formData.get('petId')),
      kind,
      title: String(formData.get('title')),
      details: String(formData.get('details') || ''),
      dose: String(formData.get('dose') || ''),
      startDate: String(formData.get('startDate')),
      time: times[0],
      dailyTimes: repeat === 'daily' ? [...times].sort() : [times[0]],
      repeat,
      endDate: repeat !== 'once' ? String(formData.get('endDate') || '') : undefined,
      advanceMinutes: kind === 'vet' ? [1440, 120, 0] : [0],
      sound,
      voiceClipId: sound === 'voice' ? selectedVoice || recorded?.id : undefined,
      enabled: editingReminder ? editingReminder.enabled : true,
      completedOccurrences: editingReminder ? editingReminder.completedOccurrences : [],
      occurrenceRecords: editingReminder ? editingReminder.occurrenceRecords : [],
      createdAt: editingReminder ? editingReminder.createdAt : Date.now(),
      medicationStock: kind === 'medication' && Number(formData.get('stockQuantity')) > 0 ? {
        initialQuantity: Number(formData.get('stockQuantity')),
        doseQuantity: Number(formData.get('doseQuantity')) || 1,
        unit: String(formData.get('stockUnit') || '顆'),
        lowStockThreshold: Number(formData.get('lowStockThreshold')) || 3,
      } : undefined,
      vetVisit: kind === 'vet' ? (editingReminder?.vetVisit || { preparationItems: checklist('preparationItems'), questions: checklist('questions') }) : undefined,
    }
    setSaving(true)
    await onSave(reminder, recorded || undefined)
    setSaving(false)
  }
  const previewClip = recorded || voices.find((voice) => voice.id === selectedVoice)

  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header><div><span>LOCAL CARE REMINDER</span><h2 id="editor-title">{editingReminder ? t('reminderEditorEditTitle') : t('reminderEditorAddTitle')}</h2></div><button className="close" onClick={onClose} aria-label={t('close')}>×</button></header>
      <form action={submit}>
        <div className="kind-picker">{(Object.keys(kindLabels) as ReminderKind[]).map((item) => <button type="button" key={item} className={kind === item ? 'active' : ''} onClick={() => changeKind(item)}><i><img src={kindIconAssets[item]} alt="" /></i><span>{kindLabels[item]}</span></button>)}</div>
        <div className="two-fields">
          <label>{t('reminderPetLabel')}
            <select name="petId" defaultValue={editingReminder ? editingReminder.petId : undefined}>
              {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
            </select>
          </label>
          <label>{t('reminderNameLabel')}
            <input name="title" required defaultValue={editingReminder ? editingReminder.title : ''} placeholder={interpolate(t('exampleValue'), { value: examples[kind] })} />
          </label>
        </div>
        {kind === 'medication' && <label>{t('reminderMedicationDose')}<input name="dose" defaultValue={editingReminder ? editingReminder.dose : ''} placeholder={t('reminderMedicationDoseExample')} /></label>}
        {kind === 'medication' && <fieldset className="stock-editor"><legend>{t('reminderStockOptional')}</legend><p>{t('reminderStockHelp')}</p><div className="stock-fields"><label>{t('reminderStockCurrent')}<input name="stockQuantity" defaultValue={editingReminder?.medicationStock ? editingReminder.medicationStock.initialQuantity : ''} type="number" min="0" step="0.5" placeholder={t('reminderStockExample')} /></label><label>{t('reminderDoseQuantity')}<input name="doseQuantity" defaultValue={editingReminder?.medicationStock ? editingReminder.medicationStock.doseQuantity : '1'} type="number" min="0.1" step="0.1" /></label><label>{t('reminderStockUnit')}<select name="stockUnit" defaultValue={editingReminder?.medicationStock ? editingReminder.medicationStock.unit : '顆'}><option value="顆">{t('unitPiece')}</option><option value="包">{t('unitPacket')}</option><option value="錠">{t('unitTablet')}</option><option value="毫升">{t('unitMilliliter')}</option><option value="克">{t('unitGram')}</option></select></label><label>{t('reminderLowStockThreshold')}<input name="lowStockThreshold" defaultValue={editingReminder?.medicationStock ? editingReminder.medicationStock.lowStockThreshold : '3'} type="number" min="0" step="0.5" /></label></div></fieldset>}
        {kind === 'feeding' && <label>{t('reminderMealDose')}<input name="dose" defaultValue={editingReminder ? editingReminder.dose : ''} placeholder={t('reminderMealDoseExample')} /></label>}
        {kind === 'vet' && <fieldset className="vet-editor"><legend>{t('reminderVetPreparation')}</legend><div className="two-fields"><label>{t('reminderVetItems')}<textarea name="preparationItems" defaultValue={editingReminder?.vetVisit ? editingReminder.vetVisit.preparationItems.map(item => item.text).join('\n') : t('reminderVetItemsDefault')} placeholder={t('reminderOnePerLine')} /></label><label>{t('reminderVetQuestions')}<textarea name="questions" defaultValue={editingReminder?.vetVisit ? editingReminder.vetVisit.questions.map(item => item.text).join('\n') : ''} placeholder={t('reminderVetQuestionsExample')} /></label></div><p>{t('reminderVetLocalHelp')}</p></fieldset>}
        <div className="two-fields">
          <label>{repeat === 'once' ? t('dateLabel') : t('reminderStartDate')}
            <input name="startDate" type="date" defaultValue={editingReminder ? editingReminder.startDate : localDateKey()} required />
          </label>
          {repeat !== 'once' && (
            <label>{t('reminderEndDateOptional')}
              <input name="endDate" type="date" defaultValue={editingReminder ? editingReminder.endDate : ''} />
            </label>
          )}
        </div>
        <fieldset><legend>{t('reminderRepeatCycle')}</legend><div className={`segmented repeat-count-${repeatOptions.length}`}>{repeatOptions.map((option) => <button type="button" key={option} className={repeat === option ? 'active' : ''} onClick={() => setRepeat(option)}>{repeatLabels[option]}</button>)}</div></fieldset>
        <fieldset><legend>{repeat === 'daily' ? t('reminderDailyTimes') : t('reminderTime')}</legend><div className="time-list">{times.map((time, index) => <div key={index}><input type="time" value={time} onChange={(event) => setTimes((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} required />{index > 0 && <button type="button" onClick={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t('remove')}</button>}</div>)}{repeat === 'daily' && times.length < 5 && <button className="add-time" type="button" onClick={() => setTimes((current) => [...current, '12:00'])}>{interpolate(t('reminderAddTime'), { kind: kind === 'feeding' ? t('kindFeeding') : kind === 'medication' ? t('reminderMedicationAction') : t('navReminders') })}</button>}</div></fieldset>
        <fieldset className="sound-field"><legend>{t('reminderSound')}</legend><div className="sound-options"><button type="button" className={sound === 'system' ? 'active' : ''} onClick={() => { stopPreview(); setSound('system') }}><span><b>{t('reminderSystemSound')}</b><small>{t('reminderSystemSoundHelp')}</small></span></button><button type="button" className={sound === 'voice' ? 'active' : ''} onClick={() => { stopPreview(); setSound('voice') }}><span><b>{t('reminderMyAudio')}</b><small>{t('reminderMyAudioHelp')}</small></span></button></div>
          {sound === 'system' && <div className="system-preview"><button type="button" className={previewing === 'system' ? 'is-playing' : ''} onClick={previewing === 'system' ? stopPreview : playSystemPreview}>{previewing === 'system' ? <Pause weight="fill" /> : <Play weight="fill" />}{previewing === 'system' ? t('reminderStopPreview') : t('reminderPreviewSystem')}</button><p>{t('reminderSystemLimit')}</p></div>}
          {sound === 'voice' && <div className="voice-recorder"><div className="voice-copy"><b>{t('reminderCustomSound')}</b><small>{t('reminderCustomSoundHelp')}</small></div><div className="voice-actions">{recording ? <button type="button" className="recording" onClick={stopRecording}><Microphone />{t('reminderStopRecording')}</button> : <button type="button" onClick={startRecording}><Microphone />{t('reminderStartRecording')}</button>}<label className="audio-file-picker"><FileAudio />{t('reminderImportAudio')}<input type="file" accept="audio/*" onChange={(event) => importAudio(event.target.files?.[0])} /></label></div>{!recorded && voices.length > 0 && <select value={selectedVoice} onChange={(event) => { stopPreview(); setSelectedVoice(event.target.value) }}>{voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</select>}{previewClip && <button type="button" className={`audio-preview ${previewing === previewClip.id ? 'is-playing' : ''}`} onClick={previewing === previewClip.id ? stopPreview : () => playVoice(previewClip)}>{previewing === previewClip.id ? <Pause weight="fill" /> : <Play weight="fill" />}{previewing === previewClip.id ? t('reminderStopPreview') : interpolate(t('reminderPreviewClip'), { name: previewClip.name })}</button>}{!previewClip && <p className="preview-empty">{t('reminderPreviewEmpty')}</p>}{recordingError && <p className="field-error">{recordingError}</p>}{audioError && <p className="field-error">{audioError}</p>}<p className="system-sound-note">{t('reminderCustomSoundLimit')}</p></div>}
          {sound === 'system' && audioError && <p className="field-error">{audioError}</p>}
        </fieldset>
        <label>{t('notesLabel')}<textarea name="details" defaultValue={editingReminder ? editingReminder.details : ''} placeholder={kind === 'feeding' ? t('reminderMealNotesExample') : t('reminderNotesExample')} /></label>
        <div className="privacy-note">🔒 {t('reminderPrivacy')}</div>
        <button className="save-reminder" type="submit" disabled={saving}>{saving ? t('saving') : interpolate(t('reminderSaveKind'), { kind: kindLabels[kind] })}</button>
      </form>
    </section>
  </div>
}

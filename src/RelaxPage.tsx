import { useCallback, useEffect, useRef, useState } from 'react'
import { CARE_ALERT_EVENT, type CareAlertDetail } from './audio-coordination'

type Track = { id: string; title: string; subtitle: string; duration: string; file: string; coverClass: string }

const mediaBaseUrl = (import.meta.env.VITE_MEDIA_BASE_URL || 'https://raw.githubusercontent.com/kevin00415-stack/pet-life-center-web/main/external-media-source').replace(/\/$/, '')
const tracks: Track[] = [
  { id: 'plc-001', title: 'Crystal Forest Drift', subtitle: '水晶森林漂流', duration: '4:08', file: `${mediaBaseUrl}/PLC-001-Crystal-Forest-Drift.mp3`, coverClass: 'crystal' },
  { id: 'plc-002', title: 'Forest Drift', subtitle: '森林', duration: '3:19', file: `${mediaBaseUrl}/PLC-002-Forest-Drift.mp3`, coverClass: 'forest' },
  { id: 'plc-003', title: 'Ocean Whisper', subtitle: '海洋低語', duration: '3:10', file: `${mediaBaseUrl}/PLC-003-Ocean-Whisper.mp3`, coverClass: 'ocean' },
]

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export default function RelaxPage({ onBack }: { onBack: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const resumeAfterAlertRef = useRef(false)
  const alertActiveRef = useRef(false)
  const [selectedId, setSelectedId] = useState(tracks[0].id)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [careAlertActive, setCareAlertActive] = useState(false)
  const selected = tracks.find((track) => track.id === selectedId) || tracks[0]
  const selectedIndex = tracks.findIndex((track) => track.id === selected.id)

  const playTrack = useCallback(async (track: Track) => {
    const audio = audioRef.current
    if (!audio) return
    if (track.id !== selectedId) {
      setSelectedId(track.id)
      setCurrentTime(0)
      audio.src = track.file
      audio.load()
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [selectedId])

  const moveTrack = useCallback((direction: -1 | 1) => {
    const currentIndex = tracks.findIndex((track) => track.id === selectedId)
    const nextIndex = (currentIndex + direction + tracks.length) % tracks.length
    void playTrack(tracks[nextIndex])
  }, [playTrack, selectedId])

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
  }, [])
  useEffect(() => {
    const handleCareAlert = (event: Event) => {
      const detail = (event as CustomEvent<CareAlertDetail>).detail
      const audio = audioRef.current
      if (!audio) return
      if (detail.phase === 'started') {
        alertActiveRef.current = true
        setCareAlertActive(true)
        resumeAfterAlertRef.current = !audio.paused
        if (!audio.paused) audio.pause()
        return
      }
      alertActiveRef.current = false
      setCareAlertActive(false)
      if (resumeAfterAlertRef.current) {
        resumeAfterAlertRef.current = false
        void audio.play().catch(() => setPlaying(false))
      }
    }
    window.addEventListener(CARE_ALERT_EVENT, handleCareAlert)
    return () => window.removeEventListener(CARE_ALERT_EVENT, handleCareAlert)
  }, [])
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: selected.title,
      artist: `毛孩生活中心・${selected.subtitle}`,
      album: '毛孩舒壓',
    })
    navigator.mediaSession.setActionHandler('play', () => void audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => moveTrack(-1))
    navigator.mediaSession.setActionHandler('nexttrack', () => moveTrack(1))
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime != null) audioRef.current.currentTime = details.seekTime
    })
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [moveTrack, selected])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !Number.isFinite(duration) || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.min(currentTime, duration),
      })
    } catch {
      // Older WebViews may expose Media Session without position-state support.
    }
  }, [currentTime, duration])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) await playTrack(selected)
    else {
      if (alertActiveRef.current) resumeAfterAlertRef.current = false
      audio.pause()
      setPlaying(false)
    }
  }

  const selectTimer = (minutes: number) => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    setTimerMinutes(minutes)
    setRemainingSeconds(minutes * 60)
    if (!minutes) return
    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          audioRef.current?.pause()
          setPlaying(false)
          setTimerMinutes(0)
          if (timerRef.current) window.clearInterval(timerRef.current)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
  }

  return <section className="relax-page">
    <header className="subpage-header"><button onClick={onBack} aria-label="返回照護首頁">‹</button><div><span className="eyebrow">PET RELAX</span><h1>毛孩舒壓</h1></div><span className="offline-pill">雲端串流</span></header>
    <div className={`relax-hero ${selected.coverClass}`}>
      <div className="relax-orb"><span>♫</span></div><span className="eyebrow">NOW PLAYING</span><h2>{selected.title}</h2><p>{selected.subtitle}</p>
      <audio ref={audioRef} src={selected.file} preload="none" playsInline onPlay={() => { setPlaying(true); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing' }} onPause={() => { setPlaying(false); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused' }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={() => moveTrack(1)} />
      <input className="song-progress" type="range" min="0" max={duration || 1} value={currentTime} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = next; setCurrentTime(next) }} aria-label="播放進度" />
      <div className="song-times"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      <div className="playback-buttons"><button onClick={() => moveTrack(-1)} aria-label="上一首">│◀</button><button className="play-button" onClick={() => void toggle()} aria-label={playing ? '暫停' : '播放'}>{playing ? 'Ⅱ' : '▶'}</button><button onClick={() => moveTrack(1)} aria-label="下一首">▶│</button></div>
      <p className="background-ready">{careAlertActive ? '照護提醒中・結束後自動恢復音樂' : playing ? '可切到背景或鎖定螢幕繼續聆聽' : `第 ${selectedIndex + 1} 首・準備播放`}</p>
    </div>
    <section className="relax-controls">
      <div className="section-title"><div><span className="eyebrow">SLEEP TIMER</span><h2>定時停止</h2></div>{remainingSeconds > 0 && <strong>{formatTime(remainingSeconds)}</strong>}</div>
      <div className="timer-options">{[0, 15, 30, 60].map((minutes) => <button key={minutes} className={timerMinutes === minutes ? 'active' : ''} onClick={() => selectTimer(minutes)}>{minutes ? `${minutes} 分鐘` : '不定時'}</button>)}</div>
      <label className="volume-control"><span>音量</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /><b>{Math.round(volume * 100)}%</b></label>
    </section>
    <section className="track-section">
      <div className="section-title"><div><span className="eyebrow">STREAMING PLAYLIST</span><h2>正式舒壓曲目</h2></div><small>3 首・點選後載入</small></div>
      <div className="track-list">{tracks.map((track, index) => <button key={track.id} className={track.id === selectedId ? 'active' : ''} onClick={() => void playTrack(track)}><span className={`track-cover ${track.coverClass}`}>{index + 1}</span><span><b>{track.title}</b><small>{track.subtitle}・{track.duration}</small></span><em>{track.id === selectedId && playing ? '播放中' : '▶'}</em></button>)}</div>
      <p className="relax-note">音樂適合陪伴與環境放鬆，不取代獸醫診斷或治療。請維持舒適音量，並觀察毛孩反應。</p>
    </section>
  </section>
}

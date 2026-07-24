import { useState } from 'react'
import type { CareReminder, Pet } from './domain'
import { calendarEventsInRange, kindIcons, kindLabels, localDateKey, repeatLabels } from './domain'

type Props = { pet?: Pet; reminders: CareReminder[]; onBack: () => void; onComplete: (reminder: CareReminder, occurrence: Date) => Promise<void> }

export default function CareCalendar({ pet, reminders, onBack, onComplete }: Props) {
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(localDateKey(today))
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const events = calendarEventsInRange(reminders, pet?.id || '', month, monthEnd)
  const byDate = events.reduce<Record<string, typeof events>>((groups, event) => { (groups[localDateKey(event.occurrence)] ||= []).push(event); return groups }, {})
  const firstWeekday = month.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : undefined
  })
  const selectedEvents = byDate[selected] || []
  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next); setSelected(localDateKey(next))
  }

  return <section className="calendar-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">OFFLINE CARE CALENDAR</span><h1>{pet?.name || '毛孩'}的照護月曆</h1><p>所有提醒與健康行程，都在這台手機集中查看。</p></div></header>
    <section className="calendar-card"><div className="calendar-heading"><button onClick={() => moveMonth(-1)}>‹</button><h2>{month.getFullYear()} 年 {month.getMonth() + 1} 月</h2><button onClick={() => moveMonth(1)}>›</button></div><div className="weekday-row">{['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{cells.map((date, index) => date ? <button key={localDateKey(date)} className={`${selected === localDateKey(date) ? 'selected' : ''} ${localDateKey(date) === localDateKey(today) ? 'today' : ''}`} onClick={() => setSelected(localDateKey(date))}><b>{date.getDate()}</b><span>{(byDate[localDateKey(date)] || []).slice(0, 4).map((event) => <i key={event.id} className={event.reminder.kind} />)}</span></button> : <i key={`empty-${index}`} />)}</div><div className="calendar-legend">{(['medication', 'feeding', 'vet', 'vaccine', 'care'] as const).map((kind) => <span key={kind}><i className={kind} />{kindLabels[kind]}</span>)}</div></section>
    <section className="selected-schedule"><div className="section-title"><div><span className="eyebrow">DAILY SCHEDULE</span><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</h2></div><small>{selectedEvents.length} 個行程</small></div>{selectedEvents.length ? <div>{selectedEvents.map((event) => <article key={event.id}><time>{event.occurrence.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</time><i className={event.reminder.kind}>{kindIcons[event.reminder.kind]}</i><span><b>{event.reminder.title}</b><small>{kindLabels[event.reminder.kind]}・{repeatLabels[event.reminder.repeat]}・{event.reminder.dose || event.reminder.details || '照護行程'}</small></span><button onClick={() => void onComplete(event.reminder, event.occurrence)}>完成</button></article>)}</div> : <div className="calendar-empty"><i>✓</i><b>這一天沒有待辦行程</b><p>可以安心陪毛孩享受生活。</p></div>}</section>
  </section>
}

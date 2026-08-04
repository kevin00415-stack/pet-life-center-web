import { useState } from 'react'
import type { CareReminder, Pet } from './domain'
import { calendarEventsInRange, kindIcons, localDateKey } from './domain'
import { formatDate, formatTime } from './i18n/formatters'
import { interpolate, useTranslation } from './i18n/translations'

type Props = { pet?: Pet; reminders: CareReminder[]; onBack: () => void; onComplete: (reminder: CareReminder, occurrence: Date) => Promise<void> }

export default function CareCalendar({ pet, reminders, onBack, onComplete }: Props) {
  const { t, locale } = useTranslation()
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

  const kindText = { medication: t('kindMedication'), feeding: t('kindFeeding'), vet: t('kindVet'), vaccine: t('kindVaccine'), care: t('kindCare') }
  const repeatText = { once: t('repeatOnce'), daily: t('repeatDaily'), weekly: t('repeatWeekly'), monthly: t('repeatMonthly'), quarterly: t('repeatQuarterly'), yearly: t('repeatYearly') }
  const weekdays = Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 7, 2 + day)))
  return <section className="calendar-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">OFFLINE CARE CALENDAR</span><h1>{interpolate(t('calendarTitle'), { pet: pet?.name || t('genericPet') })}</h1><p>{t('calendarSubtitle')}</p></div></header>
    <section className="calendar-card"><div className="calendar-heading"><button aria-label={t('calendarAriaPreviousMonth')} onClick={() => moveMonth(-1)}>‹</button><h2>{formatDate(month, locale, { year: 'numeric', month: 'long' })}</h2><button aria-label={t('calendarAriaNextMonth')} onClick={() => moveMonth(1)}>›</button></div><div className="weekday-row">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{cells.map((date, index) => date ? <button key={localDateKey(date)} className={`${selected === localDateKey(date) ? 'selected' : ''} ${localDateKey(date) === localDateKey(today) ? 'today' : ''}`} onClick={() => setSelected(localDateKey(date))}><b>{date.getDate()}</b><span>{(byDate[localDateKey(date)] || []).slice(0, 4).map((event) => <i key={event.id} className={event.reminder.kind} />)}</span></button> : <i key={`empty-${index}`} />)}</div><div className="calendar-legend">{(['medication', 'feeding', 'vet', 'vaccine', 'care'] as const).map((kind) => <span key={kind}><i className={kind} />{kindText[kind]}</span>)}</div></section>
    <section className="selected-schedule"><div className="section-title"><div><span className="eyebrow">DAILY SCHEDULE</span><h2>{formatDate(selected, locale, { month: 'long', day: 'numeric', weekday: 'long' })}</h2></div><small>{interpolate(t('calendarScheduleCount'), { count: selectedEvents.length })}</small></div>{selectedEvents.length ? <div>{selectedEvents.map((event) => <article key={event.id}><time>{formatTime(event.occurrence, locale)}</time><i className={event.reminder.kind}>{kindIcons[event.reminder.kind]}</i><span><b>{event.reminder.title}</b><small>{kindText[event.reminder.kind]}・{repeatText[event.reminder.repeat]}・{event.reminder.dose || event.reminder.details || t('calendarCareTask')}</small></span><button onClick={() => void onComplete(event.reminder, event.occurrence)}>{t('calendarComplete')}</button></article>)}</div> : <div className="calendar-empty"><i>✓</i><b>{t('calendarEmptyTitle')}</b><p>{t('calendarEmptyBody')}</p></div>}</section>
  </section>
}

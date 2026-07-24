import { useMemo, useState } from 'react'
import type { CareReminder, GrowthRecord, Pet, ReminderKind } from './domain'
import { buildHealthTimeline, kindIcons, kindLabels } from './domain'
import GrowthTracker from './GrowthTracker'

type Props = { pet?: Pet; reminders: CareReminder[]; growthRecords: GrowthRecord[]; onBack: () => void; onSaveGrowth: (record: GrowthRecord) => Promise<void>; onDeleteGrowth: (record: GrowthRecord) => Promise<void> }
const statusLabels = { completed: '已完成', late: '已補做', skipped: '本次略過', scheduled: '預定', recorded: '已有紀錄' }

export default function HealthTimeline({ pet, reminders, growthRecords, onBack, onSaveGrowth, onDeleteGrowth }: Props) {
  const [filter, setFilter] = useState<'all' | ReminderKind>('all')
  const events = useMemo(() => buildHealthTimeline(reminders, pet?.id || ''), [reminders, pet?.id])
  const shown = filter === 'all' ? events : events.filter((event) => event.kind === filter)
  const monthGroups = shown.reduce<Record<string, typeof shown>>((groups, event) => {
    const key = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(event.date)
    ;(groups[key] ||= []).push(event)
    return groups
  }, {})

  return <section className="timeline-page"><header className="timeline-header"><button onClick={onBack}>‹</button><div><span className="eyebrow">LOCAL HEALTH HISTORY</span><h1>{pet?.name || '毛孩'}的健康時間軸</h1><p>生活照護與健康紀錄，都留在這台手機。</p></div></header>
    <div className="timeline-stats"><div><strong>{events.length}</strong><small>全部紀錄</small></div><div><strong>{events.filter((event) => event.kind === 'medication').length}</strong><small>服藥</small></div><div><strong>{events.filter((event) => event.kind === 'vet').length}</strong><small>看診</small></div></div>
    <GrowthTracker pet={pet} records={growthRecords} onSave={onSaveGrowth} onDelete={onDeleteGrowth} />
    <div className="timeline-filters">{([['all', '全部'], ['medication', '吃藥'], ['feeding', '吃飯'], ['vet', '看診'], ['vaccine', '疫苗'], ['care', '照護']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {Object.keys(monthGroups).length ? Object.entries(monthGroups).map(([month, items]) => <section className="timeline-month" key={month}><h2>{month}</h2><div className="timeline-list">{items.map((event) => <article key={event.id}><time><b>{event.date.getDate()}</b><small>{event.date.toLocaleDateString('zh-TW', { weekday: 'short' })}</small></time><i className={event.kind}>{kindIcons[event.kind]}</i><div><span>{kindLabels[event.kind]}・{event.date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</span><h3>{event.title}</h3><p>{event.details}</p></div><em className={event.status}>{statusLabels[event.status]}</em></article>)}</div></section>) : <div className="timeline-empty"><i>♡</i><b>還沒有這類紀錄</b><p>完成照護、建立看診或疫苗提醒後，會自動出現在這裡。</p></div>}
  </section>
}

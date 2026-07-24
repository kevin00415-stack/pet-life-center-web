import { useMemo, useState } from 'react'
import { PlusCircle } from '@phosphor-icons/react'
import type { GrowthRecord, Pet } from './domain'
import { localDateKey } from './domain'

type Props = { pet?: Pet; records: GrowthRecord[]; onSave: (record: GrowthRecord) => Promise<void>; onDelete: (record: GrowthRecord) => Promise<void> }

export default function GrowthTracker({ pet, records, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const sorted = useMemo(() => records.filter((record) => record.petId === pet?.id).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt), [records, pet?.id])
  const recent = sorted.slice(-12)
  const latest = sorted.at(-1)
  const previous = sorted.at(-2)
  const change = latest && previous ? latest.weightKg - previous.weightKg : undefined
  const weights = recent.map((record) => record.weightKg)
  const min = weights.length ? Math.min(...weights) : 0
  const max = weights.length ? Math.max(...weights) : 0
  const range = Math.max(.2, max - min)
  const points = recent.map((record, index) => ({ record, x: recent.length === 1 ? 150 : 18 + index / (recent.length - 1) * 264, y: 100 - (record.weightKg - min) / range * 76 }))

  async function submit(formData: FormData) {
    if (!pet) return
    setSaving(true)
    const optional = (name: string) => Number(formData.get(name)) || undefined
    await onSave({ id: crypto.randomUUID(), petId: pet.id, date: String(formData.get('date')), weightKg: Number(formData.get('weightKg')), bodyLengthCm: optional('bodyLengthCm'), chestCm: optional('chestCm'), neckCm: optional('neckCm'), note: String(formData.get('note') || ''), createdAt: Date.now() })
    setEditing(false); setSaving(false)
  }

  return <section className="growth-card"><div className="growth-heading"><div><span className="eyebrow">GROWTH & WEIGHT</span><h2>成長與體重</h2></div></div><button className="growth-add-primary" onClick={() => setEditing(true)}><PlusCircle size={24} weight="fill" /><span><b>新增健康紀錄</b><small>體重、身長、胸圍與備註</small></span></button>
    {latest ? <><div className="growth-summary"><div><strong>{latest.weightKg}</strong><small>公斤・最新體重</small></div><div><strong className={change && change > 0 ? 'up' : change && change < 0 ? 'down' : ''}>{change === undefined ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)}`}</strong><small>與上次相比</small></div><div><strong>{sorted.length}</strong><small>累積紀錄</small></div></div>
      <div className="weight-chart"><svg viewBox="0 0 300 120" role="img" aria-label="體重趨勢圖"><line x1="18" y1="100" x2="282" y2="100" /><polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} />{points.map((point) => <g key={point.record.id}><circle cx={point.x} cy={point.y} r="4" /><text x={point.x} y={point.y - 9}>{point.record.weightKg}</text></g>)}</svg><div><span>{recent[0]?.date}</span><span>{recent.at(-1)?.date}</span></div></div>
      <div className="growth-history">{[...sorted].reverse().slice(0, 5).map((record) => <article key={record.id}><time>{record.date}</time><b>{record.weightKg} kg</b><span>{[record.bodyLengthCm && `身長 ${record.bodyLengthCm}cm`, record.chestCm && `胸圍 ${record.chestCm}cm`, record.neckCm && `頸圍 ${record.neckCm}cm`].filter(Boolean).join('・') || record.note || '體重紀錄'}</span><button onClick={() => void onDelete(record)}>×</button></article>)}</div></> : <div className="growth-empty"><i>↗</i><b>記下第一筆體重</b><p>固定時間記錄，更容易看見長期變化。</p></div>}
    {editing && <div className="sheet-backdrop"><section className="editor-sheet"><header><div><span>LOCAL GROWTH RECORD</span><h2>新增成長紀錄</h2></div><button className="close" onClick={() => setEditing(false)}>×</button></header><form action={submit}><div className="two-fields"><label>日期<input type="date" name="date" defaultValue={localDateKey()} required /></label><label>體重（公斤）<input type="number" name="weightKg" min="0.01" step="0.01" required placeholder="例如：6.25" /></label></div><div className="growth-fields"><label>身長（cm）<input type="number" name="bodyLengthCm" min="0" step="0.1" /></label><label>胸圍（cm）<input type="number" name="chestCm" min="0" step="0.1" /></label><label>頸圍（cm）<input type="number" name="neckCm" min="0" step="0.1" /></label></div><label>備註<textarea name="note" placeholder="例如：換飼料後、剛結束療程、食慾狀況……" /></label><div className="privacy-note">🔒 成長數值只保存在這台裝置</div><button className="save-reminder" disabled={saving}>{saving ? '正在保存…' : '保存成長紀錄'}</button></form></section></div>}
  </section>
}

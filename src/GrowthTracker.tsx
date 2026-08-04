import { useMemo, useState } from 'react'
import { PlusCircle } from '@phosphor-icons/react'
import type { GrowthRecord, Pet } from './domain'
import { localDateKey } from './domain'
import { interpolate, useTranslation } from './i18n/translations'
import { formatDate, formatNumber, formatWeight } from './i18n/formatters'

type Props = { pet?: Pet; records: GrowthRecord[]; onSave: (record: GrowthRecord) => Promise<void>; onDelete: (record: GrowthRecord) => Promise<void> }

export default function GrowthTracker({ pet, records, onSave, onDelete }: Props) {
  const { t, locale } = useTranslation()
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

  const measurementText = (record: GrowthRecord) => [record.bodyLengthCm && interpolate(t('growthBodyLengthValue'), { value: formatNumber(record.bodyLengthCm, locale) }), record.chestCm && interpolate(t('growthChestValue'), { value: formatNumber(record.chestCm, locale) }), record.neckCm && interpolate(t('growthNeckValue'), { value: formatNumber(record.neckCm, locale) })].filter(Boolean).join(' · ') || record.note || t('growthWeightRecord')
  return <section className="growth-card"><div className="growth-heading"><div><span className="eyebrow">GROWTH & WEIGHT</span><h2>{t('growthTitle')}</h2></div></div><button className="growth-add-primary" onClick={() => setEditing(true)}><PlusCircle size={24} weight="fill" /><span><b>{t('growthAddHealth')}</b><small>{t('growthAddHealthHelp')}</small></span></button>
    {latest ? <><div className="growth-summary"><div><strong>{formatWeight(latest.weightKg, locale)}</strong><small>{t('growthLatestWeight')}</small></div><div><strong className={change && change > 0 ? 'up' : change && change < 0 ? 'down' : ''}>{change === undefined ? '—' : `${change > 0 ? '+' : ''}${formatNumber(change, locale, { maximumFractionDigits: 2 })}`}</strong><small>{t('growthComparedPrevious')}</small></div><div><strong>{formatNumber(sorted.length, locale)}</strong><small>{t('growthTotalRecords')}</small></div></div>
      <div className="weight-chart"><svg viewBox="0 0 300 120" role="img" aria-label={t('growthChartAria')}><line x1="18" y1="100" x2="282" y2="100" /><polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} />{points.map((point) => <g key={point.record.id}><circle cx={point.x} cy={point.y} r="4" /><text x={point.x} y={point.y - 9}>{formatNumber(point.record.weightKg, locale)}</text></g>)}</svg><div><span>{recent[0] && formatDate(recent[0].date, locale)}</span><span>{recent.at(-1) && formatDate(recent.at(-1)!.date, locale)}</span></div></div>
      <div className="growth-history">{[...sorted].reverse().slice(0, 5).map((record) => <article key={record.id}><time>{formatDate(record.date, locale)}</time><b>{formatWeight(record.weightKg, locale)}</b><span>{measurementText(record)}</span><button aria-label={t('deleteGrowthRecord')} onClick={() => void onDelete(record)}>×</button></article>)}</div></> : <div className="growth-empty"><i>↗</i><b>{t('growthEmptyTitle')}</b><p>{t('growthEmptyBody')}</p></div>}
    {editing && <div className="sheet-backdrop"><section className="editor-sheet"><header><div><span>LOCAL GROWTH RECORD</span><h2>{t('growthAddTitle')}</h2></div><button className="close" aria-label={t('close')} onClick={() => setEditing(false)}>×</button></header><form action={submit}><div className="two-fields"><label>{t('dateLabel')}<input type="date" name="date" defaultValue={localDateKey()} required /></label><label>{t('growthWeightKg')}<input type="number" name="weightKg" min="0.01" step="0.01" required placeholder={t('growthWeightExample')} /></label></div><div className="growth-fields"><label>{t('growthBodyLength')}<input type="number" name="bodyLengthCm" min="0" step="0.1" /></label><label>{t('growthChest')}<input type="number" name="chestCm" min="0" step="0.1" /></label><label>{t('growthNeck')}<input type="number" name="neckCm" min="0" step="0.1" /></label></div><label>{t('notesLabel')}<textarea name="note" placeholder={t('growthNotesExample')} /></label><div className="privacy-note">🔒 {t('growthPrivacy')}</div><button className="save-reminder" disabled={saving}>{saving ? t('saving') : t('growthSave')}</button></form></section></div>}
  </section>
}

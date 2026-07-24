import { useState } from 'react'
import type { CareReminder, ChecklistItem } from './domain'

type Props = { reminder: CareReminder; onClose: () => void; onSave: (reminder: CareReminder) => Promise<void> }

export default function VetVisitPanel({ reminder, onClose, onSave }: Props) {
  const [preparationItems, setPreparationItems] = useState(reminder.vetVisit?.preparationItems || [])
  const [questions, setQuestions] = useState(reminder.vetVisit?.questions || [])
  const [diagnosis, setDiagnosis] = useState(reminder.vetVisit?.diagnosis || '')
  const [instructions, setInstructions] = useState(reminder.vetVisit?.instructions || '')
  const [prescription, setPrescription] = useState(reminder.vetVisit?.prescription || '')
  const [nextVisitDate, setNextVisitDate] = useState(reminder.vetVisit?.nextVisitDate || '')
  const [saving, setSaving] = useState(false)

  const toggle = (items: ChecklistItem[], setItems: (items: ChecklistItem[]) => void, id: string) => setItems(items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  async function save() {
    setSaving(true)
    await onSave({ ...reminder, vetVisit: { preparationItems, questions, diagnosis, instructions, prescription, nextVisitDate, updatedAt: Date.now() } })
    setSaving(false)
  }

  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><section className="editor-sheet vet-panel" role="dialog" aria-modal="true"><header><div><span>OFFLINE VET VISIT</span><h2>{reminder.title}</h2></div><button className="close" onClick={onClose}>×</button></header>
    <div className="visit-date"><i>✚</i><span><b>{reminder.startDate}・{reminder.time}</b><small>看診資料只保存在這台裝置</small></span></div>
    <section><h3>看診前準備</h3>{preparationItems.length ? <div className="visit-checklist">{preparationItems.map((item) => <label key={item.id} className={item.completed ? 'checked' : ''}><input type="checkbox" checked={item.completed} onChange={() => toggle(preparationItems, setPreparationItems, item.id)} /><span>{item.text}</span></label>)}</div> : <p className="visit-empty">尚未建立準備項目</p>}</section>
    <section><h3>要問醫師的問題</h3>{questions.length ? <div className="visit-checklist questions">{questions.map((item) => <label key={item.id} className={item.completed ? 'checked' : ''}><input type="checkbox" checked={item.completed} onChange={() => toggle(questions, setQuestions, item.id)} /><span>{item.text}</span></label>)}</div> : <p className="visit-empty">尚未建立問題</p>}</section>
    <section className="post-visit"><h3>看診後紀錄</h3><label>診斷／檢查結果<textarea value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="例如：檢查結果、體重、醫師判斷……" /></label><label>醫師交代事項<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="飲食、休息、觀察重點……" /></label><label>處方與用藥<textarea value={prescription} onChange={(event) => setPrescription(event.target.value)} placeholder="藥名、劑量、天數……" /></label><label>下次回診日期<input type="date" value={nextVisitDate} onChange={(event) => setNextVisitDate(event.target.value)} /></label></section>
    <button className="save-reminder" onClick={() => void save()} disabled={saving}>{saving ? '正在保存…' : '保存看診紀錄'}</button>
  </section></div>
}

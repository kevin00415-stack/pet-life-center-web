import type { CareReminder, GrowthRecord, Pet } from './domain'
import { buildHealthTimeline, kindLabels, repeatLabels } from './domain'

type VetReportInput = {
  pet: Pet
  reminders: CareReminder[]
  growthRecords: GrowthRecord[]
  generatedAt?: Date
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[character] || character))

const displayText = (value?: string) => value?.trim() ? escapeHtml(value.trim()).replace(/\n/g, '<br>') : '—'
const statusLabels = { completed: '已完成', late: '已補做', skipped: '本次略過', scheduled: '預定', recorded: '已有紀錄' }

const reportStyles = `
  :root{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",Arial,sans-serif;color:#263b37;background:#eef3f1}
  *{box-sizing:border-box}body{margin:0}.toolbar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 18px;background:#173f3b;color:#fff}
  .toolbar p{margin:0;font-size:14px}.toolbar button{border:0;border-radius:10px;padding:10px 16px;background:#fff;color:#173f3b;font-weight:800}
  main{width:min(100%,210mm);min-height:297mm;margin:18px auto;padding:16mm;background:#fff;box-shadow:0 12px 35px rgba(24,59,54,.12)}
  header{border-bottom:3px solid #6f91a7;padding-bottom:14px}h1{margin:0;font-size:28px;color:#173f3b}header p{margin:6px 0 0;color:#5e746f;font-size:13px}
  .notice{margin:16px 0;padding:11px 13px;border-left:4px solid #d3a665;background:#fff8ec;font-size:12px;line-height:1.65}
  section{break-inside:avoid;margin-top:20px}h2{margin:0 0 9px;font-size:18px;color:#284e48}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .fact{border:1px solid #dce7e4;border-radius:10px;padding:10px}.fact b,.fact span{display:block}.fact b{font-size:11px;color:#6d817c}.fact span{margin-top:3px;font-size:14px}
  table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.5}th,td{border:1px solid #dce7e4;padding:7px 8px;text-align:left;vertical-align:top}th{background:#edf5f2;color:#315f58}
  .empty{padding:12px;border:1px dashed #c9d9d5;border-radius:10px;color:#71847f;font-size:12px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #dce7e4;color:#73847f;font-size:10px}
  @page{size:A4;margin:12mm}@media print{body{background:#fff}.toolbar{display:none}main{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}section{break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid}}
`

export function buildVetReportHtml({ pet, reminders, growthRecords, generatedAt = new Date() }: VetReportInput) {
  const petReminders = reminders.filter((reminder) => reminder.petId === pet.id)
  const medications = petReminders.filter((reminder) => reminder.kind === 'medication' && reminder.enabled)
  const visits = petReminders.filter((reminder) => reminder.kind === 'vet' && reminder.vetVisit?.updatedAt).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const growth = growthRecords.filter((record) => record.petId === pet.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
  const timeline = buildHealthTimeline(petReminders, pet.id, generatedAt).slice(0, 100)
  const dateTime = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'long', timeStyle: 'short' }).format(generatedAt)
  const schedule = (reminder: CareReminder) => `${repeatLabels[reminder.repeat]}・${(reminder.dailyTimes.length ? reminder.dailyTimes : [reminder.time]).join('、')}`
  const tableRows = <T,>(items: T[], render: (item: T) => string, columns: number) =>
    items.length ? items.map(render).join('') : `<tr><td colspan="${columns}">目前沒有紀錄</td></tr>`

  return `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pet.name)}－獸醫照護摘要</title><style>${reportStyles}</style></head>
<body>
  <div class="toolbar"><p>請在系統列印畫面選擇「儲存為 PDF」，或使用分享功能傳給獸醫院。</p><button type="button" onclick="window.print()">儲存／分享 PDF</button></div>
  <main>
    <header><h1>${escapeHtml(pet.name)}－獸醫照護摘要</h1><p>毛孩一生・產生時間：${escapeHtml(dateTime)}</p></header>
    <div class="notice">此文件整理自飼主自行輸入的生活與照護紀錄，可能不完整，也不代表獸醫診斷、處方或醫療建議。請由合格獸醫依實際檢查判斷。</div>
    <section><h2>基本資料</h2><div class="grid">
      <div class="fact"><b>名字</b><span>${escapeHtml(pet.name)}</span></div>
      <div class="fact"><b>物種</b><span>${escapeHtml(pet.species === 'cat' ? '貓' : pet.species === 'dog' ? '狗' : pet.species || '未填寫')}</span></div>
      <div class="fact"><b>生日</b><span>${escapeHtml(pet.birthDate || '未填寫')}</span></div>
      <div class="fact"><b>最近體重</b><span>${growth[0] ? `${escapeHtml(growth[0].weightKg)} kg（${escapeHtml(growth[0].date)}）` : '尚無紀錄'}</span></div>
    </div></section>
    <section><h2>目前服藥提醒</h2><table><thead><tr><th>藥品／項目</th><th>劑量與備註</th><th>時間</th></tr></thead><tbody>${tableRows(medications, (reminder) => `<tr><td>${escapeHtml(reminder.title)}</td><td>${displayText(reminder.dose || reminder.details)}</td><td>${escapeHtml(schedule(reminder))}</td></tr>`, 3)}</tbody></table></section>
    <section><h2>最近看診紀錄</h2><table><thead><tr><th>日期／項目</th><th>檢查或診斷紀錄</th><th>醫囑／處方／回診</th></tr></thead><tbody>${tableRows(visits.slice(0, 10), (reminder) => `<tr><td>${escapeHtml(reminder.startDate)}<br>${escapeHtml(reminder.title)}</td><td>${displayText(reminder.vetVisit?.diagnosis)}</td><td>${displayText([reminder.vetVisit?.instructions, reminder.vetVisit?.prescription, reminder.vetVisit?.nextVisitDate && `下次回診：${reminder.vetVisit.nextVisitDate}`].filter(Boolean).join('\n'))}</td></tr>`, 3)}</tbody></table></section>
    <section><h2>成長與體重（最近 12 筆）</h2><table><thead><tr><th>日期</th><th>體重</th><th>身長／胸圍／頸圍</th><th>備註</th></tr></thead><tbody>${tableRows(growth, (record) => `<tr><td>${escapeHtml(record.date)}</td><td>${escapeHtml(record.weightKg)} kg</td><td>${displayText([record.bodyLengthCm && `身長 ${record.bodyLengthCm} cm`, record.chestCm && `胸圍 ${record.chestCm} cm`, record.neckCm && `頸圍 ${record.neckCm} cm`].filter(Boolean).join('・'))}</td><td>${displayText(record.note)}</td></tr>`, 4)}</tbody></table></section>
    <section><h2>健康時間軸（最近 100 筆）</h2><table><thead><tr><th>日期時間</th><th>類型</th><th>項目</th><th>內容</th><th>狀態</th></tr></thead><tbody>${tableRows(timeline, (event) => `<tr><td>${escapeHtml(event.date.toLocaleString('zh-TW'))}</td><td>${escapeHtml(kindLabels[event.kind])}</td><td>${escapeHtml(event.title)}</td><td>${displayText(event.details)}</td><td>${escapeHtml(statusLabels[event.status])}</td></tr>`, 5)}</tbody></table></section>
    <p class="footer">本摘要只在目前裝置產生，不會自動上傳。完整 JSON 備份包含照片與錄音，僅供「毛孩一生」App 恢復資料，不建議直接傳給醫院。</p>
  </main>
</body></html>`
}

export function openVetReport(input: VetReportInput) {
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) return false
  reportWindow.opener = null
  reportWindow.document.open()
  reportWindow.document.write(buildVetReportHtml(input))
  reportWindow.document.close()
  window.setTimeout(() => {
    reportWindow.focus()
    reportWindow.print()
  }, 450)
  return true
}

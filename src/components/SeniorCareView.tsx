import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Calendar,
  Warning,
} from '@phosphor-icons/react'
import type { Pet, CareReminder } from '../domain'
import { localDateKey } from '../domain'

interface SeniorCareViewProps {
  pet?: Pet
  todayMedication: { reminder: CareReminder; occurrence: Date; status: string }[]
  recordOccurrence: (reminder: CareReminder, occurrence: Date, status: 'completed' | 'late' | 'skipped') => Promise<void>
  onBack: () => void
}

interface DailyObservation {
  appetite: 'good' | 'normal' | 'attention'
  water: 'good' | 'normal' | 'attention'
  energy: 'good' | 'normal' | 'attention'
  walking: 'good' | 'normal' | 'attention'
  sleep: 'good' | 'normal' | 'attention'
  urination: 'good' | 'normal' | 'attention'
  defecation: 'good' | 'normal' | 'attention'
  breathing: 'good' | 'normal' | 'attention'
  vomiting: 'good' | 'normal' | 'attention'
  pain: 'good' | 'normal' | 'attention'
  notes: string
  medsStatus: Record<string, 'completed' | 'skipped' | 'pending'>
  savedAt?: number
}

export default function SeniorCareView({
  pet,
  todayMedication,
  recordOccurrence,
  onBack,
}: SeniorCareViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return localDateKey()
  })

  // State for the current day's observation
  const [observation, setObservation] = useState<DailyObservation>({
    appetite: 'normal',
    water: 'normal',
    energy: 'normal',
    walking: 'normal',
    sleep: 'normal',
    urination: 'normal',
    defecation: 'normal',
    breathing: 'normal',
    vomiting: 'normal',
    pain: 'normal',
    notes: '',
    medsStatus: {},
  })

  // Storage key is pet-specific to ensure data isolation
  const storageKey = pet ? `maohai-senior-care-${pet.id}` : ''

  const [history, setHistory] = useState<Record<string, DailyObservation>>(() => {
    if (!storageKey) return {}
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse senior care history', e)
      }
    }
    return {}
  })
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)

  // Sync state if storageKey changes (e.g. pet switches)
  useEffect(() => {
    if (!storageKey) {
      setHistory({})
      return
    }
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse senior care history', e)
      }
    } else {
      setHistory({})
    }
  }, [storageKey])

  // Update current observation when date or history changes
  useEffect(() => {
    if (history[selectedDate]) {
      setObservation(history[selectedDate])
    } else {
      // Default observation values for a blank day
      // Initialize medication statuses for today from standard state
      const initialMeds: Record<string, 'completed' | 'skipped' | 'pending'> = {}
      todayMedication.forEach((item) => {
        const key = item.reminder.id + '-' + item.occurrence.toISOString()
        initialMeds[key] = item.status === 'completed' || item.status === 'late'
          ? 'completed'
          : item.status === 'skipped'
            ? 'skipped'
            : 'pending'
      })

      setObservation({
        appetite: 'normal',
        water: 'normal',
        energy: 'normal',
        walking: 'normal',
        sleep: 'normal',
        urination: 'normal',
        defecation: 'normal',
        breathing: 'normal',
        vomiting: 'normal',
        pain: 'normal',
        notes: '',
        medsStatus: initialMeds,
      })
    }
  }, [selectedDate, history, todayMedication])

  const handleRatingChange = (field: keyof Omit<DailyObservation, 'notes' | 'medsStatus'>, value: 'good' | 'normal' | 'attention') => {
    setObservation((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObservation((prev) => ({
      ...prev,
      notes: e.target.value,
    }))
  }

  const handleMedToggle = async (reminder: CareReminder, occurrence: Date, status: 'completed' | 'skipped' | 'pending') => {
    const key = reminder.id + '-' + occurrence.toISOString()

    // Update local observation state
    setObservation((prev) => ({
      ...prev,
      medsStatus: {
        ...prev.medsStatus,
        [key]: status,
      },
    }))

    // Propagate occurrence record to standard database if marked completed or skipped
    if (status === 'completed') {
      await recordOccurrence(reminder, occurrence, 'completed')
    } else if (status === 'skipped') {
      await recordOccurrence(reminder, occurrence, 'skipped')
    }
  }

  const saveTodayRecord = () => {
    if (!storageKey) return
    const updatedHistory = {
      ...history,
      [selectedDate]: {
        ...observation,
        savedAt: Date.now()
      },
    }
    setHistory(updatedHistory)
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory))
    alert('高齡生理觀察紀錄已保存')
  }

  // Count "Needs Attention" fields
  const attentionFields = [
    'appetite',
    'water',
    'energy',
    'walking',
    'sleep',
    'urination',
    'defecation',
    'breathing',
    'vomiting',
    'pain',
  ].filter((field) => observation[field as keyof DailyObservation] === 'attention')

  const needsWarning = attentionFields.length >= 2

  // Sort dates descending for timeline
  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a))

  const metricsList = [
    { key: 'appetite', label: '食慾狀況' },
    { key: 'water', label: '每日飲水' },
    { key: 'energy', label: '精神活力' },
    { key: 'walking', label: '行走能力' },
    { key: 'sleep', label: '睡眠品質' },
    { key: 'urination', label: '排尿狀況' },
    { key: 'defecation', label: '排便狀況' },
    { key: 'breathing', label: '呼吸頻率' },
    { key: 'vomiting', label: '嘔吐噁心' },
    { key: 'pain', label: '疼痛觀察' },
  ] as const

  const getMedTitleFromKey = (key: string) => {
    const reminderId = key.split('-')[0]
    const match = todayMedication.find(m => m.reminder.id === reminderId)
    if (match) {
      return match.reminder.title
    }
    return `提醒項目 (${reminderId})`
  }

  return (
    <div className="senior-care-container" style={{ padding: '16px', paddingBottom: '90px', background: '#fbf8f3', minHeight: '100vh', textAlign: 'left' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
          <ArrowLeft size={24} color="#173f3b" />
        </button>
        <div>
          <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>LIFE PASSPORT</span>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#173f3b', fontWeight: 'bold' }}>
            {pet?.name || '毛孩'}的高齡照護中心
          </h1>
        </div>
      </header>

      {/* Intro info box */}
      <div style={{ background: '#edf4f2', borderRadius: '14px', padding: '16px', marginBottom: '20px', color: '#2b4d45', fontSize: '14px', lineHeight: '1.6' }}>
        💡 <b>高齡照護宗旨：</b>幫助飼主每日細緻觀察老化徵兆，進行早期異變發現與溫馨照護。
        <div style={{ fontSize: '12px', color: '#5e746f', marginTop: '6px' }}>
          ⚠️ 本系統僅作日常觀察輔助，不可作為診斷工具，亦無法取代獸醫專業建議。
        </div>
      </div>

      {/* Date Selector */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="#d3a665" />
          <b style={{ fontSize: '15px', color: '#173f3b' }}>選擇觀察日期：</b>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #dce7e4', fontSize: '15px', color: '#173f3b', outline: 'none' }}
        />
      </div>

      {/* EMERGENCY OBSERVATION WARNING SHIELD */}
      {needsWarning && (
        <div style={{ background: '#fff5f5', border: '2px solid #e05a47', borderRadius: '16px', padding: '18px', marginBottom: '24px', display: 'flex', gap: '12px', boxShadow: '0 6px 16px rgba(224, 90, 71, 0.1)' }}>
          <Warning size={32} color="#e05a47" weight="fill" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#8c2416', fontWeight: 'bold' }}>
              🚨 重要照護警示
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6d1d11', lineHeight: '1.5' }}>
              「{pet?.name}」今天有 <b>{attentionFields.length}</b> 項指標被標記為<b>「需要留意」</b>。
              指標異常可能代表毛孩身體正感到不適或有早期健康異變。
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#e05a47', fontWeight: 'bold' }}>
              💡 建議：建議您盡快與您的獸醫診所聯絡，尋求專業健康檢查與醫療諮詢。
            </p>
          </div>
        </div>
      )}

      {/* 1. Daily Observation Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          1. 每日生理狀況觀察
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metricsList.map(({ key, label }) => {
            const currentVal = observation[key]
            return (
              <div
                key={key}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #f2e9dc',
                  boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#173f3b', marginBottom: '12px' }}>
                  {label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['good', 'normal', 'attention'] as const).map((option) => {
                    const isActive = currentVal === option
                    let activeBg = '#eef5f3'
                    let activeColor = '#173f3b'
                    let activeBorder = '#173f3b'
                    let labelText = '良好'

                    if (option === 'normal') {
                      labelText = '正常'
                      activeBg = '#fdf8f0'
                      activeColor = '#8c6020'
                      activeBorder = '#d3a665'
                    } else if (option === 'attention') {
                      labelText = '留意'
                      activeBg = '#fdf2f0'
                      activeColor = '#9e3224'
                      activeBorder = '#e05a47'
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleRatingChange(key, option)}
                        style={{
                          padding: '12px 6px',
                          borderRadius: '12px',
                          border: isActive ? `2px solid ${activeBorder}` : '1.5px solid #eef3f1',
                          background: isActive ? activeBg : '#fbfdfc',
                          color: isActive ? activeColor : '#5e746f',
                          fontWeight: isActive ? 'bold' : 'normal',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {labelText}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Care Notes Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          2. 每日照護備忘錄
        </h2>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)' }}>
          <textarea
            value={observation.notes}
            onChange={handleNotesChange}
            placeholder="例如：今天散步走得比較慢一些、咳嗽了兩次、早餐沒有完全吃完..."
            style={{
              width: '100%',
              minHeight: '100px',
              border: '1.5px solid #dce7e4',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '15px',
              color: '#263b37',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </section>

      {/* 3. Medication Tracking Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          3. 今日服藥進度
        </h2>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f2e9dc', boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)' }}>
          {todayMedication.length === 0 ? (
            <div style={{ color: '#5e746f', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>
              今天沒有需要服用的藥品提醒。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {todayMedication.map((item) => {
                const key = item.reminder.id + '-' + item.occurrence.toISOString()
                const currentStatus = observation.medsStatus[key] || 'pending'

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #f2e9dc', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#173f3b' }}>
                        {item.reminder.title}
                      </span>
                      <span style={{ fontSize: '12px', color: '#5e746f' }}>
                        🕒 {item.occurrence.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <button
                        onClick={() => handleMedToggle(item.reminder, item.occurrence, 'completed')}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '10px',
                          border: currentStatus === 'completed' ? '2px solid #173f3b' : '1px solid #dce7e4',
                          background: currentStatus === 'completed' ? '#eef5f3' : '#fff',
                          color: currentStatus === 'completed' ? '#173f3b' : '#5e746f',
                          fontWeight: currentStatus === 'completed' ? 'bold' : 'normal',
                          fontSize: '13px',
                        }}
                      >
                        已服用
                      </button>
                      <button
                        onClick={() => handleMedToggle(item.reminder, item.occurrence, 'skipped')}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '10px',
                          border: currentStatus === 'skipped' ? '2px solid #e05a47' : '1px solid #dce7e4',
                          background: currentStatus === 'skipped' ? '#fdf2f0' : '#fff',
                          color: currentStatus === 'skipped' ? '#e05a47' : '#5e746f',
                          fontWeight: currentStatus === 'skipped' ? 'bold' : 'normal',
                          fontSize: '13px',
                        }}
                      >
                        略過
                      </button>
                      <button
                        onClick={() => handleMedToggle(item.reminder, item.occurrence, 'pending')}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '10px',
                          border: currentStatus === 'pending' ? '2px solid #d3a665' : '1px solid #dce7e4',
                          background: currentStatus === 'pending' ? '#fdf8f0' : '#fff',
                          color: currentStatus === 'pending' ? '#8c6020' : '#5e746f',
                          fontWeight: currentStatus === 'pending' ? 'bold' : 'normal',
                          fontSize: '13px',
                        }}
                      >
                        待確認
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={saveTodayRecord}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          background: '#173f3b',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 18px rgba(23, 63, 59, 0.2)',
          marginBottom: '32px',
        }}
      >
        儲存今日生理狀況與照護記錄
      </button>

      {/* 5. Historical Timeline */}
      <section>
        <h2 style={{ fontSize: '18px', color: '#173f3b', marginBottom: '14px', borderLeft: '4px solid #d3a665', paddingLeft: '8px', fontWeight: 'bold' }}>
          5. 歷史狀況追蹤
        </h2>

        {sortedDates.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #f2e9dc', color: '#5e746f' }}>
            還沒有任何高齡照護歷史紀錄。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedDates.map((date) => {
              const hist = history[date]

              // Count ratings
              const attentionCount = Object.keys(hist).filter((k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && hist[k as keyof DailyObservation] === 'attention').length
              const goodCount = Object.keys(hist).filter((k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && hist[k as keyof DailyObservation] === 'good').length

              const isWarning = attentionCount >= 2

              return (
                <article
                  key={date}
                  onClick={() => setSelectedHistoryDate(date)}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f2e9dc',
                    boxShadow: '0 4px 12px rgba(111, 78, 55, 0.03)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <b style={{ fontSize: '15px', color: '#173f3b' }}>📅 {date}</b>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        background: isWarning ? '#fdf2f0' : '#eef5f3',
                        color: isWarning ? '#e05a47' : '#173f3b',
                      }}
                    >
                      {isWarning ? '⚠️ 需留意' : '良好'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#5e746f', marginBottom: '8px' }}>
                    <b>生理指標：</b>{goodCount} 項良好，{10 - goodCount - attentionCount} 項正常，{attentionCount} 項需留意
                  </div>

                  {hist.notes && (
                    <div style={{ fontSize: '13px', color: '#263b37', background: '#fdfaf5', padding: '10px', borderRadius: '10px', borderLeft: '3px solid #d3a665' }}>
                      💬 {hist.notes}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* READ-ONLY DETAIL MODAL OVERLAY */}
      {selectedHistoryDate && history[selectedHistoryDate] && (() => {
        const hist = history[selectedHistoryDate]

        // Count ratings in hist
        const attentionCount = Object.keys(hist).filter((k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && hist[k as keyof DailyObservation] === 'attention').length
        const goodCount = Object.keys(hist).filter((k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && hist[k as keyof DailyObservation] === 'good').length
        const normalCount = 10 - attentionCount - goodCount

        const savedTimestampStr = hist.savedAt
          ? new Date(hist.savedAt).toLocaleString('zh-TW')
          : `${selectedHistoryDate} (當日紀錄)`

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(23, 63, 59, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(23, 63, 59, 0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Modal Header */}
              <header style={{
                padding: '20px',
                borderBottom: '1px solid #f2e9dc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fbf8f3',
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#d3a665', fontWeight: 'bold' }}>歷史照護詳情</span>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#173f3b', fontWeight: 'bold' }}>
                    📅 {selectedHistoryDate}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedHistoryDate(null)}
                  style={{
                    background: '#f2e9dc',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    color: '#173f3b',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </header>

              {/* Modal Content */}
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Summary Box */}
                <div style={{
                  background: '#edf4f2',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#173f3b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div><b>保存時間：</b>{savedTimestampStr}</div>
                  <div><b>指標狀態：</b>{goodCount} 項良好 / {normalCount} 項正常 / {attentionCount} 項需留意</div>
                </div>

                {/* 10 Metrics Status */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#173f3b', fontWeight: 'bold', borderLeft: '3px solid #d3a665', paddingLeft: '6px' }}>
                    生理指標
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {metricsList.map(({ key, label }) => {
                      const val = hist[key]
                      let statusColor = '#5e746f'
                      let statusText = '正常'
                      let statusBg = '#fbfdfc'

                      if (val === 'good') {
                        statusColor = '#173f3b'
                        statusBg = '#eef5f3'
                        statusText = '良好'
                      } else if (val === 'attention') {
                        statusColor = '#e05a47'
                        statusBg = '#fdf2f0'
                        statusText = '需要留意'
                      }

                      return (
                        <div key={key} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #f2e9dc',
                          background: '#fff',
                        }}>
                          <span style={{ fontSize: '14px', color: '#173f3b', fontWeight: '500' }}>{label}</span>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            backgroundColor: statusBg,
                            color: statusColor,
                          }}>
                            {statusText}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Care Notes */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#173f3b', fontWeight: 'bold', borderLeft: '3px solid #d3a665', paddingLeft: '6px' }}>
                    照護備忘錄
                  </h4>
                  <div style={{
                    background: '#fdfaf5',
                    border: '1px solid #f2e9dc',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    color: '#263b37',
                    lineHeight: '1.5',
                    minHeight: '40px',
                  }}>
                    {hist.notes || '（無備忘錄內容）'}
                  </div>
                </div>

                {/* Medication tracking */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#173f3b', fontWeight: 'bold', borderLeft: '3px solid #d3a665', paddingLeft: '6px' }}>
                    服藥進度
                  </h4>
                  <div style={{
                    background: '#fff',
                    border: '1px solid #f2e9dc',
                    borderRadius: '12px',
                    padding: '12px',
                  }}>
                    {!hist.medsStatus || Object.keys(hist.medsStatus).length === 0 ? (
                      <div style={{ color: '#5e746f', fontSize: '13px', textAlign: 'center' }}>
                        此紀錄無服藥提醒狀態。
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(hist.medsStatus).map(([mKey, mStatus]) => {
                          const title = getMedTitleFromKey(mKey)
                          let statusLabel = '待確認'
                          let badgeBg = '#fdf8f0'
                          let badgeColor = '#8c6020'

                          if (mStatus === 'completed') {
                            statusLabel = '已服用'
                            badgeBg = '#eef5f3'
                            badgeColor = '#173f3b'
                          } else if (mStatus === 'skipped') {
                            statusLabel = '略過'
                            badgeBg = '#fdf2f0'
                            badgeColor = '#e05a47'
                          }

                          return (
                            <div key={mKey} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '13px',
                              paddingBottom: '4px',
                              borderBottom: '1px solid #fbf8f3',
                            }}>
                              <span style={{ color: '#173f3b' }}>{title}</span>
                              <span style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}>
                                {statusLabel}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <footer style={{
                padding: '16px 20px',
                borderTop: '1px solid #f2e9dc',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#fbf8f3',
              }}>
                <button
                  onClick={() => {
                    const confirmLoad = window.confirm('確定要載入此日資料進行編輯嗎？這將會覆蓋當前編輯中的表單。')
                    if (confirmLoad) {
                      // Set the current form date to this history record date
                      setSelectedDate(selectedHistoryDate)
                      // Set current observation to this history record's observation
                      setObservation(hist)
                      // Close modal
                      setSelectedHistoryDate(null)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#173f3b',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  載入此日資料進行編輯
                </button>
                <button
                  onClick={() => setSelectedHistoryDate(null)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#f2e9dc',
                    color: '#173f3b',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  返回列表
                </button>
              </footer>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

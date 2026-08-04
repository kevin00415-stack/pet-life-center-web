import type { CareReminder, GrowthRecord, MemoryEntry, Pet } from '../domain'
import type { TimelineEmotionCategory } from './TimelineMessageService'

export interface UnifiedTimelineEvent {
  id: string
  petId: string
  timestamp: number
  category: TimelineEmotionCategory | string
  title: string
  subtitle: string
  description: string
  thumbnail?: string
  attachmentIds: string[]
  sourceType: 'pet' | 'reminder' | 'growth' | 'senior-care' | 'health' | 'memory' | 'comparison'
  sourceId: string
  importance: 'normal' | 'high'
  emotionType: TimelineEmotionCategory
}

export class TimelineAggregationService {
  /**
   * Automatically aggregates all important life events for a single pet into a single unified chronological list.
   */
  aggregateEvents(params: {
    pet?: Pet
    reminders: CareReminder[]
    growthRecords: GrowthRecord[]
    memories: MemoryEntry[]
    abnormalEvents?: any[]
    visualComparisons?: any[]
    seniorCareHistory?: Record<string, any>
  }): UnifiedTimelineEvent[] {
    const events: UnifiedTimelineEvent[] = []
    const pet = params.pet
    if (!pet) return []

    const petId = pet.id
    const petName = pet.name

    // 1. Pet Birthday & Homecoming Events (from Pet Profile)
    if (pet.birthDate) {
      const birth = new Date(pet.birthDate + 'T00:00:00')
      if (!isNaN(birth.getTime())) {
        // Birth Day itself (Homecoming proxy)
        events.push({
          id: `pet-homecoming-${petId}`,
          petId,
          timestamp: birth.getTime(),
          category: 'Homecoming',
          title: `🏡 迎接 ${petName} 回家`,
          subtitle: '第一天開啟溫馨的陪伴之旅',
          description: '帶回家悉心呵護的那一天，生活開始變得無比溫暖。',
          attachmentIds: [],
          sourceType: 'pet',
          sourceId: petId,
          importance: 'high',
          emotionType: 'Homecoming',
        })

        // Birthday Anniversaries up to current year
        const currentYear = new Date().getFullYear()
        const birthYear = birth.getFullYear()
        for (let year = birthYear; year <= currentYear + 1; year++) {
          const birthdayOfOffset = new Date(year, birth.getMonth(), birth.getDate())
          if (birthdayOfOffset.getTime() <= Date.now() && birthdayOfOffset.getTime() >= birth.getTime()) {
            const age = year - birthYear
            events.push({
              id: `pet-birthday-${year}-${petId}`,
              petId,
              timestamp: birthdayOfOffset.getTime(),
              category: 'Birthday',
              title: age === 0 ? `🎂 ${petName} 誕生紀念日` : `🎂 ${petName} 的 ${age} 歲生日快樂！`,
              subtitle: '慶祝陪伴的又一個歲月里程碑',
              description: age === 0 ? '迎來最可愛的小生命。' : `感謝有你一直陪伴在身邊，願你健康快樂。`,
              attachmentIds: [],
              sourceType: 'pet',
              sourceId: petId,
              importance: 'high',
              emotionType: 'Birthday',
            })
          }
        }
      }
    }

    // 2. Memory / Diary Records
    const petMemories = params.memories.filter((m) => m.petId === petId)
    petMemories.forEach((mem) => {
      // Clean structure for note
      let cleanNote = mem.note || ''
      if (cleanNote.includes('--- DAILY JOURNAL STATS ---')) {
        const marker = '-------------------------'
        const idx = cleanNote.indexOf(marker)
        if (idx !== -1) {
          cleanNote = cleanNote.substring(idx + marker.length).trim()
        }
      }

      const hasPhotos = mem.photos && mem.photos.length > 0
      const hasVideos = mem.videos && mem.videos.length > 0
      const category: TimelineEmotionCategory = hasVideos
        ? 'FavoriteVideo'
        : hasPhotos
        ? 'FavoritePhoto'
        : 'Diary'

      events.push({
        id: `memory-diary-${mem.id}`,
        petId,
        timestamp: mem.createdAt || new Date(mem.date + 'T12:00:00').getTime(),
        category,
        title: mem.title || '今日生活日記',
        subtitle: `心情：${mem.mood || '開心'}`,
        description: cleanNote || '用愛記錄下的點滴陪伴回憶。',
        attachmentIds: [
          ...(mem.photos || []).map((p) => p.id),
          ...(mem.videos || []).map((v) => v.id),
        ],
        sourceType: 'memory',
        sourceId: mem.id,
        importance: hasPhotos || hasVideos ? 'high' : 'normal',
        emotionType: category,
      })
    })

    // 3. Growth / Weight Tracker Records
    const petGrowth = params.growthRecords.filter((g) => g.petId === petId)
    petGrowth.forEach((grow) => {
      events.push({
        id: `growth-weight-${grow.id}`,
        petId,
        timestamp: grow.createdAt || new Date(grow.date + 'T12:00:00').getTime(),
        category: 'Weight',
        title: `⚖️ ${petName} 體重記錄：${grow.weightKg} kg`,
        subtitle: grow.note ? `備註：${grow.note}` : '關注體重成長指標',
        description: `定期記錄體重是守護高齡與一般貓狗健康的最好習慣。`,
        attachmentIds: [],
        sourceType: 'growth',
        sourceId: grow.id,
        importance: 'normal',
        emotionType: 'Weight',
      })
    })

    // 4. Abnormal Health Events (from Guardian Event Center / localStorage)
    const activeAbnormal = params.abnormalEvents || []
    activeAbnormal.forEach((ev) => {
      const categoryLabels: Record<string, string> = {
        seizure: '癲癇/抽搐 (Seizure)',
        vomiting: '嘔吐/噁心 (Vomiting)',
        diarrhea: '拉肚子/腹瀉 (Diarrhea)',
        injury: '外傷/受傷 (Injury)',
        walking: '走路異常 (Abnormal Walking)',
        breathing: '呼吸急促/困難 (Breathing)',
        appetite: '食慾不振 (Appetite Loss)',
        other: '其他異常 (Other)',
      }

      events.push({
        id: `abnormal-event-${ev.id}`,
        petId,
        timestamp: ev.timestamp,
        category: 'HealthEvent',
        title: `🚨 健康警告：${categoryLabels[ev.category] || '生理異常'}`,
        subtitle: ev.notes || '發現突發健康狀況',
        description: `突發或持續的異常行為是重要警訊。若情況加劇請務必諮詢診所獸醫師診治。`,
        attachmentIds: [],
        sourceType: 'health',
        sourceId: ev.id,
        importance: 'high',
        emotionType: 'HealthEvent',
      })
    })

    // 5. Senior Care Center Observation Logs
    const seniorHist = params.seniorCareHistory || {}
    Object.entries(seniorHist).forEach(([dateStr, obs]: [string, any]) => {
      const timestamp = obs.savedAt || new Date(dateStr + 'T12:00:00').getTime()

      // Compute counts of 'attention'
      const attentionCount = Object.keys(obs).filter(
        (k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && obs[k] === 'attention'
      ).length

      events.push({
        id: `senior-care-${dateStr}`,
        petId,
        timestamp,
        category: 'SeniorCare',
        title: `🧓 高齡觀察日誌`,
        subtitle: attentionCount > 0 ? `⚠️ 有 ${attentionCount} 項指標需要特別留意` : '✓ 身體指標穩定',
        description: obs.notes || '完成例行生理指標狀況觀測紀錄。',
        attachmentIds: [],
        sourceType: 'senior-care',
        sourceId: dateStr,
        importance: attentionCount >= 2 ? 'high' : 'normal',
        emotionType: 'SeniorCare',
      })
    })

    // 6. Care Reminders (Completed / Missed)
    const petReminders = params.reminders.filter((r) => r.petId === petId)
    petReminders.forEach((rem) => {
      // Completed reminders in database
      const completedSet = new Set<string>()

      rem.occurrenceRecords?.forEach((rec) => {
        const timePart = rec.key.substring(rec.key.indexOf(':') + 1)
        const date = new Date(timePart)
        if (!isNaN(date.getTime())) {
          completedSet.add(rec.key)

          const isCompleted = rec.status === 'completed' || rec.status === 'late'
          const emotion: TimelineEmotionCategory = isCompleted ? 'ReminderCompleted' : 'ReminderMissed'
          const cat: TimelineEmotionCategory = rem.kind === 'medication' ? 'Medication' : rem.kind === 'vaccine' ? 'Vaccination' : emotion

          events.push({
            id: `reminder-occ-${rec.key}-${rec.status}`,
            petId,
            timestamp: date.getTime(),
            category: cat,
            title: isCompleted ? `✓ 已完成：${rem.title}` : `❌ 略過：${rem.title}`,
            subtitle: rem.dose || rem.details || '日常照護執行紀錄',
            description: isCompleted ? '感謝你的細心守護，毛孩正享受著最周全的照顧。' : '偶爾的調整沒關係，請持續關注日常提醒。',
            attachmentIds: rem.voiceClipId ? [rem.voiceClipId] : [],
            sourceType: 'reminder',
            sourceId: rem.id,
            importance: rem.kind === 'medication' || rem.kind === 'vaccine' ? 'high' : 'normal',
            emotionType: emotion,
          })
        }
      })

      rem.completedOccurrences.forEach((key) => {
        if (completedSet.has(key)) return
        const timePart = key.substring(key.indexOf(':') + 1)
        const date = new Date(timePart)
        if (!isNaN(date.getTime())) {
          const cat: TimelineEmotionCategory = rem.kind === 'medication' ? 'Medication' : rem.kind === 'vaccine' ? 'Vaccination' : 'ReminderCompleted'

          events.push({
            id: `reminder-occ-${key}-completed`,
            petId,
            timestamp: date.getTime(),
            category: cat,
            title: `✓ 已完成：${rem.title}`,
            subtitle: rem.dose || rem.details || '日常照護執行紀錄',
            description: '感謝你的細心守護，毛孩正享受著最周全的照顧。',
            attachmentIds: rem.voiceClipId ? [rem.voiceClipId] : [],
            sourceType: 'reminder',
            sourceId: rem.id,
            importance: rem.kind === 'medication' || rem.kind === 'vaccine' ? 'high' : 'normal',
            emotionType: 'ReminderCompleted',
          })
        }
      })
    })

    // 7. Visual Comparisons (from localStorage)
    const visualComps = params.visualComparisons || []
    visualComps.forEach((comp) => {
      const compCategories: Record<string, string> = {
        gait: '步態',
        spirit: '精神狀態',
        skin: '皮膚',
        wound: '傷口',
        body: '體態',
        eating: '進食動作',
        seizure: '抽搐／發作',
        breathing: '呼吸狀態',
        other: '其他',
      }
      const label = compCategories[comp.category] || '其他'

      events.push({
        id: `visual-comparison-timeline-${comp.id}`,
        petId,
        timestamp: comp.createdAt,
        category: 'FavoritePhoto',
        title: `🔍 視覺前後對比：${label}`,
        subtitle: '過去 vs 現在 狀態詳細比較',
        description: comp.note || '透過視覺影像觀察細微的身體生理狀態變化。',
        attachmentIds: [comp.leftAttachmentId, comp.rightAttachmentId].filter(Boolean),
        sourceType: 'comparison',
        sourceId: comp.id,
        importance: 'normal',
        emotionType: 'FavoritePhoto',
      })
    })

    // Sort chronologically: Newest first
    return events.sort((a, b) => b.timestamp - a.timestamp)
  }
}

export const timelineAggregationService = new TimelineAggregationService()
export type { TimelineEmotionCategory }

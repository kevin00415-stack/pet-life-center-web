import type { PetInsight, InsightType, InsightPriority } from './InsightTypes'

export class InsightModel implements PetInsight {
  readonly id: string
  readonly petId: string
  readonly createdAt: number
  readonly type: InsightType
  readonly priority: InsightPriority
  readonly title: string
  readonly summary: string
  readonly supportingObservationIds: string[]
  readonly supportingContextIds: string[]
  readonly supportingTimelineIds: string[]
  readonly metadata: Record<string, any>
  readonly confidenceLevel: 'low' | 'medium' | 'high'

  constructor(data: PetInsight) {
    this.id = data.id
    this.petId = data.petId
    this.createdAt = data.createdAt
    this.type = data.type
    this.priority = data.priority || 'normal'
    this.title = data.title
    this.summary = data.summary
    this.supportingObservationIds = [...(data.supportingObservationIds || [])]
    this.supportingContextIds = [...(data.supportingContextIds || [])]
    this.supportingTimelineIds = [...(data.supportingTimelineIds || [])]
    this.metadata = { ...data.metadata }
    this.confidenceLevel = data.confidenceLevel || 'medium'
  }

  /**
   * Factory constructor for consecutive care streak insights safely.
   */
  static createConsecutiveCare(petId: string, days: number, observationIds: string[]): InsightModel {
    return new InsightModel({
      id: `ins-consecutive-${petId}-${Date.now()}`,
      petId,
      createdAt: Date.now(),
      type: 'consecutive-care',
      priority: days >= 5 ? 'medium' : 'normal',
      title: '🌟 完美的照護小確幸！',
      summary: `你已經連續 ${days} 天為寶貝完成了貼心生理觀察與日常護理囉。這樣溫柔的陪伴，是毛孩最幸福的守護！`,
      supportingObservationIds: observationIds,
      supportingContextIds: [],
      supportingTimelineIds: [],
      metadata: { consecutiveDays: days },
      confidenceLevel: 'high',
    })
  }

  /**
   * Factory constructor for weight summary tracking safely.
   */
  static createWeightSummary(
    petId: string,
    direction: 'upward' | 'downward' | 'stable',
    changeKg: number,
    percentage: number,
    observationIds: string[]
  ): InsightModel {
    let title = '⚖️ 體重維持在穩定範圍'
    let summary = `寶貝的體重保持平穩。穩定的體型是高齡與一般貓狗最令人放心的指標之一！`

    if (direction === 'upward') {
      title = '📈 體重有些微成長'
      summary = `最新體重記錄呈現微幅上升（增加 ${changeKg.toFixed(2)} kg，約 +${percentage.toFixed(1)}%）。建議維持目前的優質餵食份量喔。`
    } else if (direction === 'downward') {
      title = '📉 體重呈現下降趨勢'
      summary = `最新體重記錄呈現微幅減少（減少 ${Math.abs(changeKg).toFixed(2)} kg，約 -${Math.abs(percentage).toFixed(1)}%）。可以多留意每日食慾與餵食狀況。`
    }

    return new InsightModel({
      id: `ins-weight-${petId}-${Date.now()}`,
      petId,
      createdAt: Date.now(),
      type: 'weight-summary',
      priority: 'normal',
      title,
      summary,
      supportingObservationIds: observationIds,
      supportingContextIds: [],
      supportingTimelineIds: [],
      metadata: { direction, changeKg, percentage },
      confidenceLevel: 'high',
    })
  }

  /**
   * Factory constructor for medication completion tracking safely.
   */
  static createMedicationCompletion(
    petId: string,
    rate: number,
    total: number,
    completed: number,
    observationIds: string[]
  ): InsightModel {
    const isPerfect = rate >= 95
    const title = isPerfect ? '💖 服藥守護超級完美！' : '💊 常規服藥與防護進度'
    const summary = isPerfect
      ? `本週的常規餵藥或保健防護完成率高達 100% 耶！你的細心照料，給予了寶貝最堅實的健康保護傘。`
      : `近期已排定的服藥提醒共 ${total} 次，已順利完成 ${completed} 次（完成率約 ${rate.toFixed(0)}%）。繼續保持溫和的餵藥步調喔。`

    return new InsightModel({
      id: `ins-med-completion-${petId}-${Date.now()}`,
      petId,
      createdAt: Date.now(),
      type: 'medication-completion',
      priority: isPerfect ? 'normal' : 'medium',
      title,
      summary,
      supportingObservationIds: observationIds,
      supportingContextIds: [],
      supportingTimelineIds: [],
      metadata: { rate, total, completed },
      confidenceLevel: 'high',
    })
  }

  /**
   * Plain JSON conversion.
   */
  toJSON(): PetInsight {
    return {
      id: this.id,
      petId: this.petId,
      createdAt: this.createdAt,
      type: this.type,
      priority: this.priority,
      title: this.title,
      summary: this.summary,
      supportingObservationIds: [...this.supportingObservationIds],
      supportingContextIds: [...this.supportingContextIds],
      supportingTimelineIds: [...this.supportingTimelineIds],
      metadata: { ...this.metadata },
      confidenceLevel: this.confidenceLevel,
    }
  }
}
export type { PetInsight, InsightType, InsightPriority }

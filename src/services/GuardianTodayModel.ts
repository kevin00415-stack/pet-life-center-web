import type { GuardianTodaySummary, TodayStatus, TodayCard, TodayAction } from './GuardianTodayTypes'

export class GuardianTodayModel implements GuardianTodaySummary {
  readonly petId: string
  readonly status: TodayStatus
  readonly streakDays: number
  readonly reassuranceMessage: string
  readonly cards: TodayCard[]
  readonly actions: TodayAction[]
  readonly metadata: Record<string, any>

  constructor(data: GuardianTodaySummary) {
    this.petId = data.petId
    this.status = data.status || 'UNKNOWN'
    this.streakDays = data.streakDays || 0
    this.reassuranceMessage = data.reassuranceMessage
    this.cards = [...(data.cards || [])]
    this.actions = [...(data.actions || [])]
    this.metadata = { ...data.metadata }
  }

  /**
   * Translates TodayStatus into beautiful, calming, anxiety-reducing Traditional Chinese status badges safely.
   */
  static getReassuranceMessage(status: TodayStatus, petName: string): string {
    switch (status) {
      case 'GREEN':
        return `✨ 太棒了！今天對 ${petName} 的所有細緻關懷都已經妥善完成了。今晚可以跟寶貝安心地靠在一起，度過安祥溫煦的時光。`
      case 'YELLOW':
        return `🕒 溫馨小提醒：今天還有幾項貼心的照護安排等待完成。讓我們用最溫柔的步調，一項項慢慢做完吧。`
      case 'RED':
        return `⏰ 守護叮嚀：有些預定的餵藥或日常照護提醒已經稍微有些逾期了。辛苦你囉，一有空就給寶貝溫和地補上吧！`
      default:
        return `🌟 歡迎開始新的一天：記錄下與 ${petName} 的第一次互動，這裡就會自動幫你寫下陪伴的點滴。`
    }
  }

  /**
   * Objective conversion back to a plain dictionary safely.
   */
  toJSON(): GuardianTodaySummary {
    return {
      petId: this.petId,
      status: this.status,
      streakDays: this.streakDays,
      reassuranceMessage: this.reassuranceMessage,
      cards: [...this.cards],
      actions: [...this.actions],
      metadata: { ...this.metadata },
    }
  }
}
export type { GuardianTodaySummary, TodayStatus, TodayCard, TodayAction }

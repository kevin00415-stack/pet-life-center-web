export type TimelineEmotionCategory =
  | 'Birthday'
  | 'NoRecords'
  | 'Homecoming'
  | 'Travel'
  | 'Park'
  | 'Grooming'
  | 'Diary'
  | 'FavoritePhoto'
  | 'FavoriteVideo'
  | 'Medication'
  | 'Weight'
  | 'Vaccination'
  | 'HealthEvent'
  | 'SeniorCare'
  | 'HospitalVisit'
  | 'BloodReport'
  | 'Surgery'
  | 'Boarding'
  | 'HomeCare'
  | 'GroomingVisit'
  | 'Transportation'
  | 'OwnerStory'
  | 'Milestone'
  | 'FavoriteMemory'
  | 'ReminderCompleted'
  | 'ReminderMissed'
  | 'BackupCreated'

const TEMPLATES: Record<TimelineEmotionCategory, string> = {
  Birthday: '今天是 {name} 的生日！感謝又陪伴了彼此度過美好溫馨的一年。🎂',
  NoRecords: '今天還沒有建立新的回憶。和 {name} 一起拍張照，留下今天的陪伴吧！📸',
  Homecoming: '這是我們旅程開始的第一天！{name} 正式加入這個溫馨的家。🏡',
  Travel: '和 {name} 一起探索新世界，留下快樂的探險足跡！🎒',
  Park: '在公園裡迎著風奔跑，{name} 的眼神中充滿了最純粹的快樂！🌳',
  Grooming: '今天整理得乾乾淨淨、漂漂亮亮！{name} 感覺神清氣爽。✨',
  Diary: '記錄下今天與 {name} 的生活點滴。每一天都是最珍貴的篇章。📝',
  FavoritePhoto: '精選最愛照片：捕捉到 {name} 超可愛的瞬間，融化了大家的心！💖',
  FavoriteVideo: '精選最愛影片：珍藏 {name} 最活潑逗趣的動態時刻。🎥',
  Medication: '守護健康：今日已確實為 {name} 進行服藥或藥物保健。💊',
  Weight: '成長足跡：記錄下 {name} 的最新體重。穩定成長就是最棒的事。⚖',
  Vaccination: '防護盾牌：{name} 今日順利完成疫苗接種，建立起最安心的健康保護！◇',
  HealthEvent: '安心監測：關注 {name} 的健康異變狀況，用心守護每一步。🚨',
  SeniorCare: '細緻關懷：今日已完成對 {name} 的高齡生理觀察與老化健康紀錄。🧓',
  HospitalVisit: '看診關懷：陪伴 {name} 前往獸醫診所檢查，專業守護更安心。🩺',
  BloodReport: '健康分析：完成血檢報告紀錄，精確掌握 {name} 的生理狀態。📊',
  Surgery: '手術關護：順利完成手術程序，願 {name} 快速恢復活力與健康。❤️',
  Boarding: '寄宿陪伴：為 {name} 安排安心寄宿，在溫馨環境中快樂度過。🏨',
  HomeCare: '居家到府照護：由專人進行溫馨到府陪伴，讓 {name} 在熟悉的家中保持舒適。🏠',
  GroomingVisit: '預約美容沙龍：{name} 出發去享受頂級的全身護理與梳洗服務。✂️',
  Transportation: '安全專車接送：陪同 {name} 乘坐寵物專屬專車，旅程平穩又舒適。🚗',
  OwnerStory: '陪伴日記：寫下飼主最想對 {name} 說的心裡話。這就是我們的故事。💌',
  Milestone: '里程碑時刻：{name} 完成了具有特別意義的重要進步，太棒了！🎉',
  FavoriteMemory: '最珍貴回憶：在彼此心中刻下無法抹滅的溫暖印記。🌻',
  ReminderCompleted: '守護足跡：日常照護提醒已完成！給 {name} 滿滿的關愛與陪伴。✓',
  ReminderMissed: '溫馨叮嚀：有一項關於 {name} 的日常照護提醒不小心錯過了。讓我們重新安排吧。⏰',
  BackupCreated: '安全守護：已成功建立這台手機的單機備份，{name} 的一世回憶安全無虞。💾',
}

class TimelineMessageService {
  /**
   * Evaluates templates dynamically replacing {name} placeholder with the pet's name
   */
  getMessage(category: TimelineEmotionCategory, petName: string): string {
    const template = TEMPLATES[category] || TEMPLATES.NoRecords
    return template.replace(/{name}/g, petName || '毛孩')
  }
}

export const timelineMessageService = new TimelineMessageService()

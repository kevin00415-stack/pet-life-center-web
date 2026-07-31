export const zhTW = {
  // Navigation tabs
  tabTopics: '主題群組',
  tabBroadcasts: '醫院廣播',
  tabEvents: '活動直播',
  tabPrivateChat: '1對1私訊',

  // Community headers & subtitles
  communityCenterTitle: '毛孩家長社群中心',
  communityCenterSub: '與其他飼主交流心得、獲取官方診所廣播公告、預約精彩照護活動。',

  // Topic card localization
  membersCount: '個成員',
  moderatorTag: '專業領袖',
  enterGroup: '進入討論群組',

  // Broadcast card localization
  emergency: '緊急公告',
  normal: '一般公告',
  publishDate: '發布日期',
  officialHospital: '官方認證醫院',
  notifEnabledTag: '推播開啟 (預留)',

  // Event card localization
  seminarLabel: '線上照護講座',
  liveLabel: '獸醫線上直播',
  activityLabel: '線下萌寵聚會',
  lectureLabel: '健康保健課程',
  eventTime: '活動時間',
  aiSummaryTitle: 'AI 智慧大綱',
  reserveEvent: '立即預約活動',

  // Private chat card localization
  privateChatTitle: '1 對 1 家長私密通訊',
  privateChatDesc: '為了 100% 保障您的裝置隱私，通訊系統即將採用去中心化的點對點加密技術。此功能目前正進行實機安全測試。',
  privateChatPre: '點對點加密技術測試中',
  unreadMockDisclaimer: '未讀數字與訊息提示為示意資料。',

  // Empty states / Loaders
  emptyStateTitle: '尚無內容',
  emptyStateDesc: '此分類目前還沒有任何社群消息。',
  loadingData: '載入中...',
  loadFailed: '載入失敗，請稍後再試。',

  // Tips / Sub-intro
  topicsTip: '💡 選擇下方您感興趣的主題，即可與數千位家長共同探討照護經驗。',
  broadcastsTip: '📢 串接全國合格動物醫院的即時推播，為您帶來第一手的診間公告與門診調整資訊。',
  eventsTip: '🎥 專家級獸醫與照護講師線上與線下活動，名額有限，請及早點選預約。',
}

export type TranslationKeys = keyof typeof zhTW

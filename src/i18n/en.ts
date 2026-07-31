import { zhTW } from './zh-TW'

export const en: Record<keyof typeof zhTW, string> = {
  // Navigation tabs
  tabTopics: 'Topics',
  tabBroadcasts: 'Broadcasts',
  tabEvents: 'Events & Live',
  tabPrivateChat: 'Private Chat',

  // Community headers & subtitles
  communityCenterTitle: 'Pet Community Center',
  communityCenterSub: 'Connect with other parents, view official hospital announcements, and RSVP to pet health events.',

  // Topic card localization
  membersCount: 'members',
  moderatorTag: 'Moderator',
  enterGroup: 'Enter Discussion Group',

  // Broadcast card localization
  emergency: 'Emergency',
  normal: 'Notice',
  publishDate: 'Published Date',
  officialHospital: 'Official Certified Hospital',
  notifEnabledTag: 'Notifications Enabled (Snoozed)',

  // Event card localization
  seminarLabel: 'Online Seminar',
  liveLabel: 'Vet Live Stream',
  activityLabel: 'Offline Meetup',
  lectureLabel: 'Health Class',
  eventTime: 'Event Time',
  aiSummaryTitle: 'AI Summary',
  reserveEvent: 'RSVP to Event Now',

  // Private chat card localization
  privateChatTitle: '1-on-1 Encrypted Messaging',
  privateChatDesc: 'To protect your hardware privacy 100%, the communication system will adopt decentralized peer-to-peer encryption. This feature is currently in device security testing.',
  privateChatPre: 'E2E Encryption Testing',
  unreadMockDisclaimer: 'Unread indicators and chat alerts are demo mock details.',

  // Empty states / Loaders
  emptyStateTitle: 'No Content Available',
  emptyStateDesc: 'There are currently no social updates in this category.',
  loadingData: 'Loading...',
  loadFailed: 'Failed to load, please try again.',

  // Tips / Sub-intro
  topicsTip: '💡 Select any topic of interest below to join thousands of parents sharing pet care experiences.',
  broadcastsTip: '📢 Real-time official notifications from certified animal clinics to keep you updated on outpatient notices.',
  eventsTip: '🎥 Professional vet broadcasts and classes with limited capacities. RSVP early to save your spot.',
}

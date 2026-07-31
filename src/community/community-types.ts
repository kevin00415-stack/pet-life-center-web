export type BroadcastPriority = 'emergency' | 'normal'
export type CommunityTab = 'chat' | 'topics' | 'broadcasts' | 'events'

export interface CommunityBadge {
  text: string
  isMock?: boolean
}

export interface CommunityTopic {
  id: string
  icon: string
  title: string
  description: string
  members: string
  moderator?: string
  isMock?: boolean
}

export interface CommunityBroadcast {
  id: string
  hospital: string
  announcement: string
  date: string
  priority: BroadcastPriority
  verified?: boolean
  notificationEnabled?: boolean
  isMock?: boolean
}

export interface CommunityEvent {
  id: string
  type: 'seminar' | 'live' | 'activity' | 'lecture'
  title: string
  date: string
  aiSummary?: string
  isMock?: boolean
}

export interface CommunityService {
  getTopics(): Promise<CommunityTopic[]>
  getBroadcasts(): Promise<CommunityBroadcast[]>
  getEvents(): Promise<CommunityEvent[]>
}

import type { CommunityService, CommunityTopic, CommunityBroadcast, CommunityEvent } from './community-types'
import { mockTopics, mockBroadcasts, mockEvents } from './community-data'

export class MockCommunityService implements CommunityService {
  async getTopics(): Promise<CommunityTopic[]> {
    return mockTopics
  }

  async getBroadcasts(): Promise<CommunityBroadcast[]> {
    return mockBroadcasts
  }

  async getEvents(): Promise<CommunityEvent[]> {
    return mockEvents
  }
}

export const communityService: CommunityService = new MockCommunityService()

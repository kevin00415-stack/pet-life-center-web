import { describe, test, expect } from 'vitest'
import { MockCommunityService } from './community-service'

describe('MockCommunityService', () => {
  const service = new MockCommunityService()

  test('should return topics list with correct properties and isMock: true', async () => {
    const topics = await service.getTopics()
    expect(topics.length).toBeGreaterThan(0)
    expect(topics[0]).toHaveProperty('isMock', true)
    expect(topics[0]).toHaveProperty('title')
    expect(topics[0]).toHaveProperty('members')
  })

  test('should return broadcasts with verified and notification properties', async () => {
    const broadcasts = await service.getBroadcasts()
    expect(broadcasts.length).toBeGreaterThan(0)
    expect(broadcasts.some(b => b.verified === true)).toBe(true)
    expect(broadcasts.every(b => b.isMock === true)).toBe(true)
  })

  test('should return events with correct type and properties', async () => {
    const events = await service.getEvents()
    expect(events.length).toBeGreaterThan(0)
    expect(events.some(e => e.type === 'seminar')).toBe(true)
    expect(events.every(e => e.isMock === true)).toBe(true)
  })
})

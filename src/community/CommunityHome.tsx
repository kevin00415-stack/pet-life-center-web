import { useState, useEffect } from 'react'
import type { CommunityTab, CommunityTopic, CommunityBroadcast, CommunityEvent } from './community-types'
import { communityService } from './community-service'
import { TopicCard } from './components/TopicCard'
import { BroadcastCard } from './components/BroadcastCard'
import { EventCard } from './components/EventCard'
import { PrivateChatView } from './components/PrivateChatView'
import { CommunityTabs } from './components/CommunityTabs'
import { alternateLocale, useTranslation } from '../i18n/translations'
import { mockUnreadChat, mockTopics, mockBroadcasts, mockEvents } from './community-data'
import { GroupDetailView } from './components/GroupDetailView'

interface CommunityHomeProps {
  onBack: () => void
}

export default function CommunityHome({ onBack }: CommunityHomeProps) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.startsWith('#/community/group/')) {
      return hash.replace('#/community/group/', '')
    }
    return null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleHash = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/community/group/')) {
        setActiveGroupId(hash.replace('#/community/group/', ''))
      } else {
        setActiveGroupId(null)
      }
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])
  const { t, locale, changeLocale } = useTranslation()
  const [activeTab, setActiveTab] = useState<CommunityTab>('topics')
  const [topics, setTopics] = useState<CommunityTopic[]>(mockTopics)
  const [broadcasts, setBroadcasts] = useState<CommunityBroadcast[]>(mockBroadcasts)
  const [events, setEvents] = useState<CommunityEvent[]>(mockEvents)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const loadCommunityData = async () => {
      try {
        setLoading(true)
        setError(false)
        const [topicData, broadcastData, eventData] = await Promise.all([
          communityService.getTopics(),
          communityService.getBroadcasts(),
          communityService.getEvents(),
        ])
        if (active) {
          setTopics(topicData)
          setBroadcasts(broadcastData)
          setEvents(eventData)
        }
      } catch {
        if (active) {
          setError(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void loadCommunityData()
    return () => {
      active = false
    }
  }, [])

  const currentTopic = activeGroupId ? topics.find((t) => t.id === activeGroupId) : null

  if (currentTopic) {
    return (
      <section className="community-home-page" style={{ padding: '16px 16px 80px 16px' }}>
        <GroupDetailView
          topic={currentTopic}
          onBack={() => {
            window.location.hash = '#/community'
          }}
        />
      </section>
    )
  }

  return (
    <section className="community-home-page" style={{ paddingBottom: '80px' }}>
      <header className="timeline-header" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>

          {/* Simple language switch button for localized user testing */}
          <button
            onClick={() => changeLocale(alternateLocale(locale))}
            style={{ fontSize: '12px', background: '#eef3f1', color: '#173f3b', border: '1px solid #dcdfdc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '16px', fontWeight: 'bold' }}
            title={t('switchLanguage')}
          >
            {t('switchLanguage')}
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          <span className="eyebrow">COMMUNITY CENTER</span>
          <h1 style={{ margin: '4px 0' }}>{t('communityCenterTitle')}</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#5e746f' }}>{t('communityCenterSub')}</p>
        </div>
      </header>

      {/* Sub-navigation tabs */}
      <CommunityTabs activeTab={activeTab} onTabChange={setActiveTab} unreadCount={mockUnreadChat.count} />

      {/* Main view router */}
      <div style={{ padding: '0 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#5e746f' }}>
            {t('loadingData')}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#e05a47', fontWeight: 'bold' }}>
            {t('loadFailed')}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'topics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '10px 0', fontSize: '13px', color: '#5e746f' }}>
                  {t('topicsTip')}
                </div>
                {topics.map((cat) => (
                  <TopicCard
                    key={cat.id}
                    id={cat.id}
                    icon={cat.icon}
                    title={cat.title}
                    description={cat.description}
                    members={cat.members}
                    moderator={cat.moderator}
                    onEnter={(id) => {
                      window.location.hash = '#/community/group/' + id
                    }}
                  />
                ))}
              </div>
            )}

            {activeTab === 'broadcasts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ padding: '10px 0', fontSize: '13px', color: '#5e746f' }}>
                  {t('broadcastsTip')}
                </div>
                {broadcasts.map((item) => (
                  <BroadcastCard
                    key={item.id}
                    hospital={item.hospital}
                    announcement={item.announcement}
                    date={item.date}
                    priority={item.priority}
                    verified={item.verified}
                    notificationEnabled={item.notificationEnabled}
                  />
                ))}
              </div>
            )}

            {activeTab === 'events' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ padding: '10px 0 0 0', fontSize: '13px', color: '#5e746f', gridColumn: '1/-1' }}>
                  {t('eventsTip')}
                </div>
                {events.map((item) => (
                  <EventCard
                    key={item.id}
                    type={item.type}
                    title={item.title}
                    date={item.date}
                    aiSummary={item.aiSummary}
                  />
                ))}
              </div>
            )}

            {activeTab === 'chat' && (
              <PrivateChatView isMock={true} />
            )}
          </>
        )}
      </div>
    </section>
  )
}

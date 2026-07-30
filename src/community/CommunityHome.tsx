import { useState, useEffect } from 'react'
import type { CommunityTab, CommunityTopic, CommunityBroadcast, CommunityEvent } from './community-types'
import { communityService } from './community-service'
import { TopicCard } from './components/TopicCard'
import { BroadcastCard } from './components/BroadcastCard'
import { EventCard } from './components/EventCard'
import { PrivateChatView } from './components/PrivateChatView'
import { CommunityTabs } from './components/CommunityTabs'
import { useTranslation } from '../i18n/translations'
import { mockUnreadChat } from './community-data'

interface CommunityHomeProps {
  onBack: () => void
}

export default function CommunityHome({ onBack }: CommunityHomeProps) {
  const { t, locale, changeLocale } = useTranslation()
  const [activeTab, setActiveTab] = useState<CommunityTab>('topics')
  const [topics, setTopics] = useState<CommunityTopic[]>([])
  const [broadcasts, setBroadcasts] = useState<CommunityBroadcast[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <section className="community-home-page" style={{ paddingBottom: '80px' }}>
      <header className="timeline-header" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>‹</button>

          {/* Simple language switch button for localized user testing */}
          <button
            onClick={() => changeLocale(locale === 'zh-TW' ? 'en' : 'zh-TW')}
            style={{ fontSize: '12px', background: '#eef3f1', color: '#173f3b', border: '1px solid #dcdfdc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '16px', fontWeight: 'bold' }}
            title="Switch Language"
          >
            {locale === 'zh-TW' ? 'English' : '繁體中文'}
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
                    icon={cat.icon}
                    title={cat.title}
                    description={cat.description}
                    members={cat.members}
                    moderator={cat.moderator}
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

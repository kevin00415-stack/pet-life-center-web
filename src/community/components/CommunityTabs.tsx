import { Chat, Users, Megaphone, VideoCamera } from '@phosphor-icons/react'
import type { CommunityTab } from '../community-types'
import { useTranslation } from '../../i18n/translations'

interface CommunityTabsProps {
  activeTab: CommunityTab
  onTabChange: (tab: CommunityTab) => void
  unreadCount?: number
  isUnreadMock?: boolean
}

export function CommunityTabs({
  activeTab,
  onTabChange,
  unreadCount = 3,
}: CommunityTabsProps) {
  const { t } = useTranslation()

  return (
    <nav className="filters" style={{ display: 'flex', gap: '6px', margin: '0 16px 20px 16px', overflowX: 'auto', paddingBottom: '4px' }} aria-label={t('communityTabsAria')}>
      <button className={activeTab === 'topics' ? 'active' : ''} onClick={() => onTabChange('topics')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
        <Users size={16} /> {t('tabTopics')}
      </button>
      <button className={activeTab === 'broadcasts' ? 'active' : ''} onClick={() => onTabChange('broadcasts')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
        <Megaphone size={16} /> {t('tabBroadcasts')}
      </button>
      <button className={activeTab === 'events' ? 'active' : ''} onClick={() => onTabChange('events')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
        <VideoCamera size={16} /> {t('tabEvents')}
      </button>
      <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => onTabChange('chat')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', position: 'relative' }}>
        <Chat size={16} /> {t('tabPrivateChat')}
        {unreadCount > 0 && (
          <span className="unread-badge-placeholder" style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#e05a47', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.95)' }}>
            {unreadCount}
          </span>
        )}
      </button>
    </nav>
  )
}

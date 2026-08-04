import { Notification, SealCheck } from '@phosphor-icons/react'
import { useTranslation } from '../../i18n/translations'
import type { BroadcastPriority } from '../community-types'

interface BroadcastCardProps {
  hospital: string
  announcement: string
  date: string
  priority: BroadcastPriority
  verified?: boolean
  notificationEnabled?: boolean
  isMock?: boolean
}

export function BroadcastCard({
  hospital,
  announcement,
  date,
  priority,
  verified,
  notificationEnabled,
}: BroadcastCardProps) {
  const { t } = useTranslation()
  const priorityColor = priority === 'emergency' ? '#e05a47' : '#5e746f'
  const priorityBg = priority === 'emergency' ? '#fdf2f0' : '#eef3f1'
  const priorityText = priority === 'emergency' ? t('emergency') : t('normal')

  return (
    <div className="cozy-editor-card community-broadcast-card" style={{ borderLeft: `4px solid ${priorityColor}`, padding: '16px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#173f3b', fontWeight: 'bold' }}>{hospital}</h4>
          {verified && (
            <span className="hospital-verified-placeholder" style={{ color: '#4b9cd3', display: 'inline-flex', alignItems: 'center' }} title={t('officialHospital')} aria-label={t('communityVerifiedPlaceholder')}>
              <SealCheck size={15} weight="fill" />
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {notificationEnabled && (
            <span className="notif-badge-placeholder" style={{ color: '#d3a665', display: 'inline-flex', alignItems: 'center' }} title={t('notifEnabledTag')}>
              <Notification size={15} weight="fill" />
            </span>
          )}
          <span style={{ fontSize: '10px', background: priorityBg, color: priorityColor, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
            {priorityText}
          </span>
        </div>
      </div>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#263b37', lineHeight: '1.5' }}>{announcement}</p>
      <div style={{ fontSize: '11px', color: '#888', textAlign: 'right' }}>{t('publishDate')}：{date}</div>
    </div>
  )
}

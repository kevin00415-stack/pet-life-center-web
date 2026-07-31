import { ArrowRight, ShieldCheck } from '@phosphor-icons/react'
import { useTranslation } from '../../i18n/translations'

interface TopicCardProps {
  icon: string
  title: string
  description: string
  members: string
  moderator?: string
  isMock?: boolean
}

export function TopicCard({
  icon,
  title,
  description,
  members,
  moderator,
}: TopicCardProps) {
  const { t } = useTranslation()

  return (
    <div className="cozy-editor-card community-topic-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '16px', color: '#173f3b', fontWeight: 'bold' }}>{title}</h4>
          <span style={{ fontSize: '11px', color: '#888' }}>{members} {t('membersCount')}</span>
        </div>
        {moderator && (
          <span className="moderator-badge-placeholder" style={{ fontSize: '10px', background: '#eef3f1', color: '#426f69', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ShieldCheck size={12} weight="fill" /> {moderator} {t('moderatorTag')}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: '#5e746f', lineHeight: '1.45' }}>{description}</p>
      <button className="cozy-btn-small" style={{ width: '100%', border: '0', background: '#eef5f3', color: '#173f3b', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginTop: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
        {t('enterGroup')} <ArrowRight size={13} weight="bold" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
      </button>
    </div>
  )
}
